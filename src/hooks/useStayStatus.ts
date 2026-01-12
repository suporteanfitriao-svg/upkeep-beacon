import { useMemo } from 'react';
import { Schedule } from '@/types/scheduling';
import { formatInTimeZone } from 'date-fns-tz';
import { parseISO, isToday, isBefore, isAfter, subHours } from 'date-fns';

export type StayStatusType = 'stay_ending' | 'near_release' | 'stay_in_progress' | null;

export interface StayStatusInfo {
  type: StayStatusType;
  label: string;
  description: string;
  colorClass: string;
  bgClass: string;
}

const TIMEZONE = 'America/Sao_Paulo';

/**
 * Calculates the stay status indicator for a schedule card.
 * 
 * Priority order:
 * 1. Estadia no fim (stay_ending) - checkout passed today, cleaning not started
 * 2. Próximo da liberação (near_release) - 1 hour before checkout
 * 3. Estadia em andamento (stay_in_progress) - before checkout within reservation period
 * 
 * Rules:
 * - These are informational only - they don't change status or release cleaning
 * - Based on local time (America/Sao_Paulo)
 * - Checkout time priority: schedule.checkOut (which should already have override applied)
 */
export function useStayStatus(schedule: Schedule): StayStatusInfo | null {
  return useMemo(() => {
    // Only applies to 'waiting' status - once released/cleaning/completed, these don't apply
    if (schedule.status !== 'waiting') {
      return null;
    }

    const now = new Date();
    const checkoutTime = schedule.checkOut instanceof Date 
      ? schedule.checkOut 
      : new Date(schedule.checkOut);
    
    const checkInTime = schedule.checkIn instanceof Date
      ? schedule.checkIn
      : new Date(schedule.checkIn);

    // Get current time in São Paulo timezone for comparison
    const nowInSP = new Date(formatInTimeZone(now, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss"));
    const checkoutInSP = new Date(formatInTimeZone(checkoutTime, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss"));
    const checkInInSP = new Date(formatInTimeZone(checkInTime, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss"));

    // Check if checkout is today (in São Paulo timezone)
    const todaySP = formatInTimeZone(now, TIMEZONE, 'yyyy-MM-dd');
    const checkoutDateSP = formatInTimeZone(checkoutTime, TIMEZONE, 'yyyy-MM-dd');
    const isCheckoutToday = todaySP === checkoutDateSP;

    // 1 hour before checkout
    const oneHourBeforeCheckout = subHours(checkoutInSP, 1);

    // Priority 1: Estadia no fim
    // current_date = checkout_date AND current_time >= checkout_time AND cleaning not started
    if (isCheckoutToday && nowInSP >= checkoutInSP) {
      return {
        type: 'stay_ending',
        label: 'ESTADIA NO FIM',
        description: 'Checkout passou, aguardando liberação',
        colorClass: 'text-amber-600 dark:text-amber-400',
        bgClass: 'bg-amber-100 dark:bg-amber-900/30',
      };
    }

    // Priority 2: Próximo da liberação
    // current_time >= (checkout_time - 1 hour) AND current_time < checkout_time AND checkout is today
    if (isCheckoutToday && nowInSP >= oneHourBeforeCheckout && nowInSP < checkoutInSP) {
      return {
        type: 'near_release',
        label: 'PRÓXIMO DA LIBERAÇÃO',
        description: 'Checkout em menos de 1 hora',
        colorClass: 'text-blue-600 dark:text-blue-400',
        bgClass: 'bg-blue-100 dark:bg-blue-900/30',
      };
    }

    // Priority 3: Estadia em andamento
    // current_time < checkout_time AND current date is within reservation period
    const isWithinReservation = nowInSP >= checkInInSP && nowInSP < checkoutInSP;
    if (isWithinReservation) {
      return {
        type: 'stay_in_progress',
        label: 'ESTADIA EM ANDAMENTO',
        description: 'Hóspede ainda no imóvel',
        colorClass: 'text-slate-600 dark:text-slate-400',
        bgClass: 'bg-slate-100 dark:bg-slate-800/50',
      };
    }

    return null;
  }, [schedule.status, schedule.checkOut, schedule.checkIn]);
}
