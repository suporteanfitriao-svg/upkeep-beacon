import { useMemo } from 'react';
import { Schedule } from '@/types/scheduling';
import { formatInTimeZone } from 'date-fns-tz';

const TIMEZONE = 'America/Sao_Paulo';

/**
 * Hook to verify if today is the checkout day for a schedule.
 * Used to control visibility of sensitive information like door passwords.
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

    return todaySP === checkoutDateSP;
  }, [schedule.checkOut]);
}
