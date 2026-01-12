import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export type PaymentPeriod = 'today' | 'tomorrow' | 'week' | 'month';

interface PaymentSummary {
  received: number;
  future: number;
  hasRequiredRates: boolean;
}

export function useCleanerPayments(teamMemberId: string | null) {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PaymentPeriod>('today');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [summary, setSummary] = useState<PaymentSummary>({
    received: 0,
    future: 0,
    hasRequiredRates: false
  });

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'tomorrow': {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return { start: startOfDay(tomorrow), end: endOfDay(tomorrow) };
      }
      case 'week':
        return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) };
      case 'month':
        return { start: startOfMonth(selectedMonth), end: endOfMonth(selectedMonth) };
    }
  }, [period, selectedMonth]);

  const fetchPayments = useCallback(async () => {
    if (!teamMemberId) {
      setSummary({ received: 0, future: 0, hasRequiredRates: false });
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Check if cleaner has any required rates
      const { data: rates, error: ratesError } = await supabase
        .from('cleaning_rates')
        .select('property_id, rate_value')
        .eq('team_member_id', teamMemberId)
        .eq('is_required', true);

      if (ratesError) {
        console.error('Error fetching rates:', ratesError);
        setLoading(false);
        return;
      }

      if (!rates || rates.length === 0) {
        setSummary({ received: 0, future: 0, hasRequiredRates: false });
        setLoading(false);
        return;
      }

      // Build a map of property_id -> rate_value
      const rateMap = new Map<string, number>();
      rates.forEach(r => rateMap.set(r.property_id, parseFloat(String(r.rate_value))));
      const propertyIds = Array.from(rateMap.keys());

      // Fetch completed schedules assigned to this team member (received payments) within date range
      const { data: completedSchedules, error: completedError } = await supabase
        .from('schedules')
        .select('property_id, status, end_at')
        .eq('responsible_team_member_id', teamMemberId)
        .eq('status', 'completed')
        .eq('is_active', true)
        .in('property_id', propertyIds)
        .gte('end_at', dateRange.start.toISOString())
        .lte('end_at', dateRange.end.toISOString());

      if (completedError) {
        console.error('Error fetching completed schedules:', completedError);
      }

      // Fetch ALL pending schedules for properties where this team member has required rates
      // This calculates the estimated provision based on property binding
      const { data: futureSchedules, error: futureError } = await supabase
        .from('schedules')
        .select('property_id, status, check_out_time')
        .in('status', ['waiting', 'released', 'cleaning'])
        .in('property_id', propertyIds)
        .eq('is_active', true);

      if (futureError) {
        console.error('Error fetching future schedules:', futureError);
      }

      // Calculate received amount
      let received = 0;
      (completedSchedules || []).forEach(s => {
        const rate = rateMap.get(s.property_id);
        if (rate) received += rate;
      });

      // Calculate future amount - sum ALL pending tasks for provision estimate
      let future = 0;
      (futureSchedules || []).forEach(s => {
        const rate = rateMap.get(s.property_id);
        if (rate) future += rate;
      });

      setSummary({
        received,
        future,
        hasRequiredRates: true
      });
    } catch (err) {
      console.error('Error in fetchPayments:', err);
    } finally {
      setLoading(false);
    }
  }, [teamMemberId, dateRange]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return {
    loading,
    period,
    setPeriod,
    selectedMonth,
    setSelectedMonth,
    summary,
    refetch: fetchPayments
  };
}