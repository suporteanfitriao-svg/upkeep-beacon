import { useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChecklistItem } from '@/types/scheduling';
import { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';

interface UseDebouncedCategorySaveOptions {
  scheduleId: string;
  teamMemberId: string | null;
  checklist: ChecklistItem[];
  debounceMs?: number;
  enabled?: boolean;
  /**
   * Back-compat: previous implementation notified per-category.
   * New behavior is one debounced save for the whole checklist; we now call with "__all__".
   */
  onSaveStart?: (category: string) => void;
  onSaveComplete?: (category: string, success: boolean) => void;
  clearCache?: () => void;
}

interface GlobalSaveState {
  timer: ReturnType<typeof setTimeout> | null;
  lastSavedAt: number | null;
  isSaving: boolean;
  queued: boolean;
}

export function useDebouncedCategorySave({
  scheduleId,
  teamMemberId,
  checklist,
  debounceMs = 800,
  enabled = true,
  onSaveStart,
  onSaveComplete,
  clearCache,
}: UseDebouncedCategorySaveOptions) {
  // Single global debounced save for the whole checklist
  const stateRef = useRef<GlobalSaveState>({
    timer: null,
    lastSavedAt: null,
    isSaving: false,
    queued: false,
  });
  // Keep reference to latest checklist to avoid stale closures
  const checklistRef = useRef<ChecklistItem[]>(checklist);
  
  // Update ref whenever checklist changes - use shallow comparison to avoid unnecessary updates
  useEffect(() => {
    checklistRef.current = checklist;
  }, [checklist]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (stateRef.current.timer) clearTimeout(stateRef.current.timer);
    };
  }, []);

  // Perform the actual save operation - saves the WHOLE checklist once
  const performSave = useCallback(async (): Promise<boolean> => {
    if (!teamMemberId || !enabled) return false;

    // If a save is already in progress, just queue another run.
    if (stateRef.current.isSaving) {
      stateRef.current.queued = true;
      return false;
    }

    stateRef.current.isSaving = true;
    onSaveStart?.('__all__');
    
    try {
      const currentChecklist = checklistRef.current;
      
      const { error } = await supabase
        .from('schedules')
        .update({
          checklist_state: currentChecklist as unknown as Json,
          checklists: currentChecklist as unknown as Json,
        })
        .eq('id', scheduleId);

      if (error) {
        console.error('[AutoSave] Error saving checklist:', error);
        onSaveComplete?.('__all__', false);
        return false;
      }
      
      // Log a single audit entry (avoid spamming)
      await supabase.rpc('append_schedule_history', {
        p_schedule_id: scheduleId,
        p_team_member_id: teamMemberId,
        p_action: 'checklist_salvo_auto',
        p_from_status: null,
        p_to_status: null,
        p_payload: { debounce_ms: debounceMs }
      });
      
      // Clear cache after successful save
      clearCache?.();
      
      const now = Date.now();
      stateRef.current.lastSavedAt = now;
      onSaveComplete?.('__all__', true);
      
      return true;
    } catch (err) {
      console.error('[AutoSave] Exception saving checklist:', err);
      onSaveComplete?.('__all__', false);
      return false;
    } finally {
      stateRef.current.isSaving = false;

      // If something changed during save, run once more.
      if (stateRef.current.queued) {
        stateRef.current.queued = false;
        // yield to UI
        setTimeout(() => performSave(), 50);
      }
    }
  }, [scheduleId, teamMemberId, enabled, onSaveStart, onSaveComplete, clearCache, debounceMs]);

  // Schedule a debounced save for the whole checklist
  // (kept signature for compatibility; category is ignored)
  const scheduleSave = useCallback((_category?: string) => {
    if (!enabled || !teamMemberId) return;

    if (stateRef.current.timer) clearTimeout(stateRef.current.timer);
    stateRef.current.timer = setTimeout(() => {
      stateRef.current.timer = null;
      performSave();
    }, debounceMs);
  }, [enabled, teamMemberId, debounceMs, performSave]);

  // Force immediate save
  const flushAll = useCallback(async (): Promise<void> => {
    if (stateRef.current.timer) {
      clearTimeout(stateRef.current.timer);
      stateRef.current.timer = null;
    }
    await performSave();
  }, [performSave]);

  // Legacy helpers (category-based) now reflect global state
  const hasPendingSave = useCallback((_category?: string): boolean => {
    return stateRef.current.timer !== null;
  }, []);

  const isSavingCategory = useCallback((_category?: string): boolean => {
    return stateRef.current.isSaving;
  }, []);

  const getLastSavedAt = useCallback((_category?: string): number | null => {
    return stateRef.current.lastSavedAt;
  }, []);

  return {
    scheduleSave,
    flushAll,
    hasPendingSave,
    isSavingCategory,
    getLastSavedAt,
  };
}
