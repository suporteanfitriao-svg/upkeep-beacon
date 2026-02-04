import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseConcurrentEditWarningProps {
  scheduleId: string;
  isEditing: boolean; // True when user is actively editing the card
  currentUserId: string | null;
}

interface ConcurrentEditState {
  hasExternalUpdate: boolean;
  lastExternalUpdateAt: Date | null;
  updatedBy: string | null;
}

/**
 * REGRA 3.1-3.2: Detects when another user modifies the same card
 * Shows a warning instead of reloading, with optional "Update" button
 */
export function useConcurrentEditWarning({
  scheduleId,
  isEditing,
  currentUserId,
}: UseConcurrentEditWarningProps) {
  const [state, setState] = useState<ConcurrentEditState>({
    hasExternalUpdate: false,
    lastExternalUpdateAt: null,
    updatedBy: null,
  });
  
  // Track the last known version to detect changes
  const lastKnownVersionRef = useRef<number | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Clear warning (user clicked "Atualizar")
  const clearWarning = useCallback(() => {
    setState({
      hasExternalUpdate: false,
      lastExternalUpdateAt: null,
      updatedBy: null,
    });
  }, []);

  // REGRA 3.1: Subscribe to changes only when user is editing
  useEffect(() => {
    if (!isEditing || !scheduleId) {
      // Clean up subscription when not editing
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    // Fetch current version
    const fetchCurrentVersion = async () => {
      const { data } = await supabase
        .from('schedules')
        .select('lock_version, responsible_team_member_id')
        .eq('id', scheduleId)
        .single();
      
      if (data) {
        lastKnownVersionRef.current = data.lock_version;
      }
    };
    fetchCurrentVersion();

    // Subscribe to changes on this specific schedule
    const channel = supabase
      .channel(`schedule-edit-${scheduleId}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'schedules',
          filter: `id=eq.${scheduleId}`
        },
        async (payload) => {
          const newData = payload.new as { 
            lock_version: number; 
            responsible_team_member_id: string | null;
            cleaner_name: string | null;
          };
          
          // REGRA 3.1: Only trigger if version changed (someone else saved)
          if (lastKnownVersionRef.current !== null && 
              newData.lock_version !== lastKnownVersionRef.current) {
            
            // Check if the update was made by another user
            const isExternalUpdate = newData.responsible_team_member_id !== currentUserId;
            
            if (isExternalUpdate) {
              console.log('[ConcurrentEdit] External update detected!');
              setState({
                hasExternalUpdate: true,
                lastExternalUpdateAt: new Date(),
                updatedBy: newData.cleaner_name || 'Outro usuário',
              });
            }
            
            // Update our known version
            lastKnownVersionRef.current = newData.lock_version;
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [scheduleId, isEditing, currentUserId]);

  return {
    ...state,
    clearWarning,
  };
}
