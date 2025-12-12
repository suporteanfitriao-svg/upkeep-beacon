import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Schedule, ScheduleStatus, MaintenanceStatus, Priority, ChecklistItem, MaintenanceIssue } from '@/types/scheduling';
import { Json } from '@/integrations/supabase/types';

interface ScheduleRow {
  id: string;
  property_name: string;
  property_address: string | null;
  check_in_time: string;
  check_out_time: string;
  status: string | null;
  maintenance_status: string | null;
  priority: string | null;
  cleaner_name: string | null;
  cleaner_avatar: string | null;
  estimated_duration: number | null;
  checklists: Json | null;
  maintenance_issues: Json | null;
  notes: string | null;
  guest_name: string | null;
}

const parseChecklist = (checklists: Json | null): ChecklistItem[] => {
  if (!checklists || !Array.isArray(checklists)) return [];
  return checklists.map((item: unknown, index: number) => {
    const typedItem = item as Record<string, unknown>;
    return {
      id: String(typedItem?.id || index),
      title: String(typedItem?.title || ''),
      completed: Boolean(typedItem?.completed),
      category: String(typedItem?.category || 'Geral'),
    };
  });
};

const parseMaintenanceIssues = (issues: Json | null): MaintenanceIssue[] => {
  if (!issues || !Array.isArray(issues)) return [];
  return issues.map((item: unknown, index: number) => {
    const typedItem = item as Record<string, unknown>;
    return {
      id: String(typedItem?.id || index),
      description: String(typedItem?.description || ''),
      severity: (typedItem?.severity as 'low' | 'medium' | 'high') || 'medium',
      reportedAt: new Date(String(typedItem?.reportedAt || new Date())),
      resolved: Boolean(typedItem?.resolved),
    };
  });
};

const mapPriority = (priority: string | null): Priority => {
  const priorityMap: Record<string, Priority> = {
    high: 'high',
    medium: 'medium',
    normal: 'medium',
    low: 'low',
  };
  return priorityMap[priority || ''] || 'medium';
};

const mapStatus = (status: string | null): ScheduleStatus => {
  const statusMap: Record<string, ScheduleStatus> = {
    waiting: 'waiting',
    cleaning: 'cleaning',
    inspection: 'inspection',
    completed: 'completed',
  };
  return statusMap[status || ''] || 'waiting';
};

const mapMaintenanceStatus = (status: string | null): MaintenanceStatus => {
  const statusMap: Record<string, MaintenanceStatus> = {
    ok: 'ok',
    needs_maintenance: 'needs_maintenance',
    in_progress: 'in_progress',
  };
  return statusMap[status || ''] || 'ok';
};

const mapRowToSchedule = (row: ScheduleRow): Schedule => ({
  id: row.id,
  propertyName: row.property_name,
  propertyAddress: row.property_address || '',
  guestName: row.guest_name || 'Hóspede não informado',
  checkIn: new Date(row.check_in_time),
  checkOut: new Date(row.check_out_time),
  status: mapStatus(row.status),
  maintenanceStatus: mapMaintenanceStatus(row.maintenance_status),
  priority: mapPriority(row.priority),
  cleanerName: row.cleaner_name || 'Não atribuído',
  cleanerAvatar: row.cleaner_avatar || undefined,
  estimatedDuration: row.estimated_duration || 120,
  checklist: parseChecklist(row.checklists),
  photos: [],
  maintenanceIssues: parseMaintenanceIssues(row.maintenance_issues),
  notes: row.notes || '',
  missingMaterials: [],
});

export function useSchedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('schedules')
        .select('*')
        .order('check_in_time', { ascending: true });

      if (fetchError) throw fetchError;

      const mappedSchedules = (data || []).map(mapRowToSchedule);
      setSchedules(mappedSchedules);
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSchedule = useCallback(async (updatedSchedule: Schedule) => {
    try {
      const { error: updateError } = await supabase
        .from('schedules')
        .update({
          status: updatedSchedule.status,
          maintenance_status: updatedSchedule.maintenanceStatus,
          priority: updatedSchedule.priority,
          cleaner_name: updatedSchedule.cleanerName,
          notes: updatedSchedule.notes,
          checklists: updatedSchedule.checklist as unknown as Json,
          maintenance_issues: updatedSchedule.maintenanceIssues as unknown as Json,
        })
        .eq('id', updatedSchedule.id);

      if (updateError) throw updateError;

      setSchedules(prev =>
        prev.map(s => (s.id === updatedSchedule.id ? updatedSchedule : s))
      );

      return true;
    } catch (err) {
      console.error('Error updating schedule:', err);
      return false;
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('schedules-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedules' },
        () => {
          fetchSchedules();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSchedules]);

  return {
    schedules,
    loading,
    error,
    refetch: fetchSchedules,
    updateSchedule,
  };
}

export function calculateStats(schedules: Schedule[]) {
  return {
    waiting: schedules.filter(s => s.status === 'waiting').length,
    cleaning: schedules.filter(s => s.status === 'cleaning').length,
    inspection: schedules.filter(s => s.status === 'inspection').length,
    completed: schedules.filter(s => s.status === 'completed').length,
    maintenanceAlerts: schedules.filter(s => s.maintenanceStatus !== 'ok').length,
  };
}
