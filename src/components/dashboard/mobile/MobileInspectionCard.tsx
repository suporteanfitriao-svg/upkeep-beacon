import { memo } from 'react';
import { Clock, ClipboardCheck, Play, Eye, CheckCircle2 } from 'lucide-react';
import { CleanerInspection } from '@/hooks/useCleanerInspections';
import { cn } from '@/lib/utils';

interface MobileInspectionCardProps {
  inspection: CleanerInspection;
  variant: 'scheduled' | 'inProgress' | 'completed';
  onOpenDetail: (inspection: CleanerInspection) => void;
}

export const MobileInspectionCard = memo(function MobileInspectionCard({
  inspection,
  variant,
  onOpenDetail
}: MobileInspectionCardProps) {
  const isScheduled = variant === 'scheduled';
  const isCompleted = variant === 'completed';

  return (
    <div 
      onClick={() => onOpenDetail(inspection)}
      className={cn(
        "overflow-hidden rounded-2xl bg-white dark:bg-[#2d3138] shadow-soft transition-all hover:shadow-md active:scale-[0.98] border-2 cursor-pointer",
        isCompleted 
          ? "border-slate-200 dark:border-slate-700 opacity-60" 
          : "border-purple-300 dark:border-purple-700"
      )}
    >
      <div className="flex flex-row p-4 gap-4">
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="mb-1 flex items-center gap-1.5">
              {isCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <span className="inline-flex h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
              )}
              <span className={cn(
                "text-xs font-bold uppercase tracking-wider",
                isCompleted 
                  ? "text-emerald-600 dark:text-emerald-400" 
                  : "text-purple-600 dark:text-purple-400"
              )}>
                {isCompleted ? 'Inspeção Concluída' : isScheduled ? 'Inspeção' : 'Inspeção em Andamento'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mb-2">{inspection.property_name}</h3>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8B88] mb-0.5">
                {isCompleted ? 'Concluída' : isScheduled ? 'Agendado para' : 'Iniciado'}
              </span>
              <div className="flex items-center gap-1 text-[#8A8B88]">
                <Clock className="w-4 h-4" />
                <p className="text-sm font-bold">
                  {inspection.scheduled_time ? inspection.scheduled_time.slice(0, 5) : 'A definir'}
                </p>
              </div>
            </div>
          </div>
          {!isCompleted && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetail(inspection);
              }}
              className="mt-4 flex w-fit items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-purple-700 active:bg-purple-700"
            >
              {isScheduled ? (
                <>
                  <Play className="w-5 h-5" />
                  Iniciar Inspeção
                </>
              ) : (
                <>
                  <Eye className="w-5 h-5" />
                  Ver Detalhes
                </>
              )}
            </button>
          )}
          {isCompleted && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetail(inspection);
              }}
              className="mt-4 flex w-fit items-center gap-2 rounded-lg bg-slate-200 dark:bg-slate-700 px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-300 dark:hover:bg-slate-600"
            >
              <Eye className="w-5 h-5" />
              Ver Detalhes
            </button>
          )}
        </div>
        {inspection.property_image_url ? (
          <img 
            src={inspection.property_image_url} 
            alt={inspection.property_name}
            className="w-28 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className={cn(
            "w-28 shrink-0 rounded-xl flex items-center justify-center",
            isCompleted 
              ? "bg-slate-100 dark:bg-slate-800" 
              : "bg-purple-100 dark:bg-purple-900/30"
          )}>
            <ClipboardCheck className={cn(
              "w-8 h-8",
              isCompleted ? "text-slate-400" : "text-purple-500"
            )} />
          </div>
        )}
      </div>
    </div>
  );
});