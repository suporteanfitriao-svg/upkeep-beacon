import { memo } from 'react';
import { format, isSameDay, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface DayIndicators {
  pending: number;
  completed: number;
  gold: number;
  inspections: number;
}

interface MobileWeekStripProps {
  weekDays: Date[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  dayIndicators: Record<string, DayIndicators>;
}

const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

export const MobileWeekStrip = memo(function MobileWeekStrip({
  weekDays,
  selectedDate,
  onDateSelect,
  dayIndicators
}: MobileWeekStripProps) {
  return (
    <section className="mt-4 w-full">
      <div className="flex w-full snap-x gap-3 overflow-x-auto px-6 py-4 hide-scrollbar">
        {weekDays.map((day, index) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          const indicators = dayIndicators[dateKey] || { pending: 0, completed: 0, gold: 0, inspections: 0 };
          const totalTasks = indicators.pending + indicators.completed + indicators.gold + indicators.inspections;
          const isPast = day < startOfDay(new Date()) && !isToday;

          return (
            <button
              key={index}
              onClick={() => onDateSelect(day)}
            className={cn(
              "group flex h-24 min-w-[4.5rem] snap-start flex-col items-center justify-center gap-2 rounded-2xl transition-transform active:scale-95",
              isSelected
                ? "bg-primary shadow-glow ring-2 ring-primary ring-offset-2 ring-offset-stone-50 dark:ring-offset-[#22252a]"
                : isToday
                  ? "bg-gradient-to-b from-primary/15 to-primary/5 dark:from-primary/25 dark:to-primary/10 shadow-md border-2 border-primary ring-1 ring-primary/20"
                  : "bg-white dark:bg-[#2d3138] shadow-sm border border-slate-200 dark:border-slate-700"
            )}
            >
              <span className={cn(
                "text-xs font-semibold",
                isSelected ? "text-white/90 font-bold" : isToday ? "text-primary font-bold" : "text-[#8A8B88]"
              )}>
                {isToday && !isSelected ? 'HOJE' : dayNames[index]}
              </span>
              <span className={cn(
                "font-bold",
                isSelected ? "text-2xl text-white font-extrabold" : isToday ? "text-xl text-primary font-extrabold" : "text-lg text-slate-900 dark:text-white",
                isPast && !isSelected && !isToday && "text-[#8A8B88]"
              )}>
                {format(day, 'd')}
              </span>
              {/* Task indicators */}
              <div className="flex gap-1">
                {isSelected ? (
                  <>
                    {indicators.pending > 0 && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    {indicators.completed > 0 && <div className="h-1.5 w-1.5 rounded-full bg-white/50" />}
                    {indicators.gold > 0 && <div className="h-1.5 w-1.5 rounded-full bg-[#E0C051]" />}
                    {indicators.inspections > 0 && <div className="h-1.5 w-1.5 rounded-full bg-purple-300" />}
                  </>
                ) : (
                  <>
                    {indicators.pending > 0 && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    {indicators.completed > 0 && <div className="h-1.5 w-1.5 rounded-full bg-primary/50" />}
                    {indicators.gold > 0 && <div className="h-1.5 w-1.5 rounded-full bg-[#E0C051]" />}
                    {indicators.inspections > 0 && <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />}
                  </>
                )}
                {totalTasks === 0 && <div className="h-1.5 w-1.5" />}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
});
