import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TeamMemberAck } from '@/types/scheduling';
import { Json } from '@/integrations/supabase/types';

interface UseAcknowledgeInfoProps {
  scheduleId: string;
  currentAcks: TeamMemberAck[];
  teamMemberId: string | null;
}

export function useAcknowledgeInfo({ 
  scheduleId, 
  currentAcks, 
  teamMemberId 
}: UseAcknowledgeInfoProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localAcks, setLocalAcks] = useState<TeamMemberAck[]>(currentAcks);

  // Check if current team member has acknowledged
  const hasAcknowledged = teamMemberId 
    ? localAcks.some(ack => ack.team_member_id === teamMemberId)
    : false;

  // Acknowledge important info
  const acknowledgeInfo = useCallback(async () => {
    if (!teamMemberId || hasAcknowledged) return false;

    setIsSubmitting(true);
    try {
      const newAck: TeamMemberAck = {
        team_member_id: teamMemberId,
        acknowledged_at: new Date().toISOString(),
      };

      const updatedAcks = [...localAcks, newAck];

      const { error } = await supabase
        .from('schedules')
        .update({ 
          ack_by_team_members: updatedAcks as unknown as Json 
        })
        .eq('id', scheduleId);

      if (error) throw error;

      setLocalAcks(updatedAcks);
      return true;
    } catch (err) {
      console.error('Error acknowledging info:', err);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [scheduleId, teamMemberId, localAcks, hasAcknowledged]);

  // Toggle acknowledgment (for UI purposes)
  const toggleAcknowledge = useCallback(async (checked: boolean) => {
    if (!teamMemberId) return false;

    if (checked && !hasAcknowledged) {
      return await acknowledgeInfo();
    }
    
    // Note: We don't allow removing acknowledgment once set
    // This is intentional for audit purposes
    return false;
  }, [teamMemberId, hasAcknowledged, acknowledgeInfo]);

  return {
    hasAcknowledged,
    isSubmitting,
    acknowledgeInfo,
    toggleAcknowledge,
    localAcks,
  };
}
