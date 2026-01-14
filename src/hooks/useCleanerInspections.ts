import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTeamMemberId } from './useTeamMemberId';

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface CleanerInspection {
  id: string;
  property_id: string;
  property_name: string;
  property_image_url?: string;
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
}

export function useCleanerInspections() {
  const { teamMemberId } = useTeamMemberId();
  const [inspections, setInspections] = useState<CleanerInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Fetch user role separately to avoid hook nesting issues
  useEffect(() => {
    async function fetchUserRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserRole(null);
        return;
      }
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setUserRole(data?.role || null);
    }
    
    fetchUserRole();
  }, []);

  const isAdminOrManager = userRole === 'admin' || userRole === 'manager';

  const fetchInspections = useCallback(async () => {
    // For cleaners, require teamMemberId
    if (!isAdminOrManager && !teamMemberId) {
      setInspections([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      let query = supabase
        .from('inspections')
        .select('*, properties(image_url)')
        .in('status', ['scheduled', 'in_progress'])
        .order('scheduled_date', { ascending: true });

      // Cleaners only see their assigned inspections
      if (!isAdminOrManager && teamMemberId) {
        query = query.eq('assigned_to', teamMemberId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setInspections((data || []).map(i => ({
        ...i,
        property_image_url: (i.properties as any)?.image_url || undefined,
        status: i.status as 'scheduled' | 'in_progress' | 'completed',
        checklist_state: Array.isArray(i.checklist_state) 
          ? (i.checklist_state as unknown as ChecklistItem[]) 
          : [],
      })));
    } catch (error) {
      console.error('Error fetching cleaner inspections:', error);
      setInspections([]);
    } finally {
      setLoading(false);
    }
  }, [teamMemberId, isAdminOrManager]);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  const updateInspectionStatus = async (
    inspectionId: string, 
    newStatus: 'scheduled' | 'in_progress' | 'completed'
  ): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = { status: newStatus };
      
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = teamMemberId;
        
        // Get the name from the team member
        if (teamMemberId) {
          const { data: member } = await supabase
            .from('team_members')
            .select('name')
            .eq('id', teamMemberId)
            .maybeSingle();
          
          if (member) {
            updateData.completed_by_name = member.name;
          }
        }
      }

      const { error } = await supabase
        .from('inspections')
        .update(updateData)
        .eq('id', inspectionId);

      if (error) throw error;

      // Update local state
      setInspections(prev => 
        prev.map(i => i.id === inspectionId 
          ? { ...i, status: newStatus, ...(newStatus === 'completed' ? { completed_at: updateData.completed_at as string } : {}) }
          : i
        ).filter(i => newStatus !== 'completed' || i.id !== inspectionId) // Remove completed from list
      );

      return true;
    } catch (error) {
      console.error('Error updating inspection status:', error);
      return false;
    }
  };

  const updateChecklistItem = async (
    inspectionId: string, 
    itemId: string
  ): Promise<boolean> => {
    const inspection = inspections.find(i => i.id === inspectionId);
    if (!inspection) return false;

    const updatedState = inspection.checklist_state.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );

    try {
      const { error } = await supabase
        .from('inspections')
        .update({ checklist_state: JSON.parse(JSON.stringify(updatedState)) })
        .eq('id', inspectionId);

      if (error) throw error;

      setInspections(prev =>
        prev.map(i => i.id === inspectionId 
          ? { ...i, checklist_state: updatedState }
          : i
        )
      );

      return true;
    } catch (error) {
      console.error('Error updating checklist item:', error);
      return false;
    }
  };

  return {
    inspections,
    loading,
    refetch: fetchInspections,
    updateInspectionStatus,
    updateChecklistItem,
  };
}
