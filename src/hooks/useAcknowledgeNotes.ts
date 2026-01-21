import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScheduleHistoryEvent } from '@/types/scheduling';
import { Json } from '@/integrations/supabase/types';

interface UseAcknowledgeNotesProps {
  scheduleId: string;
  history: ScheduleHistoryEvent[];
  teamMemberId: string | null;
  notes: string | undefined; // Current admin notes content
  scheduleStatus: string;
}

interface NotesAckHistoryEntry {
  timestamp: string;
  team_member_id: string;
  team_member_name: string | null;
  role: string | null;
  action: 'notes_acknowledged';
  from_status: string | null;
  to_status: string | null;
  payload: {
    notes_hash: string; // Hash of notes content to track which version was read
  };
}

// Simple hash function to create a fingerprint of the notes content
const hashNotes = (notes: string): string => {
  let hash = 0;
  for (let i = 0; i < notes.length; i++) {
    const char = notes.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
};

export function useAcknowledgeNotes({ 
  scheduleId, 
  history,
  teamMemberId,
  notes,
  scheduleStatus,
}: UseAcknowledgeNotesProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localHistory, setLocalHistory] = useState<ScheduleHistoryEvent[]>(history);

  // Update local history when prop changes
  useEffect(() => {
    setLocalHistory(history);
  }, [history]);

  // Check if current team member has already acknowledged the notes
  const hasAcknowledged = useMemo(() => {
    if (!teamMemberId || !notes) return false;
    
    // Find any notes_acknowledged action by this team member
    return localHistory.some(event => 
      event.action === 'notes_acknowledged' && 
      event.team_member_id === teamMemberId
    );
  }, [teamMemberId, notes, localHistory]);

  // Acknowledge admin notes - saves to history and cannot be undone
  const acknowledgeNotes = useCallback(async (teamMemberName?: string) => {
    if (!teamMemberId || !notes || hasAcknowledged) return false;

    setIsSubmitting(true);
    try {
      const newHistoryEntry: NotesAckHistoryEntry = {
        timestamp: new Date().toISOString(),
        team_member_id: teamMemberId,
        team_member_name: teamMemberName || null,
        role: 'cleaner',
        action: 'notes_acknowledged',
        from_status: scheduleStatus,
        to_status: scheduleStatus,
        payload: {
          notes_hash: hashNotes(notes),
        },
      };

      const updatedHistory = [...localHistory, newHistoryEntry as unknown as ScheduleHistoryEvent];

      const { error } = await supabase
        .from('schedules')
        .update({ 
          history: updatedHistory as unknown as Json 
        })
        .eq('id', scheduleId);

      if (error) throw error;

      setLocalHistory(updatedHistory);
      return true;
    } catch (err) {
      console.error('Error acknowledging notes:', err);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [scheduleId, teamMemberId, notes, localHistory, hasAcknowledged, scheduleStatus]);

  return {
    hasAcknowledged,
    isSubmitting,
    acknowledgeNotes,
  };
}
