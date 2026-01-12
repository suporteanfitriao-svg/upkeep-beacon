import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from 'date-fns';

export type PaymentPeriod = 'today' | 'tomorrow' | 'week' | 'month';

interface PaymentSummary {
  received: number;
  future: number;
  hasRequiredRates: boolean;
}

export function useCleanerPayments(teamMemberId: string | null) {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PaymentPeriod>('today');
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
      case 'tomorrow':
        const tomorrow = addDays(now, 1);
        return { start: startOfDay(tomorrow), end: endOfDay(tomorrow) };
      case 'week':
        return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }, [period]);

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

      // Fetch completed schedules (received payments)
      const { data: completedSchedules, error: completedError } = await supabase
        .from('schedules')
        .select('property_id, status, end_at')
        .eq('responsible_team_member_id', teamMemberId)
        .eq('status', 'completed')
        .in('property_id', propertyIds)
        .gte('end_at', dateRange.start.toISOString())
        .lte('end_at', dateRange.end.toISOString());

      if (completedError) {
        console.error('Error fetching completed schedules:', completedError);
      }

      // Fetch pending/in-progress schedules (future payments)
      const { data: futureSchedules, error: futureError } = await supabase
        .from('schedules')
        .select('property_id, status, check_out_time')
        .eq('responsible_team_member_id', teamMemberId)
        .in('status', ['waiting', 'released', 'cleaning'])
        .in('property_id', propertyIds)
        .gte('check_out_time', dateRange.start.toISOString())
        .lte('check_out_time', dateRange.end.toISOString());

      if (futureError) {
        console.error('Error fetching future schedules:', futureError);
      }

      // Calculate received amount
      let received = 0;
      (completedSchedules || []).forEach(s => {
        const rate = rateMap.get(s.property_id);
        if (rate) received += rate;
      });

      // Calculate future amount
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
    summary,
    refetch: fetchPayments
  };
}
