import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type PasswordAction = 'viewed' | 'created' | 'updated' | 'visualizou_senha_ical' | 'visualizou_senha';

interface LogPasswordActionParams {
  scheduleId?: string;
  propertyId?: string;
  teamMemberId: string;
  action: PasswordAction;
}

export function usePasswordAudit() {
  const logAction = useCallback(async ({
    scheduleId,
    propertyId,
    teamMemberId,
    action,
  }: LogPasswordActionParams) => {
    try {
      // Use the security definer function to log the action
      const { error } = await supabase.rpc('log_password_action', {
        p_schedule_id: scheduleId || null,
        p_property_id: propertyId || null,
        p_team_member_id: teamMemberId,
        p_action: action,
      });

      if (error) {
        console.error('Error logging password action:', error);
      }
    } catch (err) {
      console.error('Failed to log password action:', err);
    }
  }, []);

  return { logAction };
}
