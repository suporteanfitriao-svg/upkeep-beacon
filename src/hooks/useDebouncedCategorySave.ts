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
  // Track if save is globally in progress to prevent concurrent saves
  const globalSaveInProgressRef = useRef(false);
  // Queue for pending saves when a save is in progress
  const pendingSaveQueueRef = useRef<Set<string>>(new Set());
  
  // Update ref whenever checklist changes - use shallow comparison to avoid unnecessary updates
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
      pendingSaveQueueRef.current.clear();
    };
  }, []);

  // Perform the actual save operation - saves ONCE for all pending categories
  const performSave = useCallback(async (categories: string[]): Promise<boolean> => {
    if (!teamMemberId || !enabled || categories.length === 0) return false;
    if (globalSaveInProgressRef.current) {
      // Queue these categories for later
      categories.forEach(cat => pendingSaveQueueRef.current.add(cat));
      return false;
    }
    
    globalSaveInProgressRef.current = true;
    
    // Mark all as saving
    categories.forEach(category => {
      let state = categoryStateRef.current.get(category);
      if (state) {
        state.isSaving = true;
      } else {
        categoryStateRef.current.set(category, { timer: null, lastSavedAt: null, isSaving: true });
      }
      onSaveStart?.(category);
    });
    
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
        console.error('[AutoSave] Error saving categories:', categories, error);
        categories.forEach(category => onSaveComplete?.(category, false));
        return false;
      }
      
      // Log audit entry for the first category (to avoid spamming)
      await supabase.rpc('append_schedule_history', {
        p_schedule_id: scheduleId,
        p_team_member_id: teamMemberId,
        p_action: 'categoria_salva_auto',
        p_from_status: null,
        p_to_status: null,
        p_payload: { category_names: categories }
      });
      
      // Clear cache after successful save
      clearCache?.();
      
      // Update state for all categories
      const now = Date.now();
      categories.forEach(category => {
        const updatedState = categoryStateRef.current.get(category);
        if (updatedState) {
          updatedState.isSaving = false;
          updatedState.lastSavedAt = now;
        }
        onSaveComplete?.(category, true);
      });
      
      return true;
    } catch (err) {
      console.error('[AutoSave] Exception saving categories:', categories, err);
      categories.forEach(category => onSaveComplete?.(category, false));
      return false;
    } finally {
      // Mark all as not saving
      categories.forEach(category => {
        const finalState = categoryStateRef.current.get(category);
        if (finalState) {
          finalState.isSaving = false;
        }
      });
      
      globalSaveInProgressRef.current = false;
      
      // Process any queued saves
      if (pendingSaveQueueRef.current.size > 0) {
        const queuedCategories = Array.from(pendingSaveQueueRef.current);
        pendingSaveQueueRef.current.clear();
        // Use setTimeout to avoid blocking the current stack
        setTimeout(() => performSave(queuedCategories), 50);
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
    
    // Create new timer - collect all pending categories when timer fires
    const timer = setTimeout(() => {
      // Collect all categories that have pending timers
      const categoriesToSave: string[] = [];
      categoryStateRef.current.forEach((s, cat) => {
        if (s.timer !== null) {
          clearTimeout(s.timer);
          s.timer = null;
          categoriesToSave.push(cat);
        }
      });
      
      // Add current category if not already included
      if (!categoriesToSave.includes(category)) {
        categoriesToSave.push(category);
      }
      
      performSave(categoriesToSave);
    }, debounceMs);
    
    if (state) {
      state.timer = timer;
    } else {
      categoryStateRef.current.set(category, { timer, lastSavedAt: null, isSaving: false });
    }
  }, [enabled, teamMemberId, debounceMs, performSave]);

  // Force immediate save for a category (used before closing or navigating)
  const flushCategory = useCallback(async (category: string): Promise<boolean> => {
    const state = categoryStateRef.current.get(category);
    if (state?.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
    return performSave([category]);
  }, [performSave]);

  // Flush all pending saves
  const flushAll = useCallback(async (): Promise<void> => {
    const categories: string[] = [];
    categoryStateRef.current.forEach((state, category) => {
      if (state.timer !== null) {
        clearTimeout(state.timer);
        state.timer = null;
        categories.push(category);
      }
    });
    
    if (categories.length > 0) {
      await performSave(categories);
    }
  }, [performSave]);

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
