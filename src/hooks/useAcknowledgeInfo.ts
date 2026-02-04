import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TeamMemberAck } from '@/types/scheduling';
import { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';

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
  
  // REGRA 4.1: Track if we've locally acknowledged to prevent prop override
  const hasLocalAckRef = useRef(false);
  // REGRA 4.2: Track save failure state
  const [saveFailed, setSaveFailed] = useState(false);
  // Track schedule ID to reset state when switching
  const prevScheduleIdRef = useRef(scheduleId);

  // Reset state when schedule changes
  useEffect(() => {
    if (prevScheduleIdRef.current !== scheduleId) {
      hasLocalAckRef.current = false;
      setSaveFailed(false);
      prevScheduleIdRef.current = scheduleId;
      setLocalAcks(currentAcks);
    }
  }, [scheduleId, currentAcks]);

  // Update local acks when prop changes, BUT preserve local acknowledgment
  // REGRA 2.1: Prevents the realtime subscription from overwriting local changes
  useEffect(() => {
    if (prevScheduleIdRef.current !== scheduleId) return;
    
    // If we've locally acknowledged, check if the new prop includes it
    if (hasLocalAckRef.current && teamMemberId) {
      const propHasAck = currentAcks.some(ack => ack.team_member_id === teamMemberId);
      if (propHasAck) {
        setLocalAcks(currentAcks);
      }
      // If prop doesn't have our ack yet, DON'T overwrite - our local state is more recent
      return;
    }
    
    // No local ack, safe to sync from prop
    setLocalAcks(currentAcks);
  }, [currentAcks, teamMemberId, scheduleId]);

  // REGRA 5.1: Check if current team member has acknowledged
  // Returns true immediately after local marking (before save completes)
  const hasAcknowledged = teamMemberId 
    ? (hasLocalAckRef.current || localAcks.some(ack => ack.team_member_id === teamMemberId))
    : false;

  // REGRA 6.1: Acknowledge important info - PRIORITY: update local state FIRST, save async
  const acknowledgeInfo = useCallback(async () => {
    if (!teamMemberId || hasAcknowledged) return false;

    // REGRA 4.1: Mark locally IMMEDIATELY (before async save)
    hasLocalAckRef.current = true;
    setSaveFailed(false);
    
    const newAck: TeamMemberAck = {
      team_member_id: teamMemberId,
      acknowledged_at: new Date().toISOString(),
    };
    
    // REGRA 5.2: Update local state IMMEDIATELY so button unlocks right away
    const updatedAcks = [...localAcks, newAck];
    setLocalAcks(updatedAcks);

    // REGRA 6.1: Save asynchronously without blocking UI
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('schedules')
        .update({ 
          ack_by_team_members: updatedAcks as unknown as Json 
        })
        .eq('id', scheduleId);

      if (error) throw error;
      
      console.log('[useAcknowledgeInfo] Acknowledgment saved successfully');
      return true;
    } catch (err) {
      console.error('Error acknowledging info:', err);
      // REGRA 4.2: On failure, show warning but keep checkbox visually marked
      setSaveFailed(true);
      toast.error('Não foi possível salvar a confirmação. Tente novamente.');
      // Keep hasLocalAckRef.current = true so button stays unlocked
      // User can retry by clicking the checkbox again if needed
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
    saveFailed,
  };
}
