import { useState, useEffect, useCallback } from 'react';
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
  STATUS_FLOW,
  STATUS_ALLOWED_ROLES,
  AppRole
} from '@/types/scheduling';
import { Json } from '@/integrations/supabase/types';

interface ScheduleRow {
  id: string;
  property_id: string | null;
  property_name: string;
  property_address: string | null;
  guest_name: string | null;
  listing_name: string | null;
  number_of_guests: number | null;
  check_in_time: string;
  check_out_time: string;
  status: string | null;
  maintenance_status: string | null;
  priority: string | null;
  cleaner_name: string | null;
  cleaner_avatar: string | null;
  estimated_duration: number | null;
  checklists: Json | null;
  checklist_state: Json | null; // Added: frozen checklist state
  maintenance_issues: Json | null;
  notes: string | null;
  cleaner_observations: string | null;
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
  properties?: {
    image_url: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  reservations?: {
    check_in: string;
    check_out: string;
    guest_name: string | null;
    listing_name: string | null;
    number_of_guests: number | null;
    description: string | null;
  } | null;
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
      status: (typedItem?.status as 'pending' | 'ok' | 'not_ok') || 'pending',
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

const parseAckByTeamMembers = (ack: Json | null): TeamMemberAck[] => {
  if (!ack || !Array.isArray(ack)) return [];
  return ack.map((item: unknown) => {
    const typedItem = item as Record<string, unknown>;
    return {
      team_member_id: String(typedItem?.team_member_id || ''),
      acknowledged_at: String(typedItem?.acknowledged_at || ''),
    };
  });
};

const parseCategoryPhotos = (photos: Json | null): Record<string, CategoryPhoto[]> => {
  if (!photos || typeof photos !== 'object' || Array.isArray(photos)) return {};
  const result: Record<string, CategoryPhoto[]> = {};
  for (const [category, photoList] of Object.entries(photos as Record<string, unknown>)) {
    if (Array.isArray(photoList)) {
      result[category] = photoList.map((p: unknown) => {
        const photo = p as Record<string, unknown>;
        return {
          url: String(photo?.url || ''),
          uploadedAt: String(photo?.uploadedAt || ''),
          uploadedBy: photo?.uploadedBy ? String(photo.uploadedBy) : undefined,
        };
      });
    }
  }
  return result;
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
    released: 'released',
    cleaning: 'cleaning',
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

const extractDoorPassword = (description: string | null): string | undefined => {
  if (!description) return undefined;
  const match = description.match(/Phone Number \(Last 4 Digits\):\s*(\d{4})/);
  return match ? `${match[1]}#` : undefined;
};

// Validate status transition
export const canTransitionStatus = (
  fromStatus: ScheduleStatus,
  toStatus: ScheduleStatus,
  userRole: AppRole | null
): { allowed: boolean; reason?: string } => {
  if (!userRole) {
    return { allowed: false, reason: 'Usuário não autenticado' };
  }

  // Check if it's a valid forward transition
  const expectedNextStatus = STATUS_FLOW[fromStatus];
  
  if (expectedNextStatus === toStatus) {
    // Check role permission
    const allowedRoles = STATUS_ALLOWED_ROLES[toStatus];
    if (allowedRoles.includes(userRole)) {
      return { allowed: true };
    }
    return { 
      allowed: false, 
      reason: `Apenas ${allowedRoles.join(' ou ')} podem realizar esta ação` 
    };
  }

  // Check if it's a revert (going backwards)
  const statusOrder: ScheduleStatus[] = ['waiting', 'released', 'cleaning', 'completed'];
  const fromIndex = statusOrder.indexOf(fromStatus);
  const toIndex = statusOrder.indexOf(toStatus);

  if (toIndex < fromIndex) {
    if (userRole === 'admin') {
      return { allowed: true };
    }
    return { 
      allowed: false, 
      reason: 'Apenas administradores podem reverter o status' 
    };
  }

  return { 
    allowed: false, 
    reason: 'Transição de status não permitida. Siga o fluxo: Aguardando → Liberado → Em Limpeza → Finalizado' 
  };
};

const mapRowToSchedule = (row: ScheduleRow): Schedule => {
  // Schedule times take priority over reservation times (schedule can be customized by admin/manager)
  // The schedule's check_in_time and check_out_time are set from property defaults when created
  // and can be overridden per schedule
  const checkInSource = row.check_in_time;
  const checkOutSource = row.check_out_time;
  const guestNameSource = row.reservations?.guest_name || row.guest_name;
  const listingNameSource = row.reservations?.listing_name || row.listing_name || row.property_name;
  const numberOfGuestsSource = row.reservations?.number_of_guests || row.number_of_guests || 1;
  const doorPassword = extractDoorPassword(row.reservations?.description || null);

  return {
    id: row.id,
    propertyId: row.property_id || '',
    propertyName: listingNameSource,
    propertyAddress: row.property_address || '',
    propertyImageUrl: row.properties?.image_url || undefined,
    propertyLatitude: row.properties?.latitude || undefined,
    propertyLongitude: row.properties?.longitude || undefined,
    guestName: guestNameSource || 'Hóspede não informado',
    numberOfGuests: numberOfGuestsSource,
    checkIn: new Date(checkInSource),
    checkOut: new Date(checkOutSource),
    status: mapStatus(row.status),
    maintenanceStatus: mapMaintenanceStatus(row.maintenance_status),
    priority: mapPriority(row.priority),
    cleanerName: row.cleaner_name || 'Não atribuído',
    cleanerAvatar: row.cleaner_avatar || undefined,
    estimatedDuration: row.estimated_duration || 120,
    // Rule 46.2: Prioritize checklist_state (frozen state) over checklists (template)
    checklist: parseChecklist(row.checklist_state || row.checklists),
    photos: [],
    maintenanceIssues: parseMaintenanceIssues(row.maintenance_issues),
    notes: row.notes || '',
    cleanerObservations: row.cleaner_observations || undefined,
    missingMaterials: [],
    doorPassword,
    // New fields
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
        .select('*, properties(image_url, latitude, longitude), reservations(check_in, check_out, guest_name, listing_name, number_of_guests, description)')
        .eq('is_active', true)
        .order('check_out_time', { ascending: true });

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

  const updateSchedule = useCallback(async (
    updatedSchedule: Schedule, 
    previousStatus?: ScheduleStatus,
    teamMemberId?: string
  ) => {
    try {
      let checklistToUse = updatedSchedule.checklist;
      const now = new Date().toISOString();
      const updatePayload: Record<string, unknown> = {
        status: updatedSchedule.status,
        maintenance_status: updatedSchedule.maintenanceStatus,
        priority: updatedSchedule.priority,
        cleaner_name: updatedSchedule.cleanerName,
        notes: updatedSchedule.notes,
        maintenance_issues: updatedSchedule.maintenanceIssues as unknown as Json,
      };

      // When transitioning to 'cleaning' status
      if (updatedSchedule.status === 'cleaning' && previousStatus !== 'cleaning') {
        // Set start time
        updatePayload.start_at = now;
        
        // Set responsible team member if provided and not already set
        if (teamMemberId && !updatedSchedule.responsibleTeamMemberId) {
          updatePayload.responsible_team_member_id = teamMemberId;
        }

        // Fetch and link property checklists - prioritize default checklist
        if (updatedSchedule.propertyId) {
          // First try to get the default checklist
          let { data: propertyChecklists, error: checklistError } = await supabase
            .from('property_checklists')
            .select('items, name, is_default')
            .eq('property_id', updatedSchedule.propertyId)
            .eq('is_active', true)
            .eq('is_default', true)
            .limit(1);

          // If no default found, get any active checklist
          if (!checklistError && (!propertyChecklists || propertyChecklists.length === 0)) {
            const fallback = await supabase
              .from('property_checklists')
              .select('items, name, is_default')
              .eq('property_id', updatedSchedule.propertyId)
              .eq('is_active', true)
              .order('created_at', { ascending: false })
              .limit(1);
            
            if (!fallback.error) {
              propertyChecklists = fallback.data;
            }
          }

          if (!checklistError && propertyChecklists && propertyChecklists.length > 0) {
            const items = propertyChecklists[0].items as unknown[];
            console.log('Found property checklist:', propertyChecklists[0].name, 'with', items?.length || 0, 'items');
            if (Array.isArray(items) && items.length > 0) {
              checklistToUse = items.map((item: unknown, index: number) => {
                const typedItem = item as Record<string, unknown>;
                return {
                  id: String(typedItem?.id || `item-${index}`),
                  title: String(typedItem?.title || typedItem?.name || ''),
                  completed: false,
                  category: String(typedItem?.category || 'Geral'),
                  status: 'pending' as const,
                };
              });
              updatePayload.checklist_loaded_at = now;
              // Rule 46.2: Save frozen state to checklist_state
              updatePayload.checklist_state = checklistToUse as unknown as Json;
              console.log('Linked property checklist to schedule:', checklistToUse.length, 'items');
            } else {
              console.warn('Property checklist has no items:', propertyChecklists[0].name);
            }
          } else {
            console.warn('No active checklist found for property:', updatedSchedule.propertyId);
          }
        }
      }

      // When transitioning to 'completed' status
      if (updatedSchedule.status === 'completed' && previousStatus !== 'completed') {
        updatePayload.end_at = now;
      }

      // Check if cleaning was completed with delay (after check-in time)
      let completedWithDelay = false;
      let delayMinutes = 0;
      if (updatedSchedule.status === 'completed' && previousStatus !== 'completed') {
        const checkInTime = updatedSchedule.checkIn instanceof Date 
          ? updatedSchedule.checkIn 
          : new Date(updatedSchedule.checkIn);
        const endTime = new Date(now);
        
        if (endTime > checkInTime) {
          completedWithDelay = true;
          delayMinutes = Math.round((endTime.getTime() - checkInTime.getTime()) / (1000 * 60));
        }
      }

      // Update checklist - save to both checklists and checklist_state
      updatePayload.checklists = checklistToUse as unknown as Json;
      // Rule 46.2: Always update checklist_state when checklist changes during cleaning
      if (updatedSchedule.status === 'cleaning' || updatedSchedule.status === 'completed') {
        updatePayload.checklist_state = checklistToUse as unknown as Json;
      }

      // Build history event if status changed
      if (previousStatus && previousStatus !== updatedSchedule.status) {
        // Fetch team member name for history logging
        let teamMemberName: string | null = null;
        let teamMemberRole: string | null = null;
        
        if (teamMemberId && teamMemberId !== 'system') {
          const { data: memberData } = await supabase
            .from('team_members')
            .select('name, role')
            .eq('id', teamMemberId)
            .single();
          
          if (memberData) {
            teamMemberName = memberData.name;
            teamMemberRole = memberData.role;
          }
        }

        // Determine action type - include delay info if completed with delay
        const action = completedWithDelay ? 'completed_with_delay' : 'status_changed';
        const payload = completedWithDelay 
          ? { delay_minutes: delayMinutes, completed_after_checkin: true }
          : {};

        const newHistoryEvent = {
          timestamp: now,
          team_member_id: teamMemberId || 'system',
          team_member_name: teamMemberName,
          role: teamMemberRole,
          action,
          from_status: previousStatus,
          to_status: updatedSchedule.status,
          payload,
        };
        
        // Append to existing history
        const currentHistory = updatedSchedule.history || [];
        updatePayload.history = [...currentHistory, newHistoryEvent] as unknown as Json;
      }

      const { error: updateError } = await supabase
        .from('schedules')
        .update(updatePayload)
        .eq('id', updatedSchedule.id);

      if (updateError) throw updateError;

      const finalSchedule = { 
        ...updatedSchedule, 
        checklist: checklistToUse,
        startAt: updatePayload.start_at ? new Date(updatePayload.start_at as string) : updatedSchedule.startAt,
        endAt: updatePayload.end_at ? new Date(updatePayload.end_at as string) : updatedSchedule.endAt,
        teamArrival: updatePayload.start_at ? new Date(updatePayload.start_at as string) : updatedSchedule.teamArrival,
        teamDeparture: updatePayload.end_at ? new Date(updatePayload.end_at as string) : updatedSchedule.teamDeparture,
      };
      setSchedules(prev =>
        prev.map(s => (s.id === updatedSchedule.id ? finalSchedule : s))
      );

      return true;
    } catch (err) {
      console.error('Error updating schedule:', err);
      return false;
    }
  }, []);

  const updateScheduleTimes = useCallback(async (scheduleId: string, checkInTime: string, checkOutTime: string) => {
    try {
      // Find the current schedule to get existing dates
      const schedule = schedules.find(s => s.id === scheduleId);
      if (!schedule) return false;

      // Update times on the existing dates
      const checkInDate = new Date(schedule.checkIn);
      const checkOutDate = new Date(schedule.checkOut);
      
      const [checkInHours, checkInMinutes] = checkInTime.split(':').map(Number);
      const [checkOutHours, checkOutMinutes] = checkOutTime.split(':').map(Number);
      
      checkInDate.setHours(checkInHours, checkInMinutes, 0, 0);
      checkOutDate.setHours(checkOutHours, checkOutMinutes, 0, 0);

      const { error: updateError } = await supabase
        .from('schedules')
        .update({
          check_in_time: checkInDate.toISOString(),
          check_out_time: checkOutDate.toISOString(),
        })
        .eq('id', scheduleId);

      if (updateError) throw updateError;

      // Update local state
      setSchedules(prev =>
        prev.map(s => (s.id === scheduleId ? { ...s, checkIn: checkInDate, checkOut: checkOutDate } : s))
      );

      return true;
    } catch (err) {
      console.error('Error updating schedule times:', err);
      return false;
    }
  }, [schedules]);

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
    updateScheduleTimes,
  };
}

export function calculateStats(schedules: Schedule[]) {
  const now = new Date();
  
  // Calculate delayed: status is 'waiting' or 'released' (cleaning not started) AND 
  // less than 1 hour until check-in time
  const delayed = schedules.filter(s => {
    // Only consider schedules that haven't started cleaning
    if (s.status !== 'waiting' && s.status !== 'released') return false;
    
    // Check-in time is when the next guest arrives
    const checkInTime = s.checkIn;
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    
    // If check-in is within the next hour or already passed, it's delayed
    return checkInTime <= oneHourFromNow;
  }).length;

  return {
    waiting: schedules.filter(s => s.status === 'waiting').length,
    released: schedules.filter(s => s.status === 'released').length,
    cleaning: schedules.filter(s => s.status === 'cleaning').length,
    completed: schedules.filter(s => s.status === 'completed').length,
    maintenanceAlerts: schedules.filter(s => s.maintenanceStatus !== 'ok').length,
    delayed,
  };
}
