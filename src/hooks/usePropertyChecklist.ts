import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UsePropertyChecklistProps {
  propertyId: string;
  enabled?: boolean;
}

interface PropertyChecklistResult {
  hasChecklist: boolean;
  isLoading: boolean;
  checklistName: string | null;
  itemsCount: number;
  refetch: () => Promise<void>;
}

export function usePropertyChecklist({ 
  propertyId, 
  enabled = true 
}: UsePropertyChecklistProps): PropertyChecklistResult {
  const [hasChecklist, setHasChecklist] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [checklistName, setChecklistName] = useState<string | null>(null);
  const [itemsCount, setItemsCount] = useState<number>(0);

  const fetchChecklist = useCallback(async () => {
    if (!propertyId || !enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('property_checklists')
        .select('id, name, items')
        .eq('property_id', propertyId)
        .eq('is_active', true)
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const checklist = data[0];
        const items = checklist.items as unknown[];
        setHasChecklist(Array.isArray(items) && items.length > 0);
        setChecklistName(checklist.name);
        setItemsCount(Array.isArray(items) ? items.length : 0);
      } else {
        setHasChecklist(false);
        setChecklistName(null);
        setItemsCount(0);
      }
    } catch (err) {
      console.error('Error fetching property checklist:', err);
      setHasChecklist(false);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, enabled]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  return {
    hasChecklist,
    isLoading,
    checklistName,
    itemsCount,
    refetch: fetchChecklist,
  };
}
