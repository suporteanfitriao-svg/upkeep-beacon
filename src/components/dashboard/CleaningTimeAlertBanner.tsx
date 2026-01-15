import { AlertTriangle, Clock, ChevronRight, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CleaningTimeAlert } from '@/hooks/useCleaningTimeAlert';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CleaningTimeAlertBannerProps {
  alerts: CleaningTimeAlert[];
  onAlertClick?: (scheduleId: string) => void;
  variant?: 'admin' | 'mobile';
}

export function CleaningTimeAlertBanner({ 
  alerts, 
  onAlertClick,
  variant = 'admin' 
}: CleaningTimeAlertBannerProps) {
  if (alerts.length === 0) return null;

  const formatMinutes = (minutes: number) => {
    if (minutes < 0) {
      const absMinutes = Math.abs(minutes);
      if (absMinutes >= 60) {
        const hours = Math.floor(absMinutes / 60);
        const mins = absMinutes % 60;
        return `${hours}h${mins > 0 ? ` ${mins}min` : ''} de atraso`;
      }
      return `${absMinutes}min de atraso`;
    }
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h${mins > 0 ? ` ${mins}min` : ''} restantes`;
    }
    return `${minutes}min restantes`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h${mins > 0 ? `${mins}min` : ''}`;
    }
    return `${minutes}min`;
  };

  if (variant === 'mobile') {
    return (
      <div className="space-y-3">
        {alerts.map((alert) => (
          <button
            key={alert.schedule.id}
            onClick={() => onAlertClick?.(alert.schedule.id)}
            className={cn(
              "w-full rounded-2xl p-4 text-left transition-all active:scale-[0.98]",
              alert.type === 'exceeding' 
                ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30" 
                : "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30"
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
                alert.type === 'exceeding' ? "bg-white/20" : "bg-white/20"
              )}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm">
                    {alert.type === 'exceeding' ? 'TEMPO EXCEDIDO' : 'ATENÇÃO'}
                  </span>
                </div>
                
                <h4 className="font-semibold text-base truncate">
                  {alert.schedule.propertyName}
                </h4>
                
                <div className="flex items-center gap-4 mt-2 text-xs opacity-90">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Check-in: {format(alert.checkInTime, 'HH:mm')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Timer className="h-3.5 w-3.5" />
                    <span>Limpando há {formatDuration(alert.cleaningDuration)}</span>
                  </div>
                </div>
                
                <div className="mt-2 font-bold text-sm">
                  {formatMinutes(alert.minutesRemaining)}
                </div>
              </div>
              
              <ChevronRight className="h-5 w-5 opacity-70 flex-shrink-0" />
            </div>
          </button>
        ))}
      </div>
    );
  }

  // Admin variant
  return (
    <div className="mb-6 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-rose-600 dark:text-rose-400">
        <AlertTriangle className="h-4 w-4" />
        <span>ALERTAS DE TEMPO ({alerts.length})</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {alerts.map((alert) => (
          <button
            key={alert.schedule.id}
            onClick={() => onAlertClick?.(alert.schedule.id)}
            className={cn(
              "rounded-2xl p-4 text-left transition-all hover:-translate-y-1 border",
              alert.type === 'exceeding' 
                ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" 
                : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                    alert.type === 'exceeding' 
                      ? "bg-red-500 text-white" 
                      : "bg-amber-500 text-white"
                  )}>
                    <AlertTriangle className="h-3 w-3" />
                    {alert.type === 'exceeding' ? 'Excedido' : 'Em risco'}
                  </span>
                </div>
                
                <h4 className="font-bold text-foreground truncate text-sm">
                  {alert.schedule.propertyName}
                </h4>
                
                <p className="text-xs text-muted-foreground mt-1">
                  Responsável: {alert.schedule.cleanerName || 'Não atribuído'}
                </p>
                
                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Check-in às {format(alert.checkInTime, 'HH:mm')}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Timer className="h-3.5 w-3.5" />
                    <span>{formatDuration(alert.cleaningDuration)} de limpeza</span>
                  </div>
                </div>
              </div>
              
              <div className={cn(
                "flex-shrink-0 flex flex-col items-end",
                alert.type === 'exceeding' ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
              )}>
                <span className="text-lg font-bold">
                  {alert.minutesRemaining < 0 ? '+' : ''}{Math.abs(alert.minutesRemaining)}
                </span>
                <span className="text-[10px] uppercase font-medium">
                  {alert.minutesRemaining < 0 ? 'min atraso' : 'min restantes'}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
