import { useState, useEffect, useMemo, useCallback } from 'react';
import { Schedule } from '@/types/scheduling';
import { differenceInMinutes, isAfter } from 'date-fns';
import { getEffectiveCheckIn } from '@/lib/scheduling/effectiveTimes';

export interface CleaningDelayInfo {
  isDelayed: boolean;
  delayMinutes: number;
  formattedDelay: string;
  canBeDelayed: boolean; // true if checkout has passed
}

/**
 * Regra de Atraso de Limpeza:
 * 
 * 1. A análise é feita usando hora local
 * 2. O início da contagem de atraso começa a partir do horário de checkout
 * 3. Antes do checkout, não existe atraso (canBeDelayed = false)
 * 4. Se a limpeza não foi finalizada e o horário atual ultrapassou o check-in, está em atraso
 * 
 * Regra de ouro:
 * - Passou do checkout → pode atrasar (canBeDelayed = true)
 * - Passou do próximo check-in → está em atraso (isDelayed = true)
 */

function formatDelayTime(minutes: number): string {
  if (minutes <= 0) return '';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }
  return `${mins}min`;
}

export function calculateCleaningDelay(schedule: Schedule, now: Date = new Date()): CleaningDelayInfo {
  // Se já está finalizado, não há atraso ativo
  if (schedule.status === 'completed') {
    return {
      isDelayed: false,
      delayMinutes: 0,
      formattedDelay: '',
      canBeDelayed: false,
    };
  }

  const checkOutTime = schedule.checkOut instanceof Date ? schedule.checkOut : new Date(schedule.checkOut);
  const effectiveCheckIn = getEffectiveCheckIn(schedule);

  // Antes do checkout, não existe atraso
  const canBeDelayed = isAfter(now, checkOutTime);
  
  if (!canBeDelayed) {
    return {
      isDelayed: false,
      delayMinutes: 0,
      formattedDelay: '',
      canBeDelayed: false,
    };
  }

  // Se passou do check-in efetivo, está em atraso
  const isDelayed = isAfter(now, effectiveCheckIn);
  
  if (!isDelayed) {
    return {
      isDelayed: false,
      delayMinutes: 0,
      formattedDelay: '',
      canBeDelayed: true,
    };
  }

  // Calcular minutos de atraso: tempo atual - horário do check-in efetivo
  const delayMinutes = differenceInMinutes(now, effectiveCheckIn);
  
  return {
    isDelayed: true,
    delayMinutes,
    formattedDelay: formatDelayTime(delayMinutes),
    canBeDelayed: true,
  };
}


/**
 * Hook que calcula e atualiza o atraso de uma limpeza em tempo real
 * Atualiza automaticamente a cada minuto enquanto o componente está visível
 */
export function useCleaningDelay(schedule: Schedule): CleaningDelayInfo {
  const [now, setNow] = useState(() => new Date());

  // Atualizar a cada minuto
  useEffect(() => {
    // Se já está finalizado, não precisa atualizar
    if (schedule.status === 'completed') return;

    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000); // 1 minuto

    return () => clearInterval(interval);
  }, [schedule.status]);

  // Recalcular quando o schedule ou o tempo atual mudar
  const delayInfo = useMemo(() => {
    return calculateCleaningDelay(schedule, now);
  }, [schedule, now]);

  return delayInfo;
}
