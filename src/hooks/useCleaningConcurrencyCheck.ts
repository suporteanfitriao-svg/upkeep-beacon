import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ConcurrencyCheckResult {
  canStart: boolean;
  reason?: string;
  currentResponsible?: string;
}

/**
 * Hook to check for cleaning concurrency before starting.
 * Prevents race conditions when multiple cleaners try to start the same cleaning.
 */
export function useCleaningConcurrencyCheck() {
  const checkConcurrency = useCallback(async (
    scheduleId: string,
    currentTeamMemberId: string
  ): Promise<ConcurrencyCheckResult> => {
    try {
      // Fetch current schedule state with FOR UPDATE lock simulation
      const { data: schedule, error } = await supabase
        .from('schedules')
        .select('status, responsible_team_member_id, cleaner_name')
        .eq('id', scheduleId)
        .single();

      if (error) {
        return { canStart: false, reason: 'Erro ao verificar status' };
      }

      if (!schedule) {
        return { canStart: false, reason: 'Tarefa não encontrada' };
      }

      // Check if status is still 'released'
      if (schedule.status !== 'released') {
        if (schedule.status === 'cleaning') {
          return { 
            canStart: false, 
            reason: 'Esta limpeza já foi iniciada por outro responsável',
            currentResponsible: schedule.cleaner_name || undefined
          };
        }
        return { 
          canStart: false, 
          reason: `Status atual: ${schedule.status}. Não é possível iniciar.` 
        };
      }

      // Check if there's already a responsible assigned
      if (schedule.responsible_team_member_id && 
          schedule.responsible_team_member_id !== currentTeamMemberId) {
        return { 
          canStart: false, 
          reason: 'Esta limpeza já foi atribuída a outro responsável',
          currentResponsible: schedule.cleaner_name || undefined
        };
      }

      return { canStart: true };
    } catch (error) {
      console.error('Concurrency check error:', error);
      return { canStart: false, reason: 'Erro ao verificar disponibilidade' };
    }
  }, []);

  // Atomic start cleaning operation with concurrency protection
  const startCleaningAtomic = useCallback(async (
    scheduleId: string,
    teamMemberId: string,
    cleanerName: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Use a conditional update that only succeeds if status is still 'released'
      const { data, error } = await supabase
        .from('schedules')
        .update({
          status: 'cleaning',
          responsible_team_member_id: teamMemberId,
          cleaner_name: cleanerName,
          start_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', scheduleId)
        .eq('status', 'released') // Only update if still released
        .select('id')
        .single();

      if (error) {
        // Check if it's a "no rows" error (someone else started it)
        if (error.code === 'PGRST116') {
          return { 
            success: false, 
            error: 'Esta limpeza já foi iniciada por outro responsável' 
          };
        }
        return { success: false, error: error.message };
      }

      if (!data) {
        return { 
          success: false, 
          error: 'Não foi possível iniciar. A tarefa pode já ter sido iniciada.' 
        };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Atomic start cleaning error:', error);
      return { success: false, error: 'Erro ao iniciar limpeza' };
    }
  }, []);

  return { checkConcurrency, startCleaningAtomic };
}
