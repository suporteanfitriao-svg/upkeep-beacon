import { format, parseISO, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ClipboardCheck, Calendar, Clock, Building2, User, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AdminInspection } from '@/hooks/useAdminInspections';

interface AdminInspectionsSectionProps {
  inspections: AdminInspection[];
  loading: boolean;
}

export function AdminInspectionsSection({ inspections, loading }: AdminInspectionsSectionProps) {
  const navigate = useNavigate();

  if (loading) {
    return null;
  }

  if (inspections.length === 0) {
    return null;
  }

  // Group by status
  const scheduled = inspections.filter(i => i.status === 'scheduled');
  const inProgress = inspections.filter(i => i.status === 'in_progress');

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-purple-600" />
          Inspeções
          <Badge variant="outline" className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 ml-2">
            {inspections.length}
          </Badge>
        </h3>
        <button
          onClick={() => navigate('/inspecoes')}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          Ver todas
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {inspections.slice(0, 6).map(inspection => {
          const isScheduled = inspection.status === 'scheduled';
          const isInProgress = inspection.status === 'in_progress';
          const scheduledDate = parseISO(inspection.scheduled_date);
          const isTodayInspection = isToday(scheduledDate);
          const completedItems = inspection.checklist_state.filter(i => i.checked).length;
          const totalItems = inspection.checklist_state.length;

          return (
            <div
              key={inspection.id}
              onClick={() => navigate(`/inspecoes?inspection=${inspection.id}`)}
              className={cn(
                "bg-card rounded-2xl border-2 p-4 cursor-pointer transition-all hover:shadow-lg",
                "border-purple-300 dark:border-purple-700"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "h-10 w-10 shrink-0 rounded-xl flex items-center justify-center",
                  isScheduled && "bg-blue-100 dark:bg-blue-900/30",
                  isInProgress && "bg-yellow-100 dark:bg-yellow-900/30"
                )}>
                  <ClipboardCheck className={cn(
                    "w-5 h-5",
                    isScheduled && "text-blue-600",
                    isInProgress && "text-yellow-600"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline" className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 text-[10px] font-bold uppercase tracking-wide">
                      Inspeção
                    </Badge>
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-bold",
                      isScheduled && "bg-blue-100 dark:bg-blue-900/30 text-blue-700",
                      isInProgress && "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700"
                    )}>
                      {isScheduled ? 'Agendada' : 'Em Andamento'}
                    </span>
                    {isTodayInspection && (
                      <span className="rounded-full px-2 py-0.5 text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700">
                        Hoje
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-foreground truncate">{inspection.title}</h4>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    {inspection.property_name}
                  </p>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(scheduledDate, "dd/MM", { locale: ptBR })}
                  </span>
                  {inspection.scheduled_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {inspection.scheduled_time.slice(0, 5)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {inspection.assigned_to_name && (
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {inspection.assigned_to_name.split(' ')[0]}
                    </span>
                  )}
                  {totalItems > 0 && (
                    <span className="font-medium">
                      {completedItems}/{totalItems}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
