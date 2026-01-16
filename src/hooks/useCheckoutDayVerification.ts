import { useMemo } from 'react';
import { Schedule } from '@/types/scheduling';
import { formatInTimeZone } from 'date-fns-tz';

const TIMEZONE = 'America/Sao_Paulo';

/**
 * Hook to verify if today is the checkout day for a schedule,
 * OR if the task is overdue (checkout date has passed but task is still pending/in progress).
 * 
 * This allows cleaners to access passwords and checklists for overdue tasks
 * that still need to be completed.
 */
export function useCheckoutDayVerification(schedule: Schedule): boolean {
  return useMemo(() => {
    const checkoutTime = schedule.checkOut instanceof Date 
      ? schedule.checkOut 
      : new Date(schedule.checkOut);

    const now = new Date();

    // Get current date in São Paulo timezone
    const todaySP = formatInTimeZone(now, TIMEZONE, 'yyyy-MM-dd');
    const checkoutDateSP = formatInTimeZone(checkoutTime, TIMEZONE, 'yyyy-MM-dd');

    // Return true if:
    // 1. Today IS the checkout day, OR
    // 2. Checkout date has PASSED and task is still pending/in-progress (overdue task)
    const isToday = todaySP === checkoutDateSP;
    const isOverdue = todaySP > checkoutDateSP && 
                      (schedule.status === 'waiting' || schedule.status === 'released' || schedule.status === 'cleaning');

    return isToday || isOverdue;
  }, [schedule.checkOut, schedule.status]);
}
