import { useMemo } from 'react';
import { Schedule } from '@/types/scheduling';
import { differenceInMinutes, isAfter, addMinutes } from 'date-fns';
import { getEffectiveCheckIn } from '@/lib/scheduling/effectiveTimes';

export interface CleaningTimeAlert {
  schedule: Schedule;
  type: 'exceeding' | 'at_risk';
  minutesRemaining: number;
  checkInTime: Date;
  estimatedEndTime: Date | null;
  cleaningDuration: number; // minutes since start
}

/**
 * Check if a schedule was completed with delay (after check-in time)
 */
export function wasCompletedWithDelay(schedule: Schedule): boolean {
  if (schedule.status !== 'completed' || !schedule.endAt) return false;
  
  const endTime = schedule.endAt instanceof Date ? schedule.endAt : new Date(schedule.endAt);
  const checkInTime = getEffectiveCheckIn(schedule);
  
  return isAfter(endTime, checkInTime);
}

/**
 * Calculate delay in minutes for a completed schedule
 */
export function getDelayMinutes(schedule: Schedule): number {
  if (!schedule.endAt) return 0;
  
  const endTime = schedule.endAt instanceof Date ? schedule.endAt : new Date(schedule.endAt);
  const checkInTime = getEffectiveCheckIn(schedule);
  
  if (isAfter(endTime, checkInTime)) {
    return differenceInMinutes(endTime, checkInTime);
  }
  return 0;
}

/**
 * Check if a cleaning is currently exceeding or at risk of exceeding check-in time
 */
export function isCleaningDelayed(schedule: Schedule): { isDelayed: boolean; minutesDelayed: number } {
  if (schedule.status !== 'cleaning' || !schedule.startAt) {
    return { isDelayed: false, minutesDelayed: 0 };
  }

  const now = new Date();
  const checkInTime = getEffectiveCheckIn(schedule);
  
  if (isAfter(now, checkInTime)) {
    return { 
      isDelayed: true, 
      minutesDelayed: differenceInMinutes(now, checkInTime) 
    };
  }
  
  return { isDelayed: false, minutesDelayed: 0 };
}

/**
 * Hook to detect cleanings that are at risk of exceeding check-in time
 * - 'exceeding': Cleaning has already exceeded check-in time
 * - 'at_risk': Cleaning is in progress and estimated to exceed check-in time (< 30 min remaining)
 * 
 * IMPORTANT: minutesRemaining represents time until check-in (negative = exceeded)
 * This is calculated as: checkInTime - now
 */
export function useCleaningTimeAlerts(schedules: Schedule[]): CleaningTimeAlert[] {
  return useMemo(() => {
    const now = new Date();
    const alerts: CleaningTimeAlert[] = [];

    // Filter only schedules that are currently being cleaned
    const cleaningSchedules = schedules.filter(s => s.status === 'cleaning' && s.startAt);

    for (const schedule of cleaningSchedules) {
      if (!schedule.startAt) continue;

      const startTime = schedule.startAt instanceof Date 
        ? schedule.startAt 
        : new Date(schedule.startAt);

      const checkInTime = getEffectiveCheckIn(schedule);

      // Duration since cleaning started (always positive)
      const cleaningDuration = differenceInMinutes(now, startTime);
      
      // Time remaining until check-in (negative if exceeded)
      // This is the key calculation: checkIn - now
      const minutesUntilCheckIn = differenceInMinutes(checkInTime, now);
      
      const estimatedDuration = schedule.estimatedDuration || 90; // default 90 min
      const estimatedEndTime = addMinutes(startTime, estimatedDuration);

      // Check if already exceeding check-in time (now > checkIn)
      if (isAfter(now, checkInTime)) {
        // minutesUntilCheckIn will be negative here
        alerts.push({
          schedule,
          type: 'exceeding',
          minutesRemaining: minutesUntilCheckIn, // negative value = exceeded
          checkInTime,
          estimatedEndTime,
          cleaningDuration,
        });
      } 
      // Check if at risk (less than 30 min remaining and cleaning started)
      else if (minutesUntilCheckIn <= 30 && cleaningDuration > 0) {
        alerts.push({
          schedule,
          type: 'at_risk',
          minutesRemaining: minutesUntilCheckIn,
          checkInTime,
          estimatedEndTime,
          cleaningDuration,
        });
      }
      // Check if estimated end time exceeds check-in time
      else if (isAfter(estimatedEndTime, checkInTime)) {
        alerts.push({
          schedule,
          type: 'at_risk',
          minutesRemaining: minutesUntilCheckIn,
          checkInTime,
          estimatedEndTime,
          cleaningDuration,
        });
      }
    }

    // Sort by urgency (exceeding first, then by minutes remaining)
    return alerts.sort((a, b) => {
      if (a.type === 'exceeding' && b.type !== 'exceeding') return -1;
      if (a.type !== 'exceeding' && b.type === 'exceeding') return 1;
      return a.minutesRemaining - b.minutesRemaining;
    });
  }, [schedules]);
}
