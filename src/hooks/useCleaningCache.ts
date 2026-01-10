import { useCallback, useEffect, useRef } from 'react';
import { ChecklistItem, MaintenanceIssue, CategoryPhoto } from '@/types/scheduling';

// Cache key format: cleaning_cache_${scheduleId}_${teamMemberId}
const getCacheKey = (scheduleId: string, teamMemberId: string) => 
  `cleaning_cache_${scheduleId}_${teamMemberId}`;

export interface CleaningCacheData {
  scheduleId: string;
  teamMemberId: string;
  checklistState: ChecklistItem[];
  checklistItemStates: Record<string, 'yes' | 'no' | null>;
  observationsText: string;
  draftIssues: MaintenanceIssue[];
  categoryPhotos: Record<string, CategoryPhoto[]>;
  lastUpdated: string;
}

interface UseCleaningCacheProps {
  scheduleId: string;
  teamMemberId: string | null;
  isActive: boolean; // Only cache when status = cleaning
}

interface UseCleaningCacheResult {
  loadCache: () => CleaningCacheData | null;
  saveCache: (data: Partial<CleaningCacheData>) => void;
  clearCache: () => void;
  hasCache: () => boolean;
}

export function useCleaningCache({
  scheduleId,
  teamMemberId,
  isActive,
}: UseCleaningCacheProps): UseCleaningCacheResult {
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentCacheRef = useRef<CleaningCacheData | null>(null);

  // Load cache from localStorage
  const loadCache = useCallback((): CleaningCacheData | null => {
    if (!scheduleId || !teamMemberId) return null;

    try {
      const key = getCacheKey(scheduleId, teamMemberId);
      const cached = localStorage.getItem(key);
      if (cached) {
        const data = JSON.parse(cached) as CleaningCacheData;
        currentCacheRef.current = data;
        return data;
      }
    } catch (err) {
      console.error('Error loading cleaning cache:', err);
    }
    return null;
  }, [scheduleId, teamMemberId]);

  // Save cache to localStorage (with debounce for frequent updates)
  const saveCache = useCallback((data: Partial<CleaningCacheData>) => {
    if (!scheduleId || !teamMemberId || !isActive) return;

    // Merge with existing cache
    const existingCache = currentCacheRef.current || loadCache();
    const newCache: CleaningCacheData = {
      scheduleId,
      teamMemberId,
      checklistState: data.checklistState ?? existingCache?.checklistState ?? [],
      checklistItemStates: data.checklistItemStates ?? existingCache?.checklistItemStates ?? {},
      observationsText: data.observationsText ?? existingCache?.observationsText ?? '',
      draftIssues: data.draftIssues ?? existingCache?.draftIssues ?? [],
      categoryPhotos: data.categoryPhotos ?? existingCache?.categoryPhotos ?? {},
      lastUpdated: new Date().toISOString(),
    };

    currentCacheRef.current = newCache;

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce write to localStorage (500ms)
    debounceTimerRef.current = setTimeout(() => {
      try {
        const key = getCacheKey(scheduleId, teamMemberId);
        localStorage.setItem(key, JSON.stringify(newCache));
        console.log('[CleaningCache] Saved cache for schedule:', scheduleId);
      } catch (err) {
        console.error('Error saving cleaning cache:', err);
      }
    }, 500);
  }, [scheduleId, teamMemberId, isActive, loadCache]);

  // Clear cache (after successful commit)
  const clearCache = useCallback(() => {
    if (!scheduleId || !teamMemberId) return;

    try {
      const key = getCacheKey(scheduleId, teamMemberId);
      localStorage.removeItem(key);
      currentCacheRef.current = null;
      console.log('[CleaningCache] Cleared cache for schedule:', scheduleId);
    } catch (err) {
      console.error('Error clearing cleaning cache:', err);
    }
  }, [scheduleId, teamMemberId]);

  // Check if cache exists
  const hasCache = useCallback((): boolean => {
    if (!scheduleId || !teamMemberId) return false;

    try {
      const key = getCacheKey(scheduleId, teamMemberId);
      return localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  }, [scheduleId, teamMemberId]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    loadCache,
    saveCache,
    clearCache,
    hasCache,
  };
}
