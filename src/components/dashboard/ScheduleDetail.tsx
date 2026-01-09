import { Schedule, ScheduleStatus, ChecklistItem, MaintenanceIssue } from '@/types/scheduling';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { toast } from 'sonner';
import { LocationModal } from './LocationModal';
import { PasswordModal } from './PasswordModal';
import { IssueReportModal } from './IssueReportModal';
import { AttentionModal } from './AttentionModal';
import { ChecklistPendingModal } from './ChecklistPendingModal';

interface ScheduleDetailProps {
  schedule: Schedule;
  onClose: () => void;
  onUpdateSchedule: (schedule: Schedule, previousStatus?: ScheduleStatus) => void;
}

const statusConfig: Record<ScheduleStatus, { label: string; className: string; badgeClass: string; next?: ScheduleStatus; nextLabel?: string }> = {
  waiting: { 
    label: 'Aguardando', 
    className: 'text-orange-600',
    badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    next: 'released',
    nextLabel: 'Liberar para Limpeza'
  },
  released: { 
    label: 'Liberado', 
    className: 'text-primary',
    badgeClass: 'bg-primary/10 text-primary',
    next: 'cleaning',
    nextLabel: 'Iniciar Limpeza'
  },
  cleaning: { 
    label: 'Em Limpeza', 
    className: 'text-blue-500',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    next: 'completed',
    nextLabel: 'Finalizar Limpeza'
  },
  completed: { 
    label: 'Finalizado', 
    className: 'text-emerald-500',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
  },
};

export function ScheduleDetail({ schedule, onClose, onUpdateSchedule }: ScheduleDetailProps) {
  const [notes, setNotes] = useState(schedule.notes);
  const [checklist, setChecklist] = useState(schedule.checklist);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [acknowledgedInfo, setAcknowledgedInfo] = useState(false);
  const [checklistItemStates, setChecklistItemStates] = useState<Record<string, 'yes' | 'no' | null>>({});
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAttentionModal, setShowAttentionModal] = useState(false);
  const [showChecklistPendingModal, setShowChecklistPendingModal] = useState(false);
  const [pendingCategories, setPendingCategories] = useState<{ name: string; pendingCount: number; totalCount: number }[]>([]);
  const statusStyle = statusConfig[schedule.status];

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleChecklistItemChange = (itemId: string, value: 'yes' | 'no') => {
    setChecklistItemStates(prev => ({
      ...prev,
      [itemId]: value
    }));
    
    if (value === 'yes') {
      const updatedChecklist = checklist.map(item =>
        item.id === itemId ? { ...item, completed: true } : item
      );
      setChecklist(updatedChecklist);
      onUpdateSchedule({ ...schedule, checklist: updatedChecklist });
    } else {
      const updatedChecklist = checklist.map(item =>
        item.id === itemId ? { ...item, completed: false } : item
      );
      setChecklist(updatedChecklist);
      onUpdateSchedule({ ...schedule, checklist: updatedChecklist });
    }
  };


  const getPendingCategoriesDetails = () => {
    const categories = Object.keys(groupedChecklist);
    const pending: { name: string; pendingCount: number; totalCount: number }[] = [];
    
    categories.forEach(category => {
      const items = groupedChecklist[category];
      const completedCount = items.filter(item => item.completed).length;
      const pendingCount = items.length - completedCount;
      if (pendingCount > 0) {
        pending.push({
          name: category,
          pendingCount,
          totalCount: items.length
        });
      }
    });
    
    return pending;
  };

  const handleStatusChange = (newStatus?: ScheduleStatus) => {
    const targetStatus = newStatus || statusConfig[schedule.status].next;
    if (targetStatus && targetStatus !== schedule.status) {
      if (targetStatus === 'completed' && checklist.length > 0) {
        const pending = getPendingCategoriesDetails();
        if (pending.length > 0) {
          setPendingCategories(pending);
          setShowChecklistPendingModal(true);
          return;
        }
      }

      const previousStatus = schedule.status;
      const updates: Partial<Schedule> = { status: targetStatus };
      
      if (targetStatus === 'cleaning' && !schedule.teamArrival) {
        updates.teamArrival = new Date();
        toast.success('Chegada da equipe registrada! Checklist carregado.');
      }
      
      if (targetStatus === 'completed' && !schedule.teamDeparture) {
        updates.teamDeparture = new Date();
        toast.success('Saída da equipe registrada!');
      }
      
      onUpdateSchedule({ ...schedule, ...updates }, previousStatus);
      toast.success(`Status atualizado para: ${statusConfig[targetStatus].label}`);
    }
  };

  const handleIssueSubmit = (issue: { section: string; item: string; description: string; photos: string[] }) => {
    const newIssue: MaintenanceIssue = {
      id: `issue-${Date.now()}`,
      description: `[${issue.section}${issue.item ? ` - ${issue.item}` : ''}] ${issue.description}`,
      severity: 'medium',
      reportedAt: new Date(),
      resolved: false
    };

    const updatedIssues = [...schedule.maintenanceIssues, newIssue];
    onUpdateSchedule({ 
      ...schedule, 
      maintenanceIssues: updatedIssues,
      maintenanceStatus: 'needs_maintenance'
    });
  };

  const handleSaveNotes = () => {
    onUpdateSchedule({ ...schedule, notes });
    toast.success('Observações salvas!');
  };

  const completedTasks = checklist.filter(item => item.completed).length;
  const totalTasks = checklist.length;

  // Group checklist by category
  const groupedChecklist = checklist.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  // Get current time
  const currentTime = format(new Date(), "HH:mm");

  return (
    <div className="fixed inset-0 z-50 bg-stone-50 dark:bg-[#22252a] font-display text-slate-800 dark:text-slate-100 antialiased">
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden pb-24">
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
            <span className="text-xs font-medium text-[#8A8B88] dark:text-slate-400">{schedule.propertyAddress}</span>
          </div>
          <div className="ml-auto">
            <span className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
              statusStyle.badgeClass
            )}>
              {statusStyle.label}
            </span>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex flex-col gap-6 p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setShowLocationModal(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] transition-all active:scale-[0.98] dark:bg-white dark:text-slate-900"
            >
              <span className="material-symbols-outlined text-[18px]">map</span>
              Ver Endereço
            </button>
            <button 
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3.5 text-xs font-bold text-slate-500 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:bg-[#2d3138] dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <span className="material-symbols-outlined text-[18px]">vpn_key</span>
              Ver Senha da Porta
            </button>
          </div>

          {/* Info Card */}
          <section className="rounded-2xl bg-white dark:bg-[#2d3138] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] p-5 border border-slate-100 dark:border-slate-700">
            {/* Time Grid */}
            <div className="mb-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center gap-1">
                <span className="text-[10px] font-bold uppercase text-[#8A8B88] dark:text-slate-400 tracking-wide">Hora Atual</span>
                <div className="flex items-center gap-1.5 text-slate-900 dark:text-white">
                  <span className="material-symbols-outlined text-[18px] text-primary">schedule</span>
                  <span className="text-sm font-bold">{currentTime}</span>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center gap-1">
                <span className="text-[10px] font-bold uppercase text-[#8A8B88] dark:text-slate-400 tracking-wide">Próximo Hóspede</span>
                <div className="flex items-center gap-1.5 text-slate-900 dark:text-white">
                  <span className="material-symbols-outlined text-[18px] text-primary">login</span>
                  <span className="text-sm font-bold">{format(schedule.checkIn, "HH:mm")}</span>
                </div>
              </div>
            </div>

            {/* Important Info */}
            <div className="flex flex-col gap-3 mb-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-[#E0C051] text-[20px]">info</span>
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-white">Informações Importantes</h3>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  ⚠️ <span className="font-bold text-slate-800 dark:text-slate-200">Atenção:</span> O hóspede solicitou especial cuidado com os tapetes da sala devido a alergias. Utilize o aspirador em potência máxima.
                </p>
              </div>
              <label className="flex items-center gap-3 p-1 cursor-pointer group">
                <input 
                  type="checkbox"
                  checked={acknowledgedInfo}
                  onChange={(e) => setAcknowledgedInfo(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary dark:border-slate-600 dark:bg-slate-700 transition-colors"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">Li e compreendi as informações</span>
              </label>
            </div>

            {/* Start Cleaning Button */}
            {(schedule.status === 'released' || schedule.status === 'waiting') && (
              <button 
                onClick={() => {
                  if (schedule.status === 'released' && !acknowledgedInfo) {
                    setShowAttentionModal(true);
                    return;
                  }
                  handleStatusChange(schedule.status === 'waiting' ? 'released' : 'cleaning');
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-white shadow-[0_4px_20px_-2px_rgba(51,153,153,0.3)] transition-all active:scale-[0.98] hover:bg-[#267373]"
              >
                <span className="material-symbols-outlined filled">play_circle</span>
                {schedule.status === 'waiting' ? 'Liberar para Limpeza' : 'Iniciar Limpeza'}
              </button>
            )}
          </section>

          {/* Progress Section */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Progresso do Checklist</h3>
              <span className="text-xs font-bold text-primary">{completedTasks}/{totalTasks} Concluídos</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div 
                className="h-full rounded-full bg-primary transition-all duration-500" 
                style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
              />
            </div>
          </section>

          {/* Checklist Section */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-white">Checklist de Limpeza</h3>
            </div>

            {Object.entries(groupedChecklist).map(([category, items]) => {
              const completedInCategory = items.filter(item => item.completed).length;
              const totalInCategory = items.length;
              const isExpanded = expandedCategories[category] ?? false;
              const allCompleted = items.every(item => item.completed);

              return (
                <div key={category} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#2d3138]">
                  <details open={isExpanded} className="group">
                    <summary 
                      onClick={(e) => { e.preventDefault(); toggleCategory(category); }}
                      className="flex cursor-pointer items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-4 font-medium"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-4 w-4 rounded-full border-2 flex items-center justify-center",
                          allCompleted ? "bg-primary border-primary" : "border-slate-300 dark:border-slate-500"
                        )}>
                          {allCompleted && (
                            <span className="material-symbols-outlined text-white text-[12px]">check</span>
                          )}
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">{category}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <button aria-label="Adicionar Foto" className="rounded-full p-1 text-slate-400 hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                        </button>
                        <button aria-label="Reportar Problema" className="rounded-full p-1 text-slate-400 hover:text-orange-500 transition-colors">
                          <span className="material-symbols-outlined text-[20px]">build</span>
                        </button>
                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-600 mx-1" />
                        {!isExpanded && (
                          <span className="text-xs font-semibold text-[#8A8B88]">{completedInCategory}/{totalInCategory}</span>
                        )}
                        <span className={cn(
                          "material-symbols-outlined text-slate-400 transition",
                          isExpanded && "rotate-180"
                        )}>expand_more</span>
                      </div>
                    </summary>

                    {isExpanded && (
                      <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700/50 p-0">
                        {items.map(item => {
                          const itemState = checklistItemStates[item.id] || (item.completed ? 'yes' : null);
                          
                          return (
                            <div key={item.id} className="flex items-center px-4 py-3 gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                              <div className="flex items-center gap-2 shrink-0">
                                <label className="relative cursor-pointer">
                                  <input 
                                    type="radio" 
                                    name={`item-${item.id}`} 
                                    value="no"
                                    checked={itemState === 'no'}
                                    onChange={() => handleChecklistItemChange(item.id, 'no')}
                                    className="peer sr-only" 
                                  />
                                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100/50 text-slate-300 transition-all hover:bg-red-50 hover:text-red-300 peer-checked:bg-red-500 peer-checked:text-white peer-checked:shadow-md peer-checked:scale-110 dark:bg-slate-700/50 dark:text-slate-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 dark:peer-checked:bg-red-500">
                                    <span className="material-symbols-outlined text-[16px] font-bold">close</span>
                                  </div>
                                </label>
                                <label className="relative cursor-pointer">
                                  <input 
                                    type="radio" 
                                    name={`item-${item.id}`} 
                                    value="yes"
                                    checked={itemState === 'yes'}
                                    onChange={() => handleChecklistItemChange(item.id, 'yes')}
                                    className="peer sr-only" 
                                  />
                                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100/50 text-slate-300 transition-all hover:bg-green-50 hover:text-green-300 peer-checked:bg-green-500 peer-checked:text-white peer-checked:shadow-md peer-checked:scale-110 dark:bg-slate-700/50 dark:text-slate-500 dark:hover:bg-green-900/20 dark:hover:text-green-400 dark:peer-checked:bg-green-500">
                                    <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                                  </div>
                                </label>
                              </div>
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.title}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </details>
                </div>
              );
            })}
          </section>

          {/* Maintenance Section */}
          <section className="flex flex-col gap-3 mt-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">build</span>
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-white">Manutenção</h3>
            </div>
            
            {schedule.maintenanceIssues.length > 0 && (
              <div className="flex flex-col gap-3">
                {schedule.maintenanceIssues.map(issue => (
                  <div key={issue.id} className="rounded-xl border border-orange-200 bg-orange-50 p-3 dark:border-orange-900/50 dark:bg-orange-900/10">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-orange-500 mt-0.5 text-[20px]">warning</span>
                      <div className="flex flex-col">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{issue.description}</p>
                        <span className="text-[10px] text-[#8A8B88] dark:text-slate-400">
                          Reportado em {format(issue.reportedAt, "dd/MM - HH:mm")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button 
              onClick={() => setShowIssueForm(true)}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-[#2d3138] dark:text-white dark:hover:bg-slate-700"
            >
              <span className="material-symbols-outlined text-[20px]">report_problem</span>
              Reportar Avaria
            </button>
          </section>

          {/* Observations Section */}
          <section className="flex flex-col gap-3 mt-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">chat_bubble</span>
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-white">Observações</h3>
            </div>
            <div className="relative">
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border-slate-200 bg-slate-50 p-4 pb-10 text-sm focus:border-primary focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white" 
                placeholder="Adicione observações sobre este agendamento..." 
                rows={3}
              />
              <span className="material-symbols-outlined absolute bottom-3 right-3 text-slate-400 text-[18px]">edit</span>
            </div>
            <button 
              onClick={handleSaveNotes}
              className="w-full rounded-lg bg-slate-200 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
            >
              Salvar Observações
            </button>
          </section>

          {/* History Section */}
          <section className="flex flex-col gap-3 mt-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-primary text-[20px]">history</span>
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-white">Histórico</h3>
            </div>
            <div className="relative pl-4 border-l-2 border-slate-100 dark:border-slate-700 ml-2 space-y-6">
              <div className="relative">
                <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-white bg-slate-300 dark:border-[#2d3138] dark:bg-slate-600" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Agendamento criado</span>
                  <span className="text-[10px] text-[#8A8B88] dark:text-slate-500">10/09 às 14:00</span>
                </div>
              </div>
              
              <div className={cn("relative", !schedule.teamArrival && "opacity-50")}>
                <span className={cn(
                  "absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-white dark:border-[#2d3138]",
                  schedule.teamArrival ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"
                )} />
                <div className="flex flex-col">
                  <span className={cn(
                    "text-xs font-bold",
                    schedule.teamArrival ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"
                  )}>Início da Limpeza</span>
                  <span className="text-[10px] text-[#8A8B88] dark:text-slate-600">
                    {schedule.teamArrival ? format(schedule.teamArrival, "dd/MM 'às' HH:mm") : "--:--"}
                  </span>
                </div>
              </div>
              
              <div className={cn("relative", !schedule.teamDeparture && "opacity-50")}>
                <span className={cn(
                  "absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-white dark:border-[#2d3138]",
                  schedule.teamDeparture ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"
                )} />
                <div className="flex flex-col">
                  <span className={cn(
                    "text-xs font-bold",
                    schedule.teamDeparture ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"
                  )}>Fim da Limpeza</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#8A8B88] dark:text-slate-600">
                      {schedule.teamDeparture ? format(schedule.teamDeparture, "dd/MM 'às' HH:mm") : "--:--"}
                    </span>
                    {schedule.teamArrival && schedule.teamDeparture && (
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 rounded">
                        Duração: {Math.round((schedule.teamDeparture.getTime() - schedule.teamArrival.getTime()) / 60000)} min
                      </span>
                    )}
                    {!schedule.teamDeparture && (
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 rounded">
                        Duração: -- min
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Footer Button */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-stone-50/95 dark:bg-[#22252a]/95 backdrop-blur-md border-t border-slate-200/50 dark:border-slate-700/50 p-4">
          {schedule.status === 'cleaning' && (
            <button 
              onClick={() => handleStatusChange('completed')}
              className="w-full rounded-xl bg-primary py-4 text-base font-bold text-white shadow-[0_4px_20px_-2px_rgba(51,153,153,0.3)] transition-all hover:bg-[#267373] active:scale-[0.98]"
            >
              Finalizar Limpeza
            </button>
          )}
          {schedule.status === 'completed' && (
            <div className="flex items-center justify-center gap-2 text-primary py-2">
              <span className="material-symbols-outlined">check_circle</span>
              <span className="font-bold">Limpeza Finalizada</span>
            </div>
          )}
        </div>
      </div>

      {/* Location Modal */}
      {/* Location Modal */}
      {showLocationModal && (
        <LocationModal
          propertyName={schedule.propertyName}
          address={schedule.propertyAddress || ''}
          onClose={() => setShowLocationModal(false)}
        />
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <PasswordModal
          propertyName={schedule.propertyName}
          password="8042#"
          onClose={() => setShowPasswordModal(false)}
        />
      )}

      {/* Issue Report Modal */}
      {showIssueForm && (
        <IssueReportModal
          onClose={() => setShowIssueForm(false)}
          onSubmit={handleIssueSubmit}
        />
      )}

      {/* Attention Modal */}
      {showAttentionModal && (
        <AttentionModal
          onClose={() => setShowAttentionModal(false)}
        />
      )}

      {/* Checklist Pending Modal */}
      {showChecklistPendingModal && (
        <ChecklistPendingModal
          pendingCategories={pendingCategories}
          onClose={() => setShowChecklistPendingModal(false)}
        />
      )}
    </div>
  );
}
