import { Schedule, ScheduleStatus, ChecklistItem, MaintenanceIssue } from '@/types/scheduling';
import { cn } from '@/lib/utils';
import { 
  ArrowLeft,
  Clock, 
  MapPin, 
  Camera,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  MessageSquare,
  LogIn,
  Timer,
  History,
  ChevronDown,
  ChevronUp,
  Play,
  Key,
  Info,
  X,
  Check,
  Edit3
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { toast } from 'sonner';

interface ScheduleDetailProps {
  schedule: Schedule;
  onClose: () => void;
  onUpdateSchedule: (schedule: Schedule, previousStatus?: ScheduleStatus) => void;
}

const SPACE_OPTIONS = [
  'Cozinha',
  'Sala',
  'Quarto 1',
  'Quarto 2',
  'Banheiro',
  'Varanda',
  'Área de Serviço',
  'Outro'
];

const statusConfig: Record<ScheduleStatus, { label: string; className: string; next?: ScheduleStatus; nextLabel?: string }> = {
  waiting: { 
    label: 'Aguardando', 
    className: 'text-amber-500',
    next: 'released',
    nextLabel: 'Liberar para Limpeza'
  },
  released: { 
    label: 'Liberado', 
    className: 'text-teal-500',
    next: 'cleaning',
    nextLabel: 'Iniciar Limpeza'
  },
  cleaning: { 
    label: 'Em Limpeza', 
    className: 'text-blue-500',
    next: 'completed',
    nextLabel: 'Finalizar Limpeza'
  },
  completed: { 
    label: 'Finalizado', 
    className: 'text-emerald-500'
  },
};

export function ScheduleDetail({ schedule, onClose, onUpdateSchedule }: ScheduleDetailProps) {
  const [notes, setNotes] = useState(schedule.notes);
  const [checklist, setChecklist] = useState(schedule.checklist);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueSpace, setIssueSpace] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [issuePhoto, setIssuePhoto] = useState<File | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [acknowledgedInfo, setAcknowledgedInfo] = useState(false);
  const statusStyle = statusConfig[schedule.status];

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleChecklistToggle = (itemId: string) => {
    const updatedChecklist = checklist.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    setChecklist(updatedChecklist);
    onUpdateSchedule({ ...schedule, checklist: updatedChecklist });
  };

  const handleCategoryToggle = (category: string, items: ChecklistItem[]) => {
    const allCompleted = items.every(item => item.completed);
    const updatedChecklist = checklist.map(item =>
      item.category === category ? { ...item, completed: !allCompleted } : item
    );
    setChecklist(updatedChecklist);
    onUpdateSchedule({ ...schedule, checklist: updatedChecklist });
  };

  const getCategoryCompletion = () => {
    const categories = Object.keys(groupedChecklist);
    const incompleteCategories: string[] = [];
    
    categories.forEach(category => {
      const items = groupedChecklist[category];
      const allCompleted = items.every(item => item.completed);
      if (!allCompleted) {
        incompleteCategories.push(category);
      }
    });
    
    return { allComplete: incompleteCategories.length === 0, incompleteCategories };
  };

  const handleStatusChange = (newStatus?: ScheduleStatus) => {
    const targetStatus = newStatus || statusConfig[schedule.status].next;
    if (targetStatus && targetStatus !== schedule.status) {
      if (targetStatus === 'completed' && checklist.length > 0) {
        const { allComplete, incompleteCategories } = getCategoryCompletion();
        if (!allComplete) {
          toast.error(
            `Complete todas as seções do checklist antes de finalizar. Seções pendentes: ${incompleteCategories.join(', ')}`,
            { duration: 5000 }
          );
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

  const handleSubmitIssue = () => {
    if (!issueSpace || !issueDescription) {
      toast.error('Preencha o espaço e a descrição');
      return;
    }

    const newIssue: MaintenanceIssue = {
      id: `issue-${Date.now()}`,
      description: `[${issueSpace}] ${issueDescription}`,
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

    setShowIssueForm(false);
    setIssueSpace('');
    setIssueDescription('');
    setIssuePhoto(null);
    toast.success('Avaria reportada com sucesso!');
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

  // Format duration
  const hours = Math.floor(schedule.estimatedDuration / 60);
  const minutes = schedule.estimatedDuration % 60;
  const durationFormatted = `${hours}h ${minutes.toString().padStart(2, '0')}m`;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between p-4 bg-background border-b">
          <div className="flex items-start gap-3">
            <button onClick={onClose} className="mt-1">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{schedule.propertyName}</h1>
              <p className="text-sm text-muted-foreground">{schedule.propertyAddress}</p>
            </div>
          </div>
          <span className={cn('text-sm font-medium', statusStyle.className)}>
            {statusStyle.label}
          </span>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button className="flex-1 bg-teal-500 hover:bg-teal-600 text-white">
                <MapPin className="w-4 h-4 mr-2" />
                Ver Endereço
              </Button>
              <Button variant="outline" className="flex-1 border-muted-foreground/30">
                <Key className="w-4 h-4 mr-2" />
                Ver Senha da Porta
              </Button>
            </div>

            {/* Time Info Card */}
            <div className="bg-muted/50 rounded-xl p-4 space-y-4">
              <div className="flex justify-center gap-8">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">CHECK-IN</p>
                  <div className="flex items-center gap-1.5 justify-center">
                    <LogIn className="w-4 h-4 text-foreground" />
                    <span className="font-semibold">{format(schedule.checkIn, "HH:mm")}</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">TEMPO ESTIMADO</p>
                  <div className="flex items-center gap-1.5 justify-center">
                    <Timer className="w-4 h-4 text-foreground" />
                    <span className="font-semibold">{durationFormatted}</span>
                  </div>
                </div>
              </div>

              {/* Important Info */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold">INFORMAÇÕES IMPORTANTES</span>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm">
                    <span className="text-amber-600 dark:text-amber-400 font-medium">⚠️ Atenção:</span>{' '}
                    O hóspede solicitou especial cuidado com os tapetes da sala devido a alergias. Utilize o aspirador em potência máxima.
                  </p>
                </div>
              </div>

              {/* Acknowledgment Checkbox */}
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox 
                  checked={acknowledgedInfo}
                  onCheckedChange={(checked) => setAcknowledgedInfo(checked as boolean)}
                  className="data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
                />
                <span className="text-sm text-foreground">Li e compreendi as informações</span>
              </label>

              {/* Start Button */}
              {schedule.status === 'released' && (
                <Button 
                  className="w-full bg-gradient-to-r from-teal-400 to-teal-500 hover:from-teal-500 hover:to-teal-600 text-white shadow-lg"
                  size="lg"
                  onClick={() => handleStatusChange('cleaning')}
                  disabled={!acknowledgedInfo}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Iniciar Limpeza
                </Button>
              )}
            </div>

            {/* Progress */}
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold">Progresso do Checklist</span>
              <span className="text-sm text-teal-500 font-medium">{completedTasks}/{totalTasks} Concluídos</span>
            </div>

            {/* Checklist Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-teal-500" />
                <span className="font-semibold">CHECKLIST DE LIMPEZA</span>
              </div>
              
              <div className="space-y-3">
                {Object.entries(groupedChecklist).map(([category, items]) => {
                  const completedInCategory = items.filter(item => item.completed).length;
                  const totalInCategory = items.length;
                  const isExpanded = expandedCategories[category] ?? false;
                  const allCompleted = items.every(item => item.completed);
                  
                  return (
                    <div key={category} className="border border-muted rounded-xl overflow-hidden bg-card">
                      {/* Category Header */}
                      <div 
                        className="flex items-center justify-between p-4 cursor-pointer"
                        onClick={() => toggleCategory(category)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                            allCompleted ? "bg-teal-500 border-teal-500" : "border-muted-foreground/40"
                          )}>
                            {allCompleted && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="font-medium">{category}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button className="p-1.5 hover:bg-muted rounded-md">
                            <Camera className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <button className="p-1.5 hover:bg-muted rounded-md">
                            <Wrench className="w-4 h-4 text-muted-foreground" />
                          </button>
                          {!isExpanded && (
                            <span className="text-sm text-muted-foreground">{completedInCategory}/{totalInCategory}</span>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      
                      {/* Items */}
                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-3">
                          {items.map(item => (
                            <div 
                              key={item.id}
                              className="flex items-center gap-3 pl-8"
                            >
                              <button
                                onClick={() => handleChecklistToggle(item.id)}
                                className="flex items-center gap-3"
                              >
                                <div className="flex items-center gap-1.5">
                                  <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                                    <X className="w-3 h-3 text-red-500" />
                                  </div>
                                  <div className={cn(
                                    "w-5 h-5 rounded-full flex items-center justify-center",
                                    item.completed ? "bg-teal-500" : "bg-teal-100"
                                  )}>
                                    <Check className={cn(
                                      "w-3 h-3",
                                      item.completed ? "text-white" : "text-teal-500"
                                    )} />
                                  </div>
                                </div>
                                <span className={cn(
                                  "text-sm",
                                  item.completed && "line-through text-muted-foreground"
                                )}>
                                  {item.title}
                                </span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Maintenance Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Wrench className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold">MANUTENÇÃO</span>
              </div>
              
              {schedule.maintenanceIssues.length > 0 && (
                <div className="space-y-2 mb-3">
                  {schedule.maintenanceIssues.map(issue => (
                    <div 
                      key={issue.id}
                      className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 border-l-4 border-amber-500"
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">{issue.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Reportado em {format(issue.reportedAt, "dd/MM - HH:mm")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showIssueForm ? (
                <div className="border rounded-xl p-4 space-y-3 bg-muted/30">
                  <Select value={issueSpace} onValueChange={setIssueSpace}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o espaço" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPACE_OPTIONS.map(space => (
                        <SelectItem key={space} value={space}>{space}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    placeholder="Breve descrição da avaria"
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                  />

                  <div>
                    <label className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <Camera className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {issuePhoto ? issuePhoto.name : 'Adicionar foto (opcional)'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setIssuePhoto(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setShowIssueForm(false)}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      className="flex-1"
                      onClick={handleSubmitIssue}
                    >
                      Enviar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  className="w-full border-dashed"
                  onClick={() => setShowIssueForm(true)}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Reportar Avaria
                </Button>
              )}
            </div>

            {/* Observations Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-teal-500" />
                <span className="font-semibold">OBSERVAÇÕES</span>
              </div>
              
              <div className="relative">
                <Textarea
                  placeholder="Adicione observações sobre este agendamento..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[100px] pr-10 resize-none"
                />
                <Edit3 className="w-4 h-4 text-muted-foreground absolute right-3 bottom-3" />
              </div>
              
              <Button 
                className="w-full mt-3 bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                onClick={handleSaveNotes}
              >
                Salvar Observações
              </Button>
            </div>

            {/* History Section */}
            <div className="pb-20">
              <div className="flex items-center gap-2 mb-4">
                <History className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold">HISTÓRICO</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground mt-2" />
                  <div>
                    <p className="text-sm font-medium">Agendamento criado</p>
                    <p className="text-xs text-muted-foreground">10/09 às 14:00</p>
                  </div>
                </div>
                
                {schedule.teamArrival && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-teal-500 mt-2" />
                    <div>
                      <p className="text-sm font-medium text-teal-600">Início da Limpeza</p>
                      <p className="text-xs text-muted-foreground">{format(schedule.teamArrival, "dd/MM 'às' HH:mm")}</p>
                    </div>
                  </div>
                )}
                
                {schedule.teamDeparture ? (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-teal-500 mt-2" />
                    <div>
                      <p className="text-sm font-medium text-teal-600">Fim da Limpeza</p>
                      <p className="text-xs text-muted-foreground">{format(schedule.teamDeparture, "dd/MM 'às' HH:mm")}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/30 mt-2" />
                      <div>
                        <p className="text-sm text-muted-foreground">Início da Limpeza</p>
                        <p className="text-xs text-muted-foreground">--</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/30 mt-2" />
                      <div>
                        <p className="text-sm text-muted-foreground">Fim da Limpeza</p>
                        <p className="text-xs text-muted-foreground">-- Duração: - min</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer Action */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          {schedule.status === 'cleaning' && (
            <Button 
              className="w-full bg-gradient-to-r from-teal-400 to-teal-500 hover:from-teal-500 hover:to-teal-600 text-white shadow-lg"
              size="lg"
              onClick={() => handleStatusChange('completed')}
            >
              Finalizar Limpeza
            </Button>
          )}
          {schedule.status === 'waiting' && (
            <Button 
              className="w-full bg-gradient-to-r from-teal-400 to-teal-500 hover:from-teal-500 hover:to-teal-600 text-white shadow-lg"
              size="lg"
              onClick={() => handleStatusChange('released')}
            >
              Liberar para Limpeza
            </Button>
          )}
          {schedule.status === 'completed' && (
            <div className="flex items-center justify-center gap-2 text-teal-500 py-2">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Limpeza Finalizada</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
