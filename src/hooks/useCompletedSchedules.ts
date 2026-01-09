import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Schedule, 
  ScheduleStatus, 
  MaintenanceStatus, 
  Priority, 
  ChecklistItem, 
  MaintenanceIssue,
  ScheduleHistoryEvent,
  TeamMemberAck,
  CategoryPhoto,
} from '@/types/scheduling';
import { Json } from '@/integrations/supabase/types';
import { differenceInMinutes, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { SortField, SortOrder } from '@/components/reports/ReportFilters';

interface ScheduleRow {
  id: string;
  property_id: string | null;
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
  listing_name: string | null;
  number_of_guests: number | null;
  start_at: string | null;
  end_at: string | null;
  responsible_team_member_id: string | null;
  important_info: string | null;
  ack_by_team_members: Json | null;
  history: Json | null;
  is_active: boolean | null;
  checklist_loaded_at: string | null;
  admin_revert_reason: string | null;
  access_password: string | null;
  category_photos: Json | null;
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

const parseHistory = (history: Json | null): ScheduleHistoryEvent[] => {
  if (!history || !Array.isArray(history)) return [];
  return history.map((item: unknown) => {
    const typedItem = item as Record<string, unknown>;
    return {
      timestamp: String(typedItem?.timestamp || ''),
      team_member_id: String(typedItem?.team_member_id || ''),
      team_member_name: typedItem?.team_member_name ? String(typedItem.team_member_name) : null,
      role: typedItem?.role ? String(typedItem.role) : null,
      action: String(typedItem?.action || ''),
      from_status: typedItem?.from_status ? String(typedItem.from_status) : null,
      to_status: typedItem?.to_status ? String(typedItem.to_status) : null,
      payload: typedItem?.payload as Record<string, unknown> || {},
    };
  });
};

const parseAckByTeamMembers = (acks: Json | null): TeamMemberAck[] => {
  if (!acks || !Array.isArray(acks)) return [];
  return acks.map((item: unknown) => {
    const typedItem = item as Record<string, unknown>;
    return {
      team_member_id: String(typedItem?.team_member_id || ''),
      acknowledged_at: String(typedItem?.acknowledged_at || ''),
    };
  });
};

const parseCategoryPhotos = (photos: Json | null): Record<string, CategoryPhoto[]> => {
  if (!photos || typeof photos !== 'object') return {};
  const result: Record<string, CategoryPhoto[]> = {};
  const photosObj = photos as Record<string, unknown>;
  for (const [category, photoArray] of Object.entries(photosObj)) {
    if (Array.isArray(photoArray)) {
      result[category] = photoArray.map((p: unknown) => {
        const photo = p as Record<string, unknown>;
        return {
          url: String(photo?.url || ''),
          uploadedAt: String(photo?.uploadedAt || photo?.uploaded_at || ''),
          uploadedBy: photo?.uploadedBy ? String(photo.uploadedBy) : (photo?.uploaded_by ? String(photo.uploaded_by) : undefined),
        };
      });
    }
  }
  return result;
};

const mapPriority = (priority: string | null): Priority => {
  if (priority === 'high') return 'high';
  if (priority === 'low') return 'low';
  return 'medium';
};

const mapMaintenanceStatus = (status: string | null): MaintenanceStatus => {
  if (status === 'needs_maintenance') return 'needs_maintenance';
  if (status === 'in_progress') return 'in_progress';
  return 'ok';
};

const mapRowToSchedule = (row: ScheduleRow): Schedule => {
  return {
    id: row.id,
    propertyId: row.property_id || '',
    propertyName: row.property_name,
    propertyAddress: row.property_address || '',
    checkIn: new Date(row.check_in_time),
    checkOut: new Date(row.check_out_time),
    status: (row.status as ScheduleStatus) || 'waiting',
    maintenanceStatus: mapMaintenanceStatus(row.maintenance_status),
    priority: mapPriority(row.priority),
    cleanerName: row.cleaner_name || 'Não atribuído',
    cleanerAvatar: row.cleaner_avatar || undefined,
    estimatedDuration: row.estimated_duration || 120,
    checklist: parseChecklist(row.checklists),
    photos: [],
    maintenanceIssues: parseMaintenanceIssues(row.maintenance_issues),
    notes: row.notes || '',
    guestName: row.guest_name || 'Hóspede',
    numberOfGuests: row.number_of_guests || 0,
    missingMaterials: [],
    startAt: row.start_at ? new Date(row.start_at) : undefined,
    endAt: row.end_at ? new Date(row.end_at) : undefined,
    teamArrival: row.start_at ? new Date(row.start_at) : undefined,
    teamDeparture: row.end_at ? new Date(row.end_at) : undefined,
    responsibleTeamMemberId: row.responsible_team_member_id || undefined,
    importantInfo: row.important_info || undefined,
    ackByTeamMembers: parseAckByTeamMembers(row.ack_by_team_members),
    history: parseHistory(row.history),
    isActive: row.is_active ?? true,
    checklistLoadedAt: row.checklist_loaded_at ? new Date(row.checklist_loaded_at) : undefined,
    adminRevertReason: row.admin_revert_reason || undefined,
    accessPassword: row.access_password || undefined,
    categoryPhotos: parseCategoryPhotos(row.category_photos),
  };
};

interface UseCompletedSchedulesOptions {
  startDate?: Date;
  endDate?: Date;
  propertyId?: string;
  responsibleId?: string;
  searchQuery?: string;
  sortField?: SortField;
  sortOrder?: SortOrder;
}

interface UseCompletedSchedulesResult {
  schedules: Schedule[];
  loading: boolean;
  error: boolean;
  stats: {
    totalCompleted: number;
    averageDuration: number;
    totalIssues: number;
  };
  refetch: () => void;
}

export function useCompletedSchedules(options: UseCompletedSchedulesOptions = {}): UseCompletedSchedulesResult {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const { startDate, endDate, propertyId, responsibleId, searchQuery, sortField = 'date', sortOrder = 'desc' } = options;

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);

      let query = supabase
        .from('schedules')
        .select('*')
        .eq('status', 'completed')
        .eq('is_active', true);

      if (propertyId && propertyId !== 'all') {
        query = query.eq('property_id', propertyId);
      }

      if (responsibleId && responsibleId !== 'all') {
        query = query.eq('responsible_team_member_id', responsibleId);
      }

      const { data, error: queryError } = await query.order('end_at', { ascending: false, nullsFirst: false });

      if (queryError) {
        console.error('Error fetching completed schedules:', queryError);
        setError(true);
        return;
      }

      const mappedSchedules = (data || []).map(row => mapRowToSchedule(row as ScheduleRow));
      setSchedules(mappedSchedules);
    } catch (err) {
      console.error('Error in fetchSchedules:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [propertyId, responsibleId]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Apply client-side filtering and sorting
  const filteredAndSortedSchedules = useMemo(() => {
    let result = [...schedules];

    // Filter by date range
    if (startDate) {
      const start = startOfDay(startDate);
      result = result.filter(s => {
        const scheduleDate = s.endAt || s.checkOut;
        return isAfter(scheduleDate, start) || scheduleDate.getTime() === start.getTime();
      });
    }

    if (endDate) {
      const end = endOfDay(endDate);
      result = result.filter(s => {
        const scheduleDate = s.endAt || s.checkOut;
        return isBefore(scheduleDate, end) || scheduleDate.getTime() === end.getTime();
      });
    }

    // Filter by search query
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.propertyName.toLowerCase().includes(query) ||
        s.propertyAddress.toLowerCase().includes(query) ||
        (s.cleanerName && s.cleanerName.toLowerCase().includes(query))
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'date':
          const dateA = a.endAt || a.checkOut;
          const dateB = b.endAt || b.checkOut;
          comparison = dateA.getTime() - dateB.getTime();
          break;
        case 'duration':
          const durationA = a.startAt && a.endAt ? differenceInMinutes(a.endAt, a.startAt) : 0;
          const durationB = b.startAt && b.endAt ? differenceInMinutes(b.endAt, b.startAt) : 0;
          comparison = durationA - durationB;
          break;
        case 'responsible':
          const nameA = a.cleanerName || '';
          const nameB = b.cleanerName || '';
          comparison = nameA.localeCompare(nameB);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [schedules, startDate, endDate, searchQuery, sortField, sortOrder]);

  // Calculate stats
  const stats = useMemo(() => {
    const schedulesWithDuration = filteredAndSortedSchedules.filter(s => s.startAt && s.endAt);
    const totalDuration = schedulesWithDuration.reduce((acc, s) => {
      return acc + differenceInMinutes(s.endAt!, s.startAt!);
    }, 0);

    const totalIssues = filteredAndSortedSchedules.reduce((acc, s) => acc + s.maintenanceIssues.length, 0);

    return {
      totalCompleted: filteredAndSortedSchedules.length,
      averageDuration: schedulesWithDuration.length > 0 ? totalDuration / schedulesWithDuration.length : 0,
      totalIssues,
    };
  }, [filteredAndSortedSchedules]);

  return {
    schedules: filteredAndSortedSchedules,
    loading,
    error,
    stats,
    refetch: fetchSchedules,
  };
}
