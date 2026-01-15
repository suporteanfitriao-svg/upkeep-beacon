import { memo } from 'react';
import { Play, Clock, ClipboardCheck, CheckCircle2, Loader2 } from 'lucide-react';
import { CleanerInspection } from '@/hooks/useCleanerInspections';
import { toast } from 'sonner';

interface MobileInspectionCardProps {
  inspection: CleanerInspection;
  variant: 'scheduled' | 'inProgress';
  onUpdateStatus: (id: string, status: 'in_progress' | 'completed') => Promise<boolean>;
  isLoading?: boolean;
}

export const MobileInspectionCard = memo(function MobileInspectionCard({
  inspection,
  variant,
  onUpdateStatus,
  isLoading
}: MobileInspectionCardProps) {
  const isScheduled = variant === 'scheduled';

  const handleAction = async () => {
    const newStatus = isScheduled ? 'in_progress' : 'completed';
    const success = await onUpdateStatus(inspection.id, newStatus);
    if (success) {
      toast.success(isScheduled ? 'Inspeção iniciada!' : 'Inspeção concluída!');
    } else {
      toast.error(isScheduled ? 'Erro ao iniciar inspeção' : 'Erro ao concluir inspeção');
    }
  };

  return (
    <div 
      className="overflow-hidden rounded-2xl bg-white dark:bg-[#2d3138] shadow-soft transition-all hover:shadow-md border-2 border-purple-300 dark:border-purple-700"
    >
      <div className="flex flex-row p-4 gap-4">
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="mb-1 flex items-center gap-1.5">
              <span className="inline-flex h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                {isScheduled ? 'Inspeção' : 'Inspeção em Andamento'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mb-2">{inspection.property_name}</h3>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A8B88] mb-0.5">
                {isScheduled ? 'Agendado para' : 'Iniciado'}
              </span>
              <div className="flex items-center gap-1 text-[#8A8B88]">
                <Clock className="w-4 h-4" />
                <p className="text-sm font-bold">
                  {inspection.scheduled_time ? inspection.scheduled_time.slice(0, 5) : 'A definir'}
                </p>
              </div>
            </div>
          </div>
          <button 
            onClick={handleAction}
            disabled={isLoading}
            className="mt-4 flex w-fit items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-purple-700 active:bg-purple-700 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isScheduled ? (
              <Play className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
            {isLoading ? 'Carregando...' : isScheduled ? 'Iniciar Inspeção' : 'Finalizar Inspeção'}
          </button>
        </div>
        {inspection.property_image_url ? (
          <img 
            src={inspection.property_image_url} 
            alt={inspection.property_name}
            className="w-28 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="w-28 shrink-0 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <ClipboardCheck className="w-8 h-8 text-purple-500" />
          </div>
        )}
      </div>
    </div>
  );
});
