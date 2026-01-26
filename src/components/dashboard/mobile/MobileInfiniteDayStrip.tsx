import { memo, useRef, useEffect, useCallback, useState } from 'react';
import { format, isSameDay, startOfDay, addDays, subDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface DayIndicators {
  pending: number;
  completed: number;
  gold: number;
  inspections: number;
}

interface MobileInfiniteDayStripProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  dayIndicators: Record<string, DayIndicators>;
}

const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

// Generate days around a center date
const generateDays = (centerDate: Date, range: number = 30): Date[] => {
  const days: Date[] = [];
  for (let i = -range; i <= range; i++) {
    days.push(addDays(centerDate, i));
  }
  return days;
};

export const MobileInfiniteDayStrip = memo(function MobileInfiniteDayStrip({
  selectedDate,
  onDateSelect,
  dayIndicators
}: MobileInfiniteDayStripProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [days, setDays] = useState<Date[]>(() => generateDays(new Date(), 30));
  const [isScrolling, setIsScrolling] = useState(false);
  const itemWidthRef = useRef(72 + 12); // width + gap

  // Scroll to selected date on mount and when selected date changes
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const selectedIndex = days.findIndex(d => isSameDay(d, selectedDate));
    if (selectedIndex !== -1) {
      const scrollPosition = selectedIndex * itemWidthRef.current - container.clientWidth / 2 + itemWidthRef.current / 2;
      container.scrollTo({ left: scrollPosition, behavior: 'smooth' });
    }
  }, [selectedDate, days]);

  // Handle scroll to detect when we need to load more days
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || isScrolling) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    const scrollEnd = scrollWidth - clientWidth;

    // Load more days at the end
    if (scrollLeft > scrollEnd - 200) {
      setIsScrolling(true);
      const lastDay = days[days.length - 1];
      const newDays = Array.from({ length: 15 }, (_, i) => addDays(lastDay, i + 1));
      setDays(prev => [...prev, ...newDays]);
      setTimeout(() => setIsScrolling(false), 100);
    }

    // Load more days at the beginning
    if (scrollLeft < 200) {
      setIsScrolling(true);
      const firstDay = days[0];
      const newDays = Array.from({ length: 15 }, (_, i) => subDays(firstDay, 15 - i));
      setDays(prev => [...newDays, ...prev]);
      
      // Adjust scroll position to maintain visual position
      requestAnimationFrame(() => {
        if (container) {
          container.scrollLeft += 15 * itemWidthRef.current;
        }
        setTimeout(() => setIsScrolling(false), 100);
      });
    }
  }, [days, isScrolling]);

  const handleDayClick = useCallback((day: Date) => {
    onDateSelect(day);
  }, [onDateSelect]);

  return (
    <section className="mt-2 w-full">
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex w-full snap-x gap-3 overflow-x-auto px-4 py-3 hide-scrollbar scroll-smooth"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {days.map((day, index) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          const indicators = dayIndicators[dateKey] || { pending: 0, completed: 0, gold: 0, inspections: 0 };
          const totalTasks = indicators.pending + indicators.completed + indicators.gold + indicators.inspections;
          const isPast = day < startOfDay(new Date()) && !isToday;
          const dayOfWeek = day.getDay();

          return (
            <button
              key={`${dateKey}-${index}`}
              onClick={() => handleDayClick(day)}
            className={cn(
              "group flex h-[5.5rem] min-w-[4.5rem] snap-start flex-col items-center justify-center gap-1.5 rounded-2xl transition-all active:scale-95",
              isSelected
                ? "bg-primary shadow-glow ring-2 ring-primary ring-offset-2 ring-offset-stone-50 dark:ring-offset-[#22252a]"
                : isToday
                  ? "bg-gradient-to-b from-primary/15 to-primary/5 dark:from-primary/25 dark:to-primary/10 shadow-md border-2 border-primary ring-1 ring-primary/20"
                  : "bg-white dark:bg-[#2d3138] shadow-sm border border-slate-200 dark:border-slate-700"
            )}
            >
              <span className={cn(
                "text-[10px] font-semibold uppercase tracking-wide",
                isSelected ? "text-white/90 font-bold" : isToday ? "text-primary font-bold" : "text-[#8A8B88]"
              )}>
                {isToday && !isSelected ? 'HOJE' : dayNames[dayOfWeek]}
              </span>
              <span className={cn(
                "font-bold",
                isSelected ? "text-2xl text-white font-extrabold" : isToday ? "text-xl text-primary font-extrabold" : "text-lg text-slate-900 dark:text-white",
                isPast && !isSelected && !isToday && "text-[#8A8B88]"
              )}>
                {format(day, 'd')}
              </span>
              <span className={cn(
                "text-[9px] font-medium",
                isSelected ? "text-white/80" : isToday ? "text-primary/80" : "text-[#8A8B88]"
              )}>
                {format(day, 'MMM').toUpperCase()}
              </span>
              {/* Task indicators */}
              <div className="flex gap-1 h-2">
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
