import { Schedule, ScheduleStatus, ChecklistItem, MaintenanceIssue } from '@/types/scheduling';
import { cn } from '@/lib/utils';
import { 
  X, 
  Clock, 
  MapPin, 
  User, 
  Camera,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Package,
  MessageSquare,
  LogIn,
  LogOut,
  Timer,
  History,
  Upload,
  ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    label: 'Aguardando Liberação', 
    className: 'bg-status-waiting-bg text-status-waiting',
    next: 'cleaning',
    nextLabel: 'Iniciar Limpeza'
  },
  cleaning: { 
    label: 'Em Limpeza', 
    className: 'bg-status-progress-bg text-status-progress',
    next: 'inspection',
    nextLabel: 'Enviar para Inspeção'
  },
  inspection: { 
    label: 'Em Inspeção', 
    className: 'bg-status-inspection-bg text-status-inspection',
    next: 'completed',
    nextLabel: 'Finalizar'
  },
  completed: { 
    label: 'Finalizado', 
    className: 'bg-status-completed-bg text-status-completed'
  },
};

export function ScheduleDetail({ schedule, onClose, onUpdateSchedule }: ScheduleDetailProps) {
  const [notes, setNotes] = useState(schedule.notes);
  const [checklist, setChecklist] = useState(schedule.checklist);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueSpace, setIssueSpace] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [issuePhoto, setIssuePhoto] = useState<File | null>(null);
  const statusStyle = statusConfig[schedule.status];

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

  // Check if all checklist categories have at least one item completed
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
      // Block completion if checklist is not fully completed (only if checklist has items)
      if ((targetStatus === 'completed' || targetStatus === 'inspection') && checklist.length > 0) {
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
      
      // Register team arrival when starting cleaning
      if (targetStatus === 'cleaning' && !schedule.teamArrival) {
        updates.teamArrival = new Date();
        toast.success('Chegada da equipe registrada! Checklist carregado.');
      }
      
      // Register team departure when completing
      if (targetStatus === 'completed' && !schedule.teamDeparture) {
        updates.teamDeparture = new Date();
        toast.success('Saída da equipe registrada!');
      }
      
      onUpdateSchedule({ ...schedule, ...updates }, previousStatus);
      toast.success(`Status atualizado para: ${statusConfig[targetStatus].label}`);
    }
  };

  const handleDirectStatusChange = (newStatus: ScheduleStatus) => {
    handleStatusChange(newStatus);
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

  const handlePhotoUpload = (type: 'before' | 'after') => {
    toast.info(`Upload de foto ${type === 'before' ? 'antes' : 'depois'} será implementado`);
  };

  const handleSaveNotes = () => {
    onUpdateSchedule({ ...schedule, notes });
    toast.success('Observações salvas!');
  };

  const completedTasks = checklist.filter(item => item.completed).length;
  const totalTasks = checklist.length;
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Group checklist by category
  const groupedChecklist = checklist.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-card border-l shadow-xl animate-slide-in">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h2 className="text-xl font-semibold">{schedule.propertyName}</h2>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                <MapPin className="w-4 h-4" />
                <span>{schedule.propertyAddress}</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">
              {/* Status & Time Info */}
              <div className="flex flex-wrap items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="focus:outline-none">
                      <Badge className={cn('text-sm py-1 px-3 cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1', statusStyle.className)}>
                        {statusStyle.label}
                        <ChevronDown className="w-3 h-3" />
                      </Badge>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem 
                      onClick={() => handleDirectStatusChange('waiting')}
                      className={schedule.status === 'waiting' ? 'bg-muted' : ''}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-status-waiting" />
                        Aguardando Liberação
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDirectStatusChange('cleaning')}
                      className={schedule.status === 'cleaning' ? 'bg-muted' : ''}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-status-progress" />
                        Em Limpeza
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDirectStatusChange('inspection')}
                      className={schedule.status === 'inspection' ? 'bg-muted' : ''}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-status-inspection" />
                        Em Inspeção
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDirectStatusChange('completed')}
                      className={schedule.status === 'completed' ? 'bg-muted' : ''}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-status-completed" />
                        Finalizado
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Check-in: {format(schedule.checkIn, "HH:mm", { locale: ptBR })}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Timer className="w-4 h-4" />
                  <span>Est.: {schedule.estimatedDuration} min</span>
                </div>
              </div>

              {/* Cleaner Info */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{schedule.cleanerName}</p>
                    <p className="text-sm text-muted-foreground">Responsável pela limpeza</p>
                  </div>
                </div>
                
                {/* Team arrival/departure */}
                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  {schedule.teamArrival && (
                    <div className="flex items-center gap-1.5 text-status-completed">
                      <LogIn className="w-4 h-4" />
                      <span>Chegada: {format(schedule.teamArrival, "HH:mm")}</span>
                    </div>
                  )}
                  {schedule.teamDeparture && (
                    <div className="flex items-center gap-1.5 text-status-completed">
                      <LogOut className="w-4 h-4" />
                      <span>Saída: {format(schedule.teamDeparture, "HH:mm")}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progresso do Checklist</span>
                  <span className="text-sm text-muted-foreground">{completedTasks}/{totalTasks}</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-status-completed rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <Separator />

              {/* Checklist */}
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Checklist de Limpeza
                </h3>
                <div className="space-y-4">
                  {Object.entries(groupedChecklist).map(([category, items]) => {
                    const allCompleted = items.every(item => item.completed);
                    const someCompleted = items.some(item => item.completed) && !allCompleted;
                    
                    return (
                      <div key={category} className="border rounded-lg overflow-hidden">
                        {/* Category Header with Select All */}
                        <label
                          className={cn(
                            'flex items-center gap-3 p-3 cursor-pointer transition-colors',
                            allCompleted ? 'bg-status-completed-bg' : 'bg-muted/50 hover:bg-muted'
                          )}
                        >
                          <Checkbox
                            checked={allCompleted}
                            className={someCompleted ? 'data-[state=unchecked]:bg-status-progress/30' : ''}
                            onCheckedChange={() => handleCategoryToggle(category, items)}
                          />
                          <span className={cn('font-medium', allCompleted && 'text-status-completed')}>
                            {category}
                          </span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {items.filter(i => i.completed).length}/{items.length}
                          </span>
                        </label>
                        
                        {/* Individual Items */}
                        <div className="divide-y">
                          {items.map(item => (
                            <label
                              key={item.id}
                              className={cn(
                                'flex items-center gap-3 p-3 pl-8 cursor-pointer transition-colors',
                                item.completed ? 'bg-status-completed-bg/50' : 'bg-card hover:bg-muted/30'
                              )}
                            >
                              <Checkbox
                                checked={item.completed}
                                onCheckedChange={() => handleChecklistToggle(item.id)}
                              />
                              <span className={cn('text-sm', item.completed && 'line-through text-muted-foreground')}>
                                {item.title}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Photos */}
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-primary" />
                  Fotos
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handlePhotoUpload('before')}
                    className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Foto Antes</span>
                    {schedule.photos.filter(p => p.type === 'before').length > 0 && (
                      <Badge variant="secondary">
                        {schedule.photos.filter(p => p.type === 'before').length} foto(s)
                      </Badge>
                    )}
                  </button>
                  <button
                    onClick={() => handlePhotoUpload('after')}
                    className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Foto Depois</span>
                    {schedule.photos.filter(p => p.type === 'after').length > 0 && (
                      <Badge variant="secondary">
                        {schedule.photos.filter(p => p.type === 'after').length} foto(s)
                      </Badge>
                    )}
                  </button>
                </div>
              </div>

              <Separator />

              {/* Maintenance Issues */}
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-primary" />
                  Manutenção
                </h3>
                {schedule.maintenanceIssues.length > 0 ? (
                  <div className="space-y-2 mb-3">
                    {schedule.maintenanceIssues.map(issue => (
                      <div 
                        key={issue.id}
                        className={cn(
                          'p-3 rounded-lg border',
                          issue.severity === 'high' ? 'bg-status-alert-bg border-status-alert/30' :
                          issue.severity === 'medium' ? 'bg-status-progress-bg border-status-progress/30' :
                          'bg-muted border-border'
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle className={cn(
                            'w-4 h-4 mt-0.5',
                            issue.severity === 'high' ? 'text-status-alert' :
                            issue.severity === 'medium' ? 'text-status-progress' :
                            'text-muted-foreground'
                          )} />
                          <div>
                            <p className="text-sm font-medium">{issue.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Reportado em {format(issue.reportedAt, "dd/MM HH:mm")}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mb-3">Nenhum problema reportado</p>
                )}

                {/* Issue Form */}
                {showIssueForm ? (
                  <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
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
                    className="w-full"
                    onClick={() => setShowIssueForm(true)}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Reportar Avaria
                  </Button>
                )}
              </div>

              {/* Missing Materials */}
              {schedule.missingMaterials.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Package className="w-5 h-5 text-status-progress" />
                      Materiais Faltando
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {schedule.missingMaterials.map(material => (
                        <Badge key={material} variant="outline" className="bg-status-progress-bg text-status-progress border-status-progress/30">
                          {material}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Notes */}
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Observações
                </h3>
                <Textarea
                  placeholder="Adicione observações sobre este agendamento..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[100px]"
                />
                <Button 
                  variant="secondary" 
                  className="w-full mt-2"
                  onClick={handleSaveNotes}
                >
                  Salvar Observações
                </Button>
              </div>

              {/* History */}
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Histórico
                </h3>
                <div className="text-sm text-muted-foreground">
                  <p>• Agendamento criado</p>
                  {schedule.teamArrival && <p>• Equipe chegou às {format(schedule.teamArrival, "HH:mm")}</p>}
                  {schedule.teamDeparture && <p>• Equipe saiu às {format(schedule.teamDeparture, "HH:mm")}</p>}
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="p-4 border-t bg-card">
            {statusConfig[schedule.status].next && (
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => handleStatusChange()}
              >
                {statusConfig[schedule.status].nextLabel}
              </Button>
            )}
            {schedule.status === 'completed' && (
              <div className="flex items-center justify-center gap-2 text-status-completed">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">Limpeza Finalizada</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
