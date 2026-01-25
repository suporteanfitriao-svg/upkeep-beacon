import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface AdminInspection {
  id: string;
  property_id: string;
  property_name: string;
  title: string;
  description?: string;
  scheduled_date: string;
  scheduled_time?: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  assigned_to?: string;
  assigned_to_name?: string;
  checklist_state: ChecklistItem[];
  notes?: string;
  completed_at?: string;
  completed_by_name?: string;
}

export function useAdminInspections() {
  const [inspections, setInspections] = useState<AdminInspection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInspections = useCallback(async () => {
    try {
      setLoading(true);
      // Include completed inspections to show them dimmed on their scheduled day
      const { data, error } = await supabase
        .from('inspections')
        .select('*')
        .order('scheduled_date', { ascending: true });

      if (error) throw error;

      setInspections((data || []).map(i => ({
        ...i,
        status: i.status as 'scheduled' | 'in_progress' | 'completed',
        checklist_state: Array.isArray(i.checklist_state) 
          ? (i.checklist_state as unknown as ChecklistItem[]) 
          : [],
      })));
    } catch (error) {
      console.error('Error fetching admin inspections:', error);
      setInspections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  return {
    inspections,
    loading,
    refetch: fetchInspections,
  };
}
