/**
 * Example: Secure Edge Function Template
 * 
 * Use this as a base for all new edge functions.
 * Demonstrates proper security patterns.
 */

import {
  createSecureHandler,
  checkResourceAccess,
  validateStateTransition,
  filterSensitiveData,
  logAuthorizationAttempt,
  validateRequestBody,
  secureLog,
  errorResponse,
  successResponse,
  type SecurityContext,
} from './index.ts';

/**
 * Example: Protected resource endpoint
 * 
 * This demonstrates:
 * - Authentication requirement
 * - Rate limiting
 * - Resource authorization
 * - State transition validation
 * - Audit logging
 */
const handler = createSecureHandler(
  async (req: Request, context: SecurityContext) => {
    const { requestId, userId, role, teamMemberId, supabaseClient, supabaseAdmin } = context;

    // Parse request
    const url = new URL(req.url);
    const method = req.method;

    // Example: GET /schedules/:id
    if (method === 'GET') {
      const scheduleId = url.searchParams.get('id');
      
      if (!scheduleId) {
        return errorResponse(400, 'Schedule ID required', requestId);
      }

      // Check authorization
      const access = await checkResourceAccess(
        supabaseAdmin,
        context,
        'schedule',
        scheduleId,
        'read'
      );

      // Log authorization attempt
      await logAuthorizationAttempt(
        supabaseAdmin,
        context,
        'schedule',
        scheduleId,
        'read',
        access.allowed
      );

      if (!access.allowed) {
        return errorResponse(403, access.error || 'Forbidden', requestId);
      }

      // Filter sensitive data based on role
      const filteredData = filterSensitiveData(access.resource, role, 'schedule');

      return successResponse({ data: filteredData }, requestId);
    }

    // Example: PATCH /schedules/:id (status update)
    if (method === 'PATCH') {
      const bodyResult = await validateRequestBody(req);
      if (!bodyResult.valid) {
        return errorResponse(400, bodyResult.error || 'Invalid body', requestId);
      }

      const body = bodyResult.body as { id: string; status: string };
      const { id: scheduleId, status: newStatus } = body;

      if (!scheduleId || !newStatus) {
        return errorResponse(400, 'Schedule ID and status required', requestId);
      }

      // Check authorization
      const access = await checkResourceAccess(
        supabaseAdmin,
        context,
        'schedule',
        scheduleId,
        'update'
      );

      if (!access.allowed) {
        await logAuthorizationAttempt(
          supabaseAdmin,
          context,
          'schedule',
          scheduleId,
          'update',
          false
        );
        return errorResponse(403, access.error || 'Forbidden', requestId);
      }

      // Validate state transition
      const currentStatus = access.resource.status;
      const transition = validateStateTransition('schedule', currentStatus, newStatus, role);

      if (!transition.valid) {
        return errorResponse(409, transition.error || 'Invalid transition', requestId);
      }

      // Perform update with optimistic locking
      const lockVersion = access.resource.lock_version || 1;

      const { data: updateResult } = await supabaseAdmin.rpc('update_schedule_with_lock', {
        p_schedule_id: scheduleId,
        p_updates: JSON.stringify({ status: newStatus }),
        p_current_version: lockVersion,
      });

      if (!updateResult?.success) {
        return errorResponse(409, updateResult?.error || 'Conflict', requestId);
      }

      // Log successful update
      await logAuthorizationAttempt(
        supabaseAdmin,
        context,
        'schedule',
        scheduleId,
        'update',
        true
      );

      secureLog('info', 'Schedule status updated', {
        request_id: requestId,
        schedule_id: scheduleId,
        from_status: currentStatus,
        to_status: newStatus,
        user_id: userId,
      });

      return successResponse({ success: true, data: updateResult.data }, requestId);
    }

    return errorResponse(405, 'Method not allowed', requestId);
  },
  {
    requireAuth: true,
    rateLimit: {
      windowMs: 60 * 1000,
      maxRequests: 100,
    },
    allowedMethods: ['GET', 'PATCH', 'OPTIONS'],
  }
);

// Export for documentation purposes
export { handler };

// Uncomment to serve:
// Deno.serve(handler);
