import { startOfDay, isSameDay } from "date-fns";
import type { Schedule } from "@/types/scheduling";

/**
 * Retorna o "check-in efetivo" para regras de atraso/alertas:
 * - Se o check-in armazenado estiver em outro dia (ex.: reserva anterior),
 *   aplica a HORA/MINUTO do check-in no DIA do checkout (dia da limpeza).
 * - Sempre baseado em hora local (Date JS no client).
 */
export function getEffectiveCheckIn(schedule: Pick<Schedule, "checkIn" | "checkOut">): Date {
  const checkOutTime = schedule.checkOut instanceof Date ? schedule.checkOut : new Date(schedule.checkOut);
  const checkInTime = schedule.checkIn instanceof Date ? schedule.checkIn : new Date(schedule.checkIn);

  const checkOutDay = startOfDay(checkOutTime);
  const checkInDay = startOfDay(checkInTime);

  if (isSameDay(checkOutDay, checkInDay)) return checkInTime;

  const hours = checkInTime.getHours();
  const minutes = checkInTime.getMinutes();

  const effective = new Date(checkOutDay);
  effective.setHours(hours, minutes, 0, 0);
  return effective;
}
