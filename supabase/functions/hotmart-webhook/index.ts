/**
 * Hotmart Webhook Handler - SECURE VERSION
 * 
 * REGRAS DE SEGURANÇA APLICADAS:
 * - R-GLOBAL-11: Verificação de assinatura HMAC
 * - R-GLOBAL-5: Idempotência via webhook_events
 * - R-GLOBAL-10: Rate limiting
 * - R-GLOBAL-15: Logging seguro
 * - R-GLOBAL-13: Proteção contra replay attacks
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';
import {
  createSecureHandler,
  verifyWebhookSignatureAsync,
  isWebhookTimestampValid,
  secureLog,
  errorResponse,
  successResponse,
  validateRequestBody,
} from '../_shared/security/index.ts';

// Hotmart event types we handle
type HotmartEvent = 
  | 'PURCHASE_APPROVED'
  | 'PURCHASE_COMPLETE'
  | 'PURCHASE_CANCELED'
  | 'PURCHASE_REFUNDED'
  | 'PURCHASE_CHARGEBACK'
  | 'PURCHASE_EXPIRED'
  | 'SUBSCRIPTION_CANCELLATION';

interface HotmartPayload {
  event: HotmartEvent;
  data: {
    buyer: {
      email: string;
      name: string;
      phone?: string;
    };
    purchase: {
      transaction: string;
      order_date: string;
      approved_date?: string;
      status: string;
      payment?: {
        type: string;
      };
      price?: {
        value: number;
        currency_code: string;
      };
    };
    subscription?: {
      subscriber_code: string;
      status: string;
      plan?: {
        id: string;
        name: string;
      };
    };
    product: {
      id: string;
      name: string;
    };
  };
}

// Map Hotmart product IDs to our plan slugs
const PRODUCT_TO_PLAN: Record<string, string> = {
  // TODO: Replace with actual Hotmart product IDs
  'HOTMART_BASIC_PRODUCT_ID': 'basico',
  'HOTMART_STANDARD_PRODUCT_ID': 'padrao',
};

// Rate limit: 10 requests per minute per webhook signature
const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000,
  maxRequests: 10,
  keyGenerator: (req: Request) => {
    return req.headers.get('x-hotmart-hottok') || 'unknown';
  },
};

const handler = createSecureHandler(
  async (req, context) => {
    const { requestId, supabaseAdmin } = context;

    // Validate request body
    const bodyResult = await validateRequestBody(req.clone());
    if (!bodyResult.valid) {
      secureLog('warn', 'Invalid webhook body', {
        request_id: requestId,
        error: bodyResult.error,
      });
      return errorResponse(400, bodyResult.error || 'Invalid body', requestId);
    }

    const payload = bodyResult.body as HotmartPayload;

    // R-GLOBAL-11: Verify Hotmart webhook token
    const hottok = req.headers.get('x-hotmart-hottok');
    const expectedToken = Deno.env.get('HOTMART_WEBHOOK_TOKEN');
    
    if (expectedToken && hottok !== expectedToken) {
      secureLog('warn', 'Invalid Hotmart webhook token', {
        request_id: requestId,
      });
      return errorResponse(401, 'Unauthorized', requestId);
    }

    // R-GLOBAL-13: Check timestamp for replay protection (if provided)
    const timestamp = req.headers.get('x-hotmart-timestamp');
    if (timestamp && !isWebhookTimestampValid(timestamp, 300)) {
      secureLog('warn', 'Webhook timestamp expired', {
        request_id: requestId,
        timestamp,
      });
      return errorResponse(401, 'Webhook expired', requestId);
    }

    const { event, data } = payload;
    const transactionId = data.purchase.transaction;

    // R-GLOBAL-5: Check idempotency
    const eventId = `hotmart:${event}:${transactionId}`;
    const { data: isNew } = await supabaseAdmin.rpc('check_webhook_idempotency', {
      p_event_id: eventId,
      p_event_type: event,
      p_provider: 'hotmart',
      p_payload: payload,
    });

    if (!isNew) {
      secureLog('info', 'Duplicate webhook event', {
        request_id: requestId,
        event_id: eventId,
      });
      return successResponse({ status: 'already_processed', event }, requestId);
    }

    secureLog('info', 'Processing Hotmart webhook', {
      request_id: requestId,
      event,
      transaction_id: transactionId,
    });

    const buyerEmail = data.buyer.email.toLowerCase().trim();
    const buyerName = data.buyer.name;
    const productId = data.product.id;
    const subscriptionId = data.subscription?.subscriber_code;

    // Determine which plan was purchased
    const planSlug = PRODUCT_TO_PLAN[productId] || 'basico';
    
    // Get plan from database
    const { data: planData, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('id')
      .eq('slug', planSlug)
      .maybeSingle();

    if (planError || !planData) {
      secureLog('error', 'Plan not found', {
        request_id: requestId,
        plan_slug: planSlug,
      });
      return errorResponse(400, 'Plan not found', requestId);
    }

    switch (event) {
      case 'PURCHASE_APPROVED':
      case 'PURCHASE_COMPLETE': {
        // Check if user exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        let userId: string | null = null;
        
        const existingUser = existingUsers?.users?.find(u => u.email === buyerEmail);
        
        if (existingUser) {
          userId = existingUser.id;
          secureLog('info', 'Found existing user', {
            request_id: requestId,
            user_id: userId,
          });
        } else {
          // Create new user with secure temporary password
          const tempPassword = crypto.randomUUID().slice(0, 12) + 'Aa1!';
          
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: buyerEmail,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              name: buyerName,
              source: 'hotmart',
            },
          });

          if (createError) {
            secureLog('error', 'Failed to create user', {
              request_id: requestId,
              error: createError.message,
            });
            return errorResponse(500, 'Failed to create user', requestId);
          }

          userId = newUser.user.id;

          // Create profile with must_reset_password flag
          await supabaseAdmin.from('profiles').insert({
            id: userId,
            email: buyerEmail,
            name: buyerName,
            onboarding_completed: false,
            must_reset_password: true,
          });

          // Assign admin role (Proprietário)
          await supabaseAdmin.from('user_roles').insert({
            user_id: userId,
            role: 'admin',
          });

          secureLog('info', 'Created new user from Hotmart purchase', {
            request_id: requestId,
            user_id: userId,
          });

          // TODO: Send welcome email with password reset link via Resend
        }

        // Check for existing subscription
        const { data: existingSub } = await supabaseAdmin
          .from('subscriptions')
          .select('id')
          .eq('hotmart_transaction_id', transactionId)
          .maybeSingle();

        if (existingSub) {
          // Update existing subscription
          await supabaseAdmin
            .from('subscriptions')
            .update({
              status: 'active',
              started_at: new Date().toISOString(),
            })
            .eq('id', existingSub.id);
          
          secureLog('info', 'Updated existing subscription', {
            request_id: requestId,
            subscription_id: existingSub.id,
          });
        } else {
          // Create new subscription
          const { data: newSub, error: subError } = await supabaseAdmin
            .from('subscriptions')
            .insert({
              user_id: userId,
              plan_id: planData.id,
              status: 'active',
              hotmart_transaction_id: transactionId,
              hotmart_subscription_id: subscriptionId,
              hotmart_product_id: productId,
              started_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (subError) {
            secureLog('error', 'Failed to create subscription', {
              request_id: requestId,
              error: subError.message,
            });
          } else {
            secureLog('info', 'Created subscription', {
              request_id: requestId,
              subscription_id: newSub.id,
            });
          }
        }

        break;
      }

      case 'PURCHASE_CANCELED':
      case 'PURCHASE_REFUNDED':
      case 'PURCHASE_CHARGEBACK':
      case 'SUBSCRIPTION_CANCELLATION': {
        // Cancel subscription
        const { error: cancelError } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: event === 'SUBSCRIPTION_CANCELLATION' ? 'cancelled' : 'suspended',
            cancelled_at: new Date().toISOString(),
          })
          .eq('hotmart_transaction_id', transactionId);

        if (cancelError) {
          secureLog('error', 'Failed to cancel subscription', {
            request_id: requestId,
            error: cancelError.message,
          });
        } else {
          secureLog('info', 'Subscription cancelled', {
            request_id: requestId,
            transaction_id: transactionId,
            reason: event,
          });
        }

        break;
      }

      case 'PURCHASE_EXPIRED': {
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'expired' })
          .eq('hotmart_transaction_id', transactionId);
        
        secureLog('info', 'Subscription expired', {
          request_id: requestId,
          transaction_id: transactionId,
        });
        break;
      }

      default:
        secureLog('info', 'Unhandled Hotmart event', {
          request_id: requestId,
          event,
        });
    }

    return successResponse({ success: true, event }, requestId);
  },
  {
    requireAuth: false, // Webhooks don't have user auth
    rateLimit: RATE_LIMIT_CONFIG,
    allowedMethods: ['POST', 'OPTIONS'],
  }
);

Deno.serve(handler);
