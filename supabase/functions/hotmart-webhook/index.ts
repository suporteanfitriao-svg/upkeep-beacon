/**
 * Hotmart Webhook Handler
 * Processa eventos de pagamento da Hotmart para ativar/gerenciar subscriptions
 * 
 * REGRA: Compra confirmada via webhook → criar/atualizar usuário como Proprietário
 *        associar plano comprado → liberar acesso exclusivamente para onboarding
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hotmart-hottok',
}

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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify Hotmart webhook token (optional but recommended)
    const hottok = req.headers.get('x-hotmart-hottok');
    const expectedToken = Deno.env.get('HOTMART_WEBHOOK_TOKEN');
    
    if (expectedToken && hottok !== expectedToken) {
      console.error('[Hotmart Webhook] Invalid hottok');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: HotmartPayload = await req.json();
    console.log('[Hotmart Webhook] Received event:', payload.event);
    console.log('[Hotmart Webhook] Buyer:', payload.data.buyer.email);

    // Initialize Supabase admin client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { event, data } = payload;
    const buyerEmail = data.buyer.email.toLowerCase().trim();
    const buyerName = data.buyer.name;
    const transactionId = data.purchase.transaction;
    const productId = data.product.id;
    const subscriptionId = data.subscription?.subscriber_code;

    // Determine which plan was purchased
    const planSlug = PRODUCT_TO_PLAN[productId] || 'basico';
    
    // Get plan from database
    const { data: planData, error: planError } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('slug', planSlug)
      .single();

    if (planError || !planData) {
      console.error('[Hotmart Webhook] Plan not found:', planSlug);
      return new Response(
        JSON.stringify({ error: 'Plan not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (event) {
      case 'PURCHASE_APPROVED':
      case 'PURCHASE_COMPLETE': {
        // Check if user exists
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        let userId: string | null = null;
        
        const existingUser = existingUsers?.users?.find(u => u.email === buyerEmail);
        
        if (existingUser) {
          userId = existingUser.id;
          console.log('[Hotmart Webhook] Found existing user:', userId);
        } else {
          // Create new user with temporary password
          const tempPassword = crypto.randomUUID().slice(0, 12) + 'Aa1!';
          
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: buyerEmail,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              name: buyerName,
              source: 'hotmart',
            },
          });

          if (createError) {
            console.error('[Hotmart Webhook] Error creating user:', createError);
            return new Response(
              JSON.stringify({ error: 'Failed to create user' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          userId = newUser.user.id;
          console.log('[Hotmart Webhook] Created new user:', userId);

          // Create profile
          await supabase.from('profiles').insert({
            id: userId,
            email: buyerEmail,
            name: buyerName,
            onboarding_completed: false,
            must_reset_password: true,
          });

          // Assign admin role (Proprietário)
          await supabase.from('user_roles').insert({
            user_id: userId,
            role: 'admin',
          });

          // TODO: Send welcome email with password reset link
          console.log('[Hotmart Webhook] User needs password reset');
        }

        // Check for existing subscription
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('hotmart_transaction_id', transactionId)
          .maybeSingle();

        if (existingSub) {
          // Update existing subscription
          await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              started_at: new Date().toISOString(),
            })
            .eq('id', existingSub.id);
          
          console.log('[Hotmart Webhook] Updated subscription:', existingSub.id);
        } else {
          // Create new subscription
          const { data: newSub, error: subError } = await supabase
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
            console.error('[Hotmart Webhook] Error creating subscription:', subError);
          } else {
            console.log('[Hotmart Webhook] Created subscription:', newSub.id);
          }
        }

        break;
      }

      case 'PURCHASE_CANCELED':
      case 'PURCHASE_REFUNDED':
      case 'PURCHASE_CHARGEBACK':
      case 'SUBSCRIPTION_CANCELLATION': {
        // Cancel subscription
        const { error: cancelError } = await supabase
          .from('subscriptions')
          .update({
            status: event === 'SUBSCRIPTION_CANCELLATION' ? 'cancelled' : 'suspended',
            cancelled_at: new Date().toISOString(),
          })
          .eq('hotmart_transaction_id', transactionId);

        if (cancelError) {
          console.error('[Hotmart Webhook] Error cancelling subscription:', cancelError);
        } else {
          console.log('[Hotmart Webhook] Subscription cancelled for transaction:', transactionId);
        }

        break;
      }

      case 'PURCHASE_EXPIRED': {
        await supabase
          .from('subscriptions')
          .update({ status: 'expired' })
          .eq('hotmart_transaction_id', transactionId);
        
        console.log('[Hotmart Webhook] Subscription expired for transaction:', transactionId);
        break;
      }

      default:
        console.log('[Hotmart Webhook] Unhandled event:', event);
    }

    return new Response(
      JSON.stringify({ success: true, event }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Hotmart Webhook] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
