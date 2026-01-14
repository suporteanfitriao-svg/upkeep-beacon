import { useState, useEffect, useMemo } from 'react';
import { Schedule } from '@/types/scheduling';
import { formatInTimeZone } from 'date-fns-tz';

const TIMEZONE = 'America/Sao_Paulo';

export interface ReleaseCountdownInfo {
  isOverdue: boolean;
  overdueMinutes: number;
  countdownMinutes: number;
  countdownLabel: string;
  overdueLabel: string;
}

/**
 * Hook to calculate countdown to release time and detect overdue releases.
 * Only applies to 'waiting' status schedules.
 */
export function useReleaseCountdown(schedule: Schedule): ReleaseCountdownInfo | null {
  const [now, setNow] = useState(new Date());

  // Update every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    // Only applies to 'waiting' status
    if (schedule.status !== 'waiting') {
      return null;
    }

    const checkoutTime = schedule.checkOut instanceof Date 
      ? schedule.checkOut 
      : new Date(schedule.checkOut);

    // Get current time in São Paulo timezone
    const nowInSP = new Date(formatInTimeZone(now, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss"));
    const checkoutInSP = new Date(formatInTimeZone(checkoutTime, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss"));

    // Check if checkout is today
    const todaySP = formatInTimeZone(now, TIMEZONE, 'yyyy-MM-dd');
    const checkoutDateSP = formatInTimeZone(checkoutTime, TIMEZONE, 'yyyy-MM-dd');
    const isCheckoutToday = todaySP === checkoutDateSP;

    if (!isCheckoutToday) {
      return null;
    }

    const diffMs = checkoutInSP.getTime() - nowInSP.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 0) {
      // Overdue
      const overdueMinutes = Math.abs(diffMinutes);
      const hours = Math.floor(overdueMinutes / 60);
      const mins = overdueMinutes % 60;
      
      return {
        isOverdue: true,
        overdueMinutes,
        countdownMinutes: 0,
        countdownLabel: '',
        overdueLabel: hours > 0 ? `${hours}h ${mins}min atrasado` : `${mins}min atrasado`,
      };
    }

    // Countdown
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;

    return {
      isOverdue: false,
      overdueMinutes: 0,
      countdownMinutes: diffMinutes,
      countdownLabel: hours > 0 ? `${hours}h ${mins}min` : `${mins}min`,
      overdueLabel: '',
    };
  }, [schedule.status, schedule.checkOut, now]);
}
