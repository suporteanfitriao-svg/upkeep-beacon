import { format, isAfter, startOfDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarCheck, Sparkles, ArrowRight, Calendar } from 'lucide-react';
import { Schedule } from '@/types/scheduling';
import { DateFilter } from './AdminFilters';

interface UpcomingSchedulesProps {
  schedules: Schedule[];
  onGoToDate: (date: Date) => void;
}

export const UpcomingSchedules = ({ schedules, onGoToDate }: UpcomingSchedulesProps) => {
  // Get future schedules (after today), sorted by checkout date
  const tomorrow = startOfDay(addDays(new Date(), 1));
  
  const upcomingSchedules = schedules
    .filter(schedule => isAfter(startOfDay(schedule.checkOut), startOfDay(new Date())))
    .sort((a, b) => a.checkOut.getTime() - b.checkOut.getTime())
    .slice(0, 6); // Show max 6 upcoming schedules

  if (upcomingSchedules.length === 0) {
    return null;
  }

  const getScheduleIcon = (status: string) => {
    switch (status) {
      case 'released':
        return <Sparkles className="h-5 w-5" />;
      case 'cleaning':
        return <CalendarCheck className="h-5 w-5" />;
      default:
        return <Calendar className="h-5 w-5" />;
    }
  };

  const getIconColors = (status: string) => {
    switch (status) {
      case 'released':
        return 'bg-primary/10 text-primary';
      case 'cleaning':
        return 'bg-amber-50 dark:bg-amber-900/20 text-amber-500';
      case 'completed':
        return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500';
      default:
        return 'bg-slate-100 dark:bg-slate-700 text-slate-500';
    }
  };

  const getDateColor = (status: string) => {
    switch (status) {
      case 'released':
        return 'text-primary';
      case 'cleaning':
        return 'text-amber-500';
      case 'completed':
        return 'text-emerald-500';
      default:
        return 'text-slate-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'released':
        return 'Liberado para limpeza';
      case 'cleaning':
        return 'Em limpeza';
      case 'waiting':
        return 'Aguardando liberação';
      case 'completed':
        return 'Finalizado';
      default:
        return 'Agendado';
    }
  };

  return (
    <div className="w-full border-t border-slate-100 dark:border-slate-700 pt-10 mt-6">
      <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-6 text-left">
        Próximos agendamentos <span className="text-primary">({upcomingSchedules.length})</span>
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {upcomingSchedules.map((schedule) => (
          <div
            key={schedule.id}
            className="bg-card/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-5 flex flex-col text-left opacity-70 hover:opacity-100 transition-opacity group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getIconColors(schedule.status)}`}>
                  {getScheduleIcon(schedule.status)}
                </div>
                <div>
                  <h5 className="font-bold text-slate-700 dark:text-white text-sm line-clamp-1">
                    {schedule.propertyName}
                  </h5>
                  <p className="text-xs text-muted-foreground">
                    {getStatusLabel(schedule.status)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-[10px] font-bold uppercase ${getDateColor(schedule.status)}`}>
                  {format(schedule.checkOut, "dd MMM", { locale: ptBR })}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => onGoToDate(schedule.checkOut)}
              className="mt-2 w-full py-2 bg-slate-50 dark:bg-slate-700/50 hover:bg-primary hover:text-white dark:hover:bg-primary rounded-xl text-slate-600 dark:text-slate-300 text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              Ir para a data
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
