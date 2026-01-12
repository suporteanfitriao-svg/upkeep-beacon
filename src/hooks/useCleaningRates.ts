import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CleaningRate {
  id: string;
  property_id: string;
  team_member_id: string;
  rate_value: number;
  is_required: boolean;
  created_at: string;
  updated_at: string;
  team_member?: {
    id: string;
    name: string;
    role: string;
  };
}

export function useCleaningRates(propertyId?: string) {
  const [rates, setRates] = useState<CleaningRate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRates = useCallback(async () => {
    if (!propertyId) {
      setRates([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('cleaning_rates')
      .select(`
        *,
        team_member:team_members(id, name, role)
      `)
      .eq('property_id', propertyId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching cleaning rates:', error);
      toast.error('Erro ao carregar taxas');
    } else {
      setRates((data || []).map((item: any) => ({
        ...item,
        rate_value: parseFloat(item.rate_value),
        team_member: item.team_member
      })));
    }
    setLoading(false);
  }, [propertyId]);

  // Auto-assign pending schedules to team member when rate is required
  const autoAssignSchedules = useCallback(async (propertyId: string, teamMemberId: string, teamMemberName: string) => {
    // Fetch pending schedules without responsible or with this responsible
    const { data: schedules, error } = await supabase
      .from('schedules')
      .select('id, responsible_team_member_id')
      .eq('property_id', propertyId)
      .in('status', ['waiting', 'released'])
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching schedules for auto-assign:', error);
      return;
    }

    // Only assign schedules that don't have a responsible yet
    const schedulesToAssign = (schedules || []).filter(s => !s.responsible_team_member_id);
    
    if (schedulesToAssign.length > 0) {
      const { error: updateError } = await supabase
        .from('schedules')
        .update({ 
          responsible_team_member_id: teamMemberId,
          cleaner_name: teamMemberName
        })
        .in('id', schedulesToAssign.map(s => s.id));

      if (updateError) {
        console.error('Error auto-assigning schedules:', updateError);
      } else {
        console.log(`Auto-assigned ${schedulesToAssign.length} schedules to ${teamMemberName}`);
      }
    }
  }, []);

  const createRate = useCallback(async (data: {
    property_id: string;
    team_member_id: string;
    rate_value: number;
    is_required: boolean;
  }) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return false;

    const { data: newRate, error } = await supabase
      .from('cleaning_rates')
      .insert(data)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        toast.error('Taxa já existe para este membro nesta propriedade');
      } else {
        toast.error('Erro ao criar taxa');
        console.error(error);
      }
      return false;
    }

    // Log audit
    await supabase.from('cleaning_rate_audit_logs').insert({
      cleaning_rate_id: newRate.id,
      property_id: data.property_id,
      team_member_id: data.team_member_id,
      user_id: user.user.id,
      new_rate_value: data.rate_value,
      new_is_required: data.is_required,
      action: 'create'
    });

    // Auto-assign schedules if rate is required
    if (data.is_required) {
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('name')
        .eq('id', data.team_member_id)
        .single();
      
      if (teamMember) {
        await autoAssignSchedules(data.property_id, data.team_member_id, teamMember.name);
      }
    }

    toast.success('Taxa criada com sucesso');
    await fetchRates();
    return true;
  }, [fetchRates, autoAssignSchedules]);

  const updateRate = useCallback(async (
    rateId: string,
    previousData: { rate_value: number; is_required: boolean },
    newData: { rate_value: number; is_required: boolean }
  ) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return false;

    const rate = rates.find(r => r.id === rateId);
    if (!rate) return false;

    const { error } = await supabase
      .from('cleaning_rates')
      .update({
        rate_value: newData.rate_value,
        is_required: newData.is_required
      })
      .eq('id', rateId);

    if (error) {
      toast.error('Erro ao atualizar taxa');
      console.error(error);
      return false;
    }

    // Log audit
    await supabase.from('cleaning_rate_audit_logs').insert({
      cleaning_rate_id: rateId,
      property_id: rate.property_id,
      team_member_id: rate.team_member_id,
      user_id: user.user.id,
      previous_rate_value: previousData.rate_value,
      new_rate_value: newData.rate_value,
      previous_is_required: previousData.is_required,
      new_is_required: newData.is_required,
      action: 'update'
    });

    // Auto-assign schedules if rate became required
    if (newData.is_required && !previousData.is_required) {
      const teamMemberName = rate.team_member?.name || 'Profissional';
      await autoAssignSchedules(rate.property_id, rate.team_member_id, teamMemberName);
    }

    toast.success('Taxa atualizada com sucesso');
    await fetchRates();
    return true;
  }, [rates, fetchRates, autoAssignSchedules]);

  const deleteRate = useCallback(async (rateId: string) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return false;

    const rate = rates.find(r => r.id === rateId);
    if (!rate) return false;

    // Log audit before deletion
    await supabase.from('cleaning_rate_audit_logs').insert({
      cleaning_rate_id: rateId,
      property_id: rate.property_id,
      team_member_id: rate.team_member_id,
      user_id: user.user.id,
      previous_rate_value: rate.rate_value,
      new_rate_value: 0,
      previous_is_required: rate.is_required,
      new_is_required: false,
      action: 'delete'
    });

    const { error } = await supabase
      .from('cleaning_rates')
      .delete()
      .eq('id', rateId);

    if (error) {
      toast.error('Erro ao excluir taxa');
      console.error(error);
      return false;
    }

    toast.success('Taxa excluída com sucesso');
    await fetchRates();
    return true;
  }, [rates, fetchRates]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  return {
    rates,
    loading,
    fetchRates,
    createRate,
    updateRate,
    deleteRate
  };
}
