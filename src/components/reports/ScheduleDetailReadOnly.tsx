import { Schedule, ChecklistItem, CategoryPhoto } from '@/types/scheduling';
import { cn } from '@/lib/utils';
import { format, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState, useMemo } from 'react';
import { PhotoGallery } from '@/components/shared/PhotoGallery';

interface ScheduleDetailReadOnlyProps {
  schedule: Schedule;
  onClose: () => void;
}

const statusConfig = {
  waiting: { label: 'Aguardando Liberação', badgeClass: 'bg-orange-100 text-orange-800' },
  released: { label: 'Liberado', badgeClass: 'bg-primary/10 text-primary' },
  cleaning: { label: 'Em Limpeza', badgeClass: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Finalizado', badgeClass: 'bg-emerald-100 text-emerald-800' },
};

function formatDuration(startAt: Date | undefined, endAt: Date | undefined): string {
  if (!startAt || !endAt) return '--';
  const minutes = differenceInMinutes(endAt, startAt);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}min`;
  }
  return `${mins}min`;
}

export function ScheduleDetailReadOnly({ schedule, onClose }: ScheduleDetailReadOnlyProps) {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  
  const statusStyle = statusConfig[schedule.status];
  const categoryPhotos = schedule.categoryPhotos || {};

  // Convert all category photos to gallery format
  const allPhotosForGallery = useMemo(() => {
    const photos: Array<{ url: string; timestamp?: string; uploaded_by?: string }> = [];
    Object.entries(categoryPhotos).forEach(([category, categoryPhotoList]) => {
      categoryPhotoList.forEach((photo) => {
        photos.push({
          url: photo.url,
          timestamp: photo.uploadedAt,
          uploaded_by: photo.uploadedBy,
        });
      });
    });
    return photos;
  }, [categoryPhotos]);
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Group checklist by category
  const groupedChecklist = useMemo(() => {
    return schedule.checklist.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, ChecklistItem[]>);
  }, [schedule.checklist]);

  const completedDate = schedule.endAt || schedule.checkOut;
  const duration = formatDuration(schedule.startAt, schedule.endAt);

  return (
    <div className="fixed inset-0 z-50 bg-stone-50 dark:bg-[#22252a] font-display text-slate-800 dark:text-slate-100 antialiased">
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden pb-8">
        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center bg-stone-50/90 dark:bg-[#22252a]/90 px-4 py-4 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
          <button 
            onClick={onClose}
            className="flex items-center justify-center rounded-full p-2 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 mr-2"
          >
            <span className="material-symbols-outlined text-slate-900 dark:text-white">arrow_back</span>
          </button>
          <div className="flex flex-col">
            <h2 className="text-lg font-bold leading-none tracking-tight text-slate-900 dark:text-white">{schedule.propertyName}</h2>
            <span className="text-xs font-medium text-muted-foreground">{schedule.propertyAddress}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2.5 py-0.5 text-xs font-medium">
              Somente Leitura
            </span>
            <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", statusStyle.badgeClass)}>
              {statusStyle.label}
            </span>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex flex-col gap-6 p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 80px)' }}>
          {/* Summary Info */}
          <section className="rounded-2xl bg-white dark:bg-[#2d3138] shadow-sm p-5 border border-slate-100 dark:border-slate-700">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">summarize</span>
              Resumo do Atendimento
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 border border-slate-100 dark:border-slate-700">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wide block mb-1">Data</span>
                <span className="text-sm font-bold">{format(completedDate, "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 border border-slate-100 dark:border-slate-700">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wide block mb-1">Duração</span>
                <span className="text-sm font-bold">{duration}</span>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 border border-slate-100 dark:border-slate-700">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wide block mb-1">Responsável</span>
                <span className="text-sm font-bold">{schedule.cleanerName || 'Não atribuído'}</span>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 border border-slate-100 dark:border-slate-700">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wide block mb-1">Avarias</span>
                <span className={cn("text-sm font-bold", schedule.maintenanceIssues.length > 0 ? "text-yellow-600" : "text-emerald-600")}>
                  {schedule.maintenanceIssues.length}
                </span>
              </div>
            </div>
          </section>

          {/* Checklist Section */}
          {schedule.checklist.length > 0 && (
            <section className="rounded-2xl bg-white dark:bg-[#2d3138] shadow-sm p-5 border border-slate-100 dark:border-slate-700">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">checklist</span>
                Checklist Preenchido
              </h3>
              <div className="space-y-3">
                {Object.keys(groupedChecklist).map((category) => {
                  const items = groupedChecklist[category];
                  const completedCount = items.filter(item => item.completed).length;
                  const isExpanded = expandedCategories[category] ?? false;
                  const photos = categoryPhotos[category] || [];

                  return (
                    <div key={category} className="rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                      {/* Category Header */}
                      <button
                        onClick={() => toggleCategory(category)}
                        className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-[18px]">
                            {isExpanded ? 'expand_less' : 'expand_more'}
                          </span>
                          <span className="font-semibold text-sm">{category}</span>
                          <span className="text-xs text-muted-foreground">
                            ({completedCount}/{items.length})
                          </span>
                          {photos.length > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600">
                              <span className="material-symbols-outlined text-[12px]">photo_camera</span>
                              {photos.length}
                            </span>
                          )}
                        </div>
                        {completedCount === items.length && (
                          <span className="material-symbols-outlined text-emerald-500 text-[18px]">check_circle</span>
                        )}
                      </button>

                      {/* Items */}
                      {isExpanded && (
                        <div className="p-3 space-y-2">
                          {items.map((item) => (
                            <div 
                              key={item.id} 
                              className={cn(
                                "flex items-center gap-3 p-2 rounded-lg",
                                item.completed ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-red-50 dark:bg-red-900/20"
                              )}
                            >
                              <span className={cn(
                                "material-symbols-outlined text-[18px]",
                                item.completed ? "text-emerald-600" : "text-red-500"
                              )}>
                                {item.completed ? 'check_circle' : 'cancel'}
                              </span>
                              <span className="text-sm flex-1">{item.title}</span>
                              <span className={cn(
                                "text-xs font-medium px-2 py-0.5 rounded-full",
                                item.completed 
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-200" 
                                  : "bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200"
                              )}>
                                {item.completed ? 'OK' : 'DX'}
                              </span>
                            </div>
                          ))}

                          {/* Category Photos with Gallery */}
                          {photos.length > 0 && (
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
                              <p className="text-xs font-medium text-muted-foreground mb-2">Fotos anexadas:</p>
                              <PhotoGallery 
                                photos={photos.map(p => ({
                                  url: p.url,
                                  timestamp: p.uploadedAt,
                                  uploaded_by: p.uploadedBy,
                                }))} 
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Maintenance Issues Section */}
          {schedule.maintenanceIssues.length > 0 && (
            <section className="rounded-2xl bg-white dark:bg-[#2d3138] shadow-sm p-5 border border-slate-100 dark:border-slate-700">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-yellow-500 text-[20px]">warning</span>
                Avarias Registradas
              </h3>
              <div className="space-y-3">
                {schedule.maintenanceIssues.map((issue) => (
                  <div 
                    key={issue.id}
                    className="rounded-xl bg-yellow-50 dark:bg-yellow-900/20 p-4 border border-yellow-200 dark:border-yellow-800"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-medium">{issue.description}</p>
                      <span className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        issue.severity === 'high' && "bg-red-100 text-red-700",
                        issue.severity === 'medium' && "bg-yellow-100 text-yellow-700",
                        issue.severity === 'low' && "bg-green-100 text-green-700"
                      )}>
                        {issue.severity === 'high' ? 'Alta' : issue.severity === 'medium' ? 'Média' : 'Baixa'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      <span>{format(issue.reportedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                      {issue.resolved && (
                        <span className="inline-flex items-center gap-1 text-emerald-600">
                          <span className="material-symbols-outlined text-[14px]">check</span>
                          Resolvida
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Simplified History Section - Only key timestamps */}
          <section className="rounded-2xl bg-white dark:bg-[#2d3138] shadow-sm p-5 border border-slate-100 dark:border-slate-700">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">history</span>
              Histórico
            </h3>
            <div className="space-y-3">
              {/* Hora Liberada */}
              {(() => {
                const releasedEvent = schedule.history?.find(
                  e => e.action === 'status_change' && e.to_status === 'released'
                );
                return (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-emerald-600 text-[16px]">lock_open</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Hora Liberada</p>
                      <p className="text-xs text-muted-foreground">
                        {releasedEvent 
                          ? format(new Date(releasedEvent.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                          : '--'}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Hora Iniciada */}
              {(() => {
                const startedEvent = schedule.history?.find(
                  e => e.action === 'status_change' && e.to_status === 'cleaning'
                );
                return (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-blue-600 text-[16px]">play_arrow</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Hora Iniciada</p>
                      <p className="text-xs text-muted-foreground">
                        {startedEvent 
                          ? format(new Date(startedEvent.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                          : schedule.startAt 
                            ? format(schedule.startAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                            : '--'}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Hora Finalizada */}
              {(() => {
                const completedEvent = schedule.history?.find(
                  e => e.action === 'status_change' && e.to_status === 'completed'
                );
                return (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-primary text-[16px]">check_circle</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Hora Finalizada</p>
                      <p className="text-xs text-muted-foreground">
                        {completedEvent 
                          ? format(new Date(completedEvent.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                          : schedule.endAt 
                            ? format(schedule.endAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                            : '--'}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </section>

          {/* Notes Section */}
          {schedule.notes && (
            <section className="rounded-2xl bg-white dark:bg-[#2d3138] shadow-sm p-5 border border-slate-100 dark:border-slate-700">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">description</span>
                Observações
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{schedule.notes}</p>
            </section>
          )}
        </main>
      </div>

      {/* All Photos Section */}
      {allPhotosForGallery.length > 0 && (
        <section className="mt-6 rounded-2xl bg-white dark:bg-[#2d3138] shadow-sm p-5 border border-slate-100 dark:border-slate-700 mx-6">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">photo_library</span>
            Todas as Fotos ({allPhotosForGallery.length})
          </h3>
          <PhotoGallery 
            photos={allPhotosForGallery} 
            title=""
          />
        </section>
      )}
    </div>
  );
}
