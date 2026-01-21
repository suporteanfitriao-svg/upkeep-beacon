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
  onSaveStart?: (category: string) => void;
  onSaveComplete?: (category: string, success: boolean) => void;
  clearCache?: () => void;
}

interface CategorySaveState {
  timer: ReturnType<typeof setTimeout> | null;
  lastSavedAt: number | null;
  isSaving: boolean;
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
  // Track save state per category
  const categoryStateRef = useRef<Map<string, CategorySaveState>>(new Map());
  // Keep reference to latest checklist to avoid stale closures
  const checklistRef = useRef<ChecklistItem[]>(checklist);
  
  // Update ref whenever checklist changes
  useEffect(() => {
    checklistRef.current = checklist;
  }, [checklist]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      categoryStateRef.current.forEach((state) => {
        if (state.timer) clearTimeout(state.timer);
      });
      categoryStateRef.current.clear();
    };
  }, []);

  // Perform the actual save operation
  const saveCategory = useCallback(async (category: string): Promise<boolean> => {
    if (!teamMemberId || !enabled) return false;
    
    const state = categoryStateRef.current.get(category);
    if (state?.isSaving) return false; // Already saving
    
    // Mark as saving
    if (state) {
      state.isSaving = true;
    } else {
      categoryStateRef.current.set(category, { timer: null, lastSavedAt: null, isSaving: true });
    }
    
    onSaveStart?.(category);
    
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
        console.error('[AutoSave] Error saving category:', category, error);
        onSaveComplete?.(category, false);
        return false;
      }
      
      // Log audit entry
      await supabase.rpc('append_schedule_history', {
        p_schedule_id: scheduleId,
        p_team_member_id: teamMemberId,
        p_action: 'categoria_salva_auto',
        p_from_status: null,
        p_to_status: null,
        p_payload: { category_name: category }
      });
      
      // Clear cache after successful save
      clearCache?.();
      
      // Update state
      const updatedState = categoryStateRef.current.get(category);
      if (updatedState) {
        updatedState.isSaving = false;
        updatedState.lastSavedAt = Date.now();
      }
      
      onSaveComplete?.(category, true);
      return true;
    } catch (err) {
      console.error('[AutoSave] Exception saving category:', category, err);
      onSaveComplete?.(category, false);
      return false;
    } finally {
      const finalState = categoryStateRef.current.get(category);
      if (finalState) {
        finalState.isSaving = false;
      }
    }
  }, [scheduleId, teamMemberId, enabled, onSaveStart, onSaveComplete, clearCache]);

  // Schedule a debounced save for a category
  const scheduleSave = useCallback((category: string) => {
    if (!enabled || !teamMemberId) return;
    
    let state = categoryStateRef.current.get(category);
    
    // Clear existing timer
    if (state?.timer) {
      clearTimeout(state.timer);
    }
    
    // Create new timer
    const timer = setTimeout(() => {
      saveCategory(category);
    }, debounceMs);
    
    if (state) {
      state.timer = timer;
    } else {
      categoryStateRef.current.set(category, { timer, lastSavedAt: null, isSaving: false });
    }
  }, [enabled, teamMemberId, debounceMs, saveCategory]);

  // Force immediate save for a category (used before closing or navigating)
  const flushCategory = useCallback(async (category: string): Promise<boolean> => {
    const state = categoryStateRef.current.get(category);
    if (state?.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
    return saveCategory(category);
  }, [saveCategory]);

  // Flush all pending saves
  const flushAll = useCallback(async (): Promise<void> => {
    const categories = Array.from(categoryStateRef.current.keys());
    const pendingCategories = categories.filter(cat => {
      const state = categoryStateRef.current.get(cat);
      return state?.timer !== null;
    });
    
    await Promise.all(pendingCategories.map(flushCategory));
  }, [flushCategory]);

  // Check if a category has pending save
  const hasPendingSave = useCallback((category: string): boolean => {
    const state = categoryStateRef.current.get(category);
    return state?.timer !== null || false;
  }, []);

  // Check if a category is currently saving
  const isSavingCategory = useCallback((category: string): boolean => {
    const state = categoryStateRef.current.get(category);
    return state?.isSaving || false;
  }, []);

  // Get last saved timestamp for a category
  const getLastSavedAt = useCallback((category: string): number | null => {
    const state = categoryStateRef.current.get(category);
    return state?.lastSavedAt || null;
  }, []);

  return {
    scheduleSave,
    flushCategory,
    flushAll,
    hasPendingSave,
    isSavingCategory,
    getLastSavedAt,
  };
}
