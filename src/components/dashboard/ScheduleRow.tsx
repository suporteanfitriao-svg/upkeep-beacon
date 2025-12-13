import { Schedule, ScheduleStatus } from '@/types/scheduling';
import { cn } from '@/lib/utils';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Wrench,
  ChevronDown,
  ChevronUp,
  Info,
  Pencil
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ScheduleRowProps {
  schedule: Schedule;
  onClick: () => void;
  onUpdateTimes?: (scheduleId: string, checkInTime: string, checkOutTime: string) => void;
}

const statusConfig: Record<ScheduleStatus, { label: string; className: string }> = {
  waiting: { 
    label: 'Aguardando', 
    className: 'bg-status-waiting-bg text-status-waiting border-status-waiting/30' 
  },
  cleaning: { 
    label: 'Em Limpeza', 
    className: 'bg-status-progress-bg text-status-progress border-status-progress/30' 
  },
  inspection: { 
    label: 'Inspeção', 
    className: 'bg-status-inspection-bg text-status-inspection border-status-inspection/30' 
  },
  completed: { 
    label: 'Finalizado', 
    className: 'bg-status-completed-bg text-status-completed border-status-completed/30' 
  },
};

const priorityConfig = {
  high: { label: 'Alta', className: 'bg-priority-high/10 text-priority-high border-priority-high/30' },
  medium: { label: 'Média', className: 'bg-priority-medium/10 text-priority-medium border-priority-medium/30' },
  low: { label: 'Baixa', className: 'bg-priority-low/10 text-priority-low border-priority-low/30' },
};

const maintenanceIcons = {
  ok: <CheckCircle2 className="w-4 h-4 text-status-completed" />,
  needs_maintenance: <AlertTriangle className="w-4 h-4 text-status-alert animate-pulse-soft" />,
  in_progress: <Wrench className="w-4 h-4 text-status-progress" />,
};

export function ScheduleRow({ schedule, onClick, onUpdateTimes }: ScheduleRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingTimes, setIsEditingTimes] = useState(false);
  const [editCheckInTime, setEditCheckInTime] = useState(format(schedule.checkIn, "HH:mm"));
  const [editCheckOutTime, setEditCheckOutTime] = useState(format(schedule.checkOut, "HH:mm"));
  
  const statusStyle = statusConfig[schedule.status];
  const priorityStyle = priorityConfig[schedule.priority];
  const completedTasks = schedule.checklist.filter(item => item.completed).length;
  const totalTasks = schedule.checklist.length;
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleSaveTimes = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUpdateTimes) {
      onUpdateTimes(schedule.id, editCheckInTime, editCheckOutTime);
    }
    setIsEditingTimes(false);
  };

  return (
    <div className="bg-card rounded-lg border overflow-hidden transition-all duration-200 hover:shadow-md">
      {/* Collapsed Row - Always Visible */}
      {/* Desktop: Grid layout matching header */}
      <div 
        className="hidden md:grid grid-cols-[1fr_120px_100px_100px_140px_180px] gap-4 items-center p-3 cursor-pointer group"
        onClick={onClick}
      >
        {/* Property Name */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={handleExpand}
            className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          {maintenanceIcons[schedule.maintenanceStatus]}
          <h3 className="font-medium text-foreground truncate text-sm">
            {schedule.propertyName}
          </h3>
          
          {/* Info Tooltip */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 p-1 rounded hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Info className="w-4 h-4 text-muted-foreground hover:text-primary" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs p-3 bg-popover border shadow-lg">
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-foreground">{schedule.propertyName}</p>
                  <p className="text-muted-foreground">{schedule.propertyAddress}</p>
                  <div className="flex gap-4 text-xs">
                    <span><strong>Check-in:</strong> {format(schedule.checkIn, "dd/MM/yyyy")}</span>
                    <span><strong>Check-out:</strong> {format(schedule.checkOut, "dd/MM/yyyy")}</span>
                  </div>
                  <p className="text-xs"><strong>Hóspedes:</strong> {schedule.numberOfGuests}</p>
                  <p className="text-xs"><strong>Responsável:</strong> {schedule.cleanerName}</p>
                  <p className="text-xs"><strong>Duração:</strong> {schedule.estimatedDuration} min</p>
                  <p className="text-xs"><strong>Progresso:</strong> {completedTasks}/{totalTasks} tarefas</p>
                  {schedule.notes && (
                    <p className="text-xs text-muted-foreground italic">"{schedule.notes}"</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Status */}
        <Badge className={cn('text-xs border w-fit', statusStyle.className)}>
          {statusStyle.label}
        </Badge>

        {/* Check-in Date + Time */}
        <div className="flex items-center gap-1">
          <span className="text-sm text-foreground">
            {format(schedule.checkIn, "dd/MM", { locale: ptBR })}
            <span className="text-muted-foreground ml-1 text-xs">
              {format(schedule.checkIn, "HH:mm")}
            </span>
          </span>
        </div>

        {/* Check-out Date + Time - BOLD */}
        <div className="flex items-center gap-1">
          <span className="text-sm text-foreground font-bold">
            {format(schedule.checkOut, "dd/MM", { locale: ptBR })}
            <span className="text-foreground font-bold ml-1 text-xs">
              {format(schedule.checkOut, "HH:mm")}
            </span>
          </span>
          <Popover open={isEditingTimes} onOpenChange={setIsEditingTimes}>
            <PopoverTrigger asChild>
              <button 
                onClick={(e) => e.stopPropagation()}
                className="p-1 rounded hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
              >
                <Pencil className="w-3 h-3 text-muted-foreground hover:text-primary" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" onClick={(e) => e.stopPropagation()}>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Check-in</label>
                  <Input
                    type="time"
                    value={editCheckInTime}
                    onChange={(e) => setEditCheckInTime(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Check-out</label>
                  <Input
                    type="time"
                    value={editCheckOutTime}
                    onChange={(e) => setEditCheckOutTime(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <Button size="sm" className="w-full" onClick={handleSaveTimes}>
                  Salvar
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Cleaner */}
        <span className="text-sm text-foreground truncate">
          {schedule.cleanerName}
        </span>

        {/* Tags */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className={cn('text-xs border', priorityStyle.className)}>
            {priorityStyle.label}
          </Badge>
          {schedule.maintenanceStatus !== 'ok' && (
            <Badge className="text-xs bg-status-alert-bg text-status-alert border border-status-alert/30">
              Avaria
            </Badge>
          )}
        </div>
      </div>

      {/* Mobile: Compact layout */}
      <div 
        className="flex md:hidden items-center gap-3 p-3 cursor-pointer"
        onClick={onClick}
      >
        <button
          onClick={handleExpand}
          className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
        >
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </button>
        {maintenanceIcons[schedule.maintenanceStatus]}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate text-sm">
            {schedule.propertyName}
          </h3>
          <p className="text-xs text-muted-foreground">
            <span className="font-bold">{format(schedule.checkOut, "dd/MM HH:mm")}</span> • {schedule.numberOfGuests} hóspede(s) • {schedule.cleanerName}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Popover>
            <PopoverTrigger asChild>
              <button 
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded hover:bg-muted transition-colors"
              >
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" onClick={(e) => e.stopPropagation()}>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Check-in</label>
                  <Input
                    type="time"
                    value={editCheckInTime}
                    onChange={(e) => setEditCheckInTime(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Check-out</label>
                  <Input
                    type="time"
                    value={editCheckOutTime}
                    onChange={(e) => setEditCheckOutTime(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <Button size="sm" className="w-full" onClick={handleSaveTimes}>
                  Salvar
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <div className="flex items-center gap-1">
            <Badge className={cn('text-[10px] px-1.5 py-0.5 border', statusStyle.className)}>
              {statusStyle.label.substring(0, 3)}
            </Badge>
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0.5 border', priorityStyle.className)}>
              {priorityStyle.label.substring(0, 1)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t bg-muted/30 animate-slide-in">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {/* Check-in */}
            <div>
              <p className="text-muted-foreground text-xs mb-1">Check-in</p>
              <p className="font-medium">{format(schedule.checkIn, "dd/MM HH:mm", { locale: ptBR })}</p>
            </div>

            {/* Check-out */}
            <div>
              <p className="text-muted-foreground text-xs mb-1">Check-out</p>
              <p className="font-medium">{format(schedule.checkOut, "HH:mm", { locale: ptBR })}</p>
            </div>

            {/* Duration */}
            <div>
              <p className="text-muted-foreground text-xs mb-1">Tempo Estimado</p>
              <p className="font-medium">{schedule.estimatedDuration} min</p>
            </div>

            {/* Progress */}
            <div>
              <p className="text-muted-foreground text-xs mb-1">Progresso</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-status-completed rounded-full transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs font-medium">{completedTasks}/{totalTasks}</span>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="mt-3 text-sm">
            <p className="text-muted-foreground text-xs mb-1">Endereço</p>
            <p className="text-foreground">{schedule.propertyAddress}</p>
          </div>

          {/* Issues & Materials */}
          {(schedule.maintenanceIssues.length > 0 || schedule.missingMaterials.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {schedule.maintenanceIssues.map(issue => (
                <Badge 
                  key={issue.id} 
                  variant="outline" 
                  className="bg-status-alert-bg text-status-alert border-status-alert/30 text-xs"
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {issue.description}
                </Badge>
              ))}
              {schedule.missingMaterials.map(material => (
                <Badge 
                  key={material} 
                  variant="outline" 
                  className="bg-status-progress-bg text-status-progress border-status-progress/30 text-xs"
                >
                  {material}
                </Badge>
              ))}
            </div>
          )}

          {/* Notes */}
          {schedule.notes && (
            <div className="mt-3 p-2 bg-muted/50 rounded text-sm text-muted-foreground">
              <span className="font-medium">Obs:</span> {schedule.notes}
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={onClick}
            className="mt-4 w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Ver Detalhes Completos
          </button>
        </div>
      )}
    </div>
  );
}
