import { memo, useState, useEffect, useMemo } from 'react';
import { format, startOfDay, isBefore, isSameDay, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Clock, Check, ChevronDown, ChevronUp, Building2, User, Play, 
  MapPin, Key, UserPlus, Eye, Timer, MessageSquare, Send, 
  AlertTriangle, Sparkles, ExternalLink, CircleCheck, AlertCircle
} from 'lucide-react';
import { Schedule, ScheduleStatus, STATUS_LABELS, STATUS_FLOW, STATUS_ALLOWED_ROLES } from '@/types/scheduling';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { wasCompletedWithDelay, getDelayMinutes } from '@/hooks/useCleaningTimeAlert';
import { useCleaningDelay } from '@/hooks/useCleaningDelay';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface MobileAdminScheduleCardProps {
  schedule: Schedule;
  onScheduleClick: (schedule: Schedule) => void;
  onAssignCleaner?: (schedule: Schedule) => void;
  onViewAddress?: (schedule: Schedule) => void;
  onViewPassword?: (schedule: Schedule) => void;
  onRelease?: (schedule: Schedule) => void;
  onScheduleUpdated?: (schedule: Schedule) => void;
  isCompleted?: boolean;
}

const STATUS_CONFIG: Record<ScheduleStatus, { label: string; color: string; bgColor: string; dotColor: string; icon: typeof Clock }> = {
  waiting: { 
    label: 'Aguardando', 
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    dotColor: 'bg-orange-500',
    icon: Clock
  },
  released: { 
    label: 'Liberado', 
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    dotColor: 'bg-primary',
    icon: Check
  },
  cleaning: { 
    label: 'Em Limpeza', 
    color: 'text-[#E0C051]',
    bgColor: 'bg-[#E0C051]/10',
    dotColor: 'bg-[#E0C051]',
    icon: Sparkles
  },
  completed: { 
    label: 'Finalizado', 
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    dotColor: 'bg-emerald-500',
    icon: CircleCheck
  },
};

// Check if schedule is overdue
const isOverdue = (schedule: Schedule): boolean => {
  const today = startOfDay(new Date());
  const scheduleDate = startOfDay(schedule.checkOut);
  return isBefore(scheduleDate, today) && (schedule.status === 'waiting' || schedule.status === 'released');
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export const MobileAdminScheduleCard = memo(function MobileAdminScheduleCard({
  schedule,
  onScheduleClick,
  onAssignCleaner,
  onViewAddress,
  onViewPassword,
  onRelease,
  onScheduleUpdated,
  isCompleted = false
}: MobileAdminScheduleCardProps) {
  const { isAdmin, isManager } = useUserRole();
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [localSchedule, setLocalSchedule] = useState(schedule);
  const [teamMemberId, setTeamMemberId] = useState<string | null>(null);
  
  // Times editing state
  const [isEditingTimes, setIsEditingTimes] = useState(false);
  const [checkInTime, setCheckInTime] = useState(format(schedule.checkIn, 'HH:mm'));
  const [checkOutTime, setCheckOutTime] = useState(format(schedule.checkOut, 'HH:mm'));
  const [isSavingTimes, setIsSavingTimes] = useState(false);
  
  // Notes editing state
  const [adminNotes, setAdminNotes] = useState(schedule.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  
  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    targetStatus: ScheduleStatus | null;
    isRelease: boolean;
    isEarlyRelease: boolean;
  }>({ open: false, targetStatus: null, isRelease: false, isEarlyRelease: false });

  const statusConfig = STATUS_CONFIG[localSchedule.status];
  const taskOverdue = isOverdue(localSchedule);
  const canManage = isAdmin || isManager;
  const StatusIcon = statusConfig.icon;
  
  // Real-time cleaning delay tracking
  const { isDelayed, delayMinutes: liveDelayMinutes, formattedDelay, canBeDelayed } = useCleaningDelay(localSchedule);
  
  // Calculate NOK items count
  const nokItemsCount = useMemo(() => {
    return localSchedule.checklist?.filter(item => item.status === 'not_ok').length || 0;
  }, [localSchedule.checklist]);

  // Check if completed with delay (for historical display on completed cards)
  const completedWithDelay = useMemo(() => wasCompletedWithDelay(localSchedule), [localSchedule]);
  const historicalDelayMinutes = useMemo(() => getDelayMinutes(localSchedule), [localSchedule]);
  
  // Format delay time for historical display
  const formatHistoricalDelayTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `+${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
    }
    return `+${mins}min`;
  };

  // Fetch team member id
  useEffect(() => {
    const fetchTeamMemberId = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) setTeamMemberId(data.id);
    };
    fetchTeamMemberId();
  }, [user?.id]);

  // Sync with parent schedule updates
  useEffect(() => {
    setLocalSchedule(schedule);
    setAdminNotes(schedule.notes || '');
    setCheckInTime(format(schedule.checkIn, 'HH:mm'));
    setCheckOutTime(format(schedule.checkOut, 'HH:mm'));
  }, [schedule]);

  const handleSaveNotes = async () => {
    if (!canManage || adminNotes === localSchedule.notes) return;
    
    setIsSavingNotes(true);
    try {
      const { error } = await supabase
        .from('schedules')
        .update({ notes: adminNotes })
        .eq('id', localSchedule.id);

      if (error) throw error;

      const updated = { ...localSchedule, notes: adminNotes };
      setLocalSchedule(updated);
      onScheduleUpdated?.(updated);
      toast.success('Observação salva!');
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Erro ao salvar observação');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleSaveTimes = async () => {
    if (!canManage || localSchedule.status === 'completed') return;
    
    setIsSavingTimes(true);
    try {
      const { data: currentData, error: fetchError } = await supabase
        .from('schedules')
        .select('check_in_time, check_out_time, history')
        .eq('id', localSchedule.id)
        .single();

      if (fetchError) throw fetchError;

      const currentCheckIn = new Date(currentData.check_in_time);
      const currentCheckOut = new Date(currentData.check_out_time);
      const newCheckIn = new Date(currentCheckIn);
      const newCheckOut = new Date(currentCheckOut);

      const [inHours, inMinutes] = checkInTime.split(':').map(Number);
      const [outHours, outMinutes] = checkOutTime.split(':').map(Number);

      newCheckIn.setHours(inHours, inMinutes, 0, 0);
      newCheckOut.setHours(outHours, outMinutes, 0, 0);

      const historyEvent = {
        timestamp: new Date().toISOString(),
        team_member_id: teamMemberId || 'system',
        action: 'alteracao_horario',
        from_status: localSchedule.status,
        to_status: localSchedule.status,
        payload: {
          previous_check_in: currentCheckIn.toISOString(),
          previous_check_out: currentCheckOut.toISOString(),
          new_check_in: newCheckIn.toISOString(),
          new_check_out: newCheckOut.toISOString(),
        },
      };

      const currentHistory = Array.isArray(currentData?.history) ? currentData.history : [];

      const { error: updateError } = await supabase
        .from('schedules')
        .update({
          check_in_time: newCheckIn.toISOString(),
          check_out_time: newCheckOut.toISOString(),
          history: [...currentHistory, historyEvent],
        })
        .eq('id', localSchedule.id);

      if (updateError) throw updateError;

      const updated = { ...localSchedule, checkIn: newCheckIn, checkOut: newCheckOut };
      setLocalSchedule(updated);
      onScheduleUpdated?.(updated);
      toast.success('Horários atualizados!');
      setIsEditingTimes(false);
    } catch (error) {
      console.error('Error updating times:', error);
      toast.error('Erro ao atualizar horários');
    } finally {
      setIsSavingTimes(false);
    }
  };

  const handleReleaseClick = () => {
    if (!teamMemberId || localSchedule.status !== 'waiting') return;
    
    const today = startOfDay(new Date());
    const checkoutDay = startOfDay(localSchedule.checkOut);
    const isEarlyRelease = !isSameDay(today, checkoutDay) && !isAfter(today, checkoutDay);
    
    setConfirmDialog({ open: true, targetStatus: 'released', isRelease: true, isEarlyRelease });
  };

  const handleReleaseForCleaning = async () => {
    if (!teamMemberId || localSchedule.status !== 'waiting') return;
    
    try {
      const { data: currentData, error: fetchError } = await supabase
        .from('schedules')
        .select('history')
        .eq('id', localSchedule.id)
        .single();

      if (fetchError) throw fetchError;

      const existingHistory = Array.isArray(currentData?.history) ? currentData.history : [];
      const historyEvent = {
        timestamp: new Date().toISOString(),
        team_member_id: teamMemberId,
        role: isAdmin ? 'admin' : 'manager',
        action: 'status_change',
        from_status: 'waiting',
        to_status: 'released',
        payload: {},
      };

      const { error } = await supabase
        .from('schedules')
        .update({
          status: 'released',
          history: [...existingHistory, historyEvent],
          updated_at: new Date().toISOString(),
        })
        .eq('id', localSchedule.id);

      if (error) throw error;

      const updated = { ...localSchedule, status: 'released' as ScheduleStatus };
      setLocalSchedule(updated);
      onScheduleUpdated?.(updated);
      toast.success('Liberado para limpeza!');
    } catch (error) {
      console.error('Error releasing schedule:', error);
      toast.error('Erro ao liberar para limpeza');
    }
  };

  const handleConfirmStatusChange = async () => {
    if (confirmDialog.isRelease) {
      await handleReleaseForCleaning();
    }
    setConfirmDialog({ open: false, targetStatus: null, isRelease: false, isEarlyRelease: false });
  };

  const getConfirmationMessage = () => {
    if (confirmDialog.isRelease) {
      const checkoutDate = format(localSchedule.checkOut, "dd/MM/yyyy");
      if (confirmDialog.isEarlyRelease) {
        return {
          title: '⚠️ Liberação Antecipada',
          description: `O checkout está agendado para ${checkoutDate}. Ainda não é o dia do checkout. Deseja liberar antecipadamente?`,
        };
      }
      return {
        title: 'Liberar para Limpeza',
        description: `Liberar "${localSchedule.propertyName}" para limpeza?`,
      };
    }
    return { title: '', description: '' };
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <article
        className={cn(
          "relative overflow-hidden rounded-2xl shadow-soft transition-all border",
          isCompleted && "opacity-60",
          // Alert state: cleaning delay (past check-in, not completed)
          isDelayed 
            ? "bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-700 ring-2 ring-red-300 dark:ring-red-800/50" 
            : "bg-white dark:bg-[#2d3138]",
          // Overdue state (past checkout date, waiting/released)
          !isDelayed && taskOverdue 
            ? "border-red-300 dark:border-red-800 ring-1 ring-red-200 dark:ring-red-900/50" 
            : !isDelayed && "border-slate-100 dark:border-slate-700",
          isExpanded && "shadow-md"
        )}
      >
        {/* Live Delay Alert Banner */}
        {isDelayed && (
          <div className="bg-red-500 text-white px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">LIMPEZA EM ATRASO</span>
            </div>
            <span className="text-sm font-bold">Atraso: {formattedDelay}</span>
          </div>
        )}
        
        {/* Main Row - Collapsible Trigger */}
        <CollapsibleTrigger asChild>
          <button className="w-full text-left p-4">
            <div className="flex gap-3">
              {/* Property Image */}
              {schedule.propertyImageUrl ? (
                <img 
                  src={schedule.propertyImageUrl}
                  alt={schedule.propertyName}
                  className="w-14 h-14 shrink-0 rounded-xl object-cover border border-slate-100 dark:border-slate-700"
                />
              ) : (
                <div className="w-14 h-14 shrink-0 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700">
                  <Building2 className="w-5 h-5 text-slate-400" />
                </div>
              )}
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {/* Status Badge */}
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={cn("h-2 w-2 rounded-full", statusConfig.dotColor, localSchedule.status === 'cleaning' && 'animate-pulse')} />
                      <span className={cn("text-[10px] font-bold uppercase tracking-wider", statusConfig.color)}>
                        {taskOverdue ? 'Atrasada' : statusConfig.label}
                      </span>
                      {taskOverdue && (
                        <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-[9px] font-bold text-red-600 dark:text-red-400">
                          ATRASADA
                        </span>
                      )}
                    </div>
                    
                    {/* Property Name */}
                    <h3 className={cn(
                      "font-bold text-sm truncate text-slate-900 dark:text-white",
                      isCompleted && "line-through decoration-slate-400/50"
                    )}>
                      {localSchedule.propertyName}
                    </h3>
                    
                    {/* Date badge */}
                    <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full mt-0.5 inline-block">
                      {format(localSchedule.checkOut, "dd/MM/yyyy")}
                    </span>
                  </div>
                  
                  {/* Chevron */}
                  <div className="shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
                
                {/* Times & Cleaner */}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="font-medium">{format(localSchedule.checkOut, "HH:mm")}</span>
                    <span className="text-slate-300 dark:text-slate-600">→</span>
                    <span className="font-medium">{format(localSchedule.checkIn, "HH:mm")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[100px]">{localSchedule.cleanerName || 'Sem resp.'}</span>
                  </div>
                </div>
                
                {/* Indicators Row */}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {nokItemsCount > 0 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-[9px] font-bold text-red-600 dark:text-red-400">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      {nokItemsCount} NOK
                    </span>
                  )}
                  {/* Live delay alert - shows when cleaning is in progress and past check-in */}
                  {isDelayed && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-[9px] font-bold text-red-600 dark:text-red-400 animate-pulse">
                      <AlertCircle className="w-2.5 h-2.5" />
                      Atraso: {formattedDelay}
                    </span>
                  )}
                  {/* Historical delay - shows on completed cards that finished late */}
                  {completedWithDelay && !isDelayed && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-[9px] font-bold text-orange-600 dark:text-orange-400">
                      <AlertCircle className="w-2.5 h-2.5" />
                      {formatHistoricalDelayTime(historicalDelayMinutes)} atraso
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        </CollapsibleTrigger>

        {/* Expanded Content */}
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0 border-t border-slate-100 dark:border-slate-700/50 space-y-3">
            
            {/* Quick Actions Row */}
            <div className="pt-3 grid grid-cols-2 gap-2">
              {/* Release Button */}
              {canManage && localSchedule.status === 'waiting' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
                  onClick={handleReleaseClick}
                >
                  <Play className="w-3.5 h-3.5" />
                  Liberar
                </Button>
              )}
              
              {/* Assign Cleaner */}
              {onAssignCleaner && localSchedule.status !== 'completed' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => onAssignCleaner(localSchedule)}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Responsável
                </Button>
              )}
              
              {/* View Address */}
              {onViewAddress && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => onViewAddress(localSchedule)}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Endereço
                </Button>
              )}
              
              {/* View Password */}
              {onViewPassword && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => onViewPassword(localSchedule)}
                >
                  <Key className="w-3.5 h-3.5" />
                  Senha
                </Button>
              )}
            </div>

            {/* Times Section */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Timer className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Horários
                  </span>
                </div>
                {canManage && localSchedule.status !== 'completed' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setIsEditingTimes(!isEditingTimes)}
                  >
                    {isEditingTimes ? 'Cancelar' : 'Editar'}
                  </Button>
                )}
              </div>
              
              {isEditingTimes ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Check-out</Label>
                      <Input
                        type="time"
                        value={checkOutTime}
                        onChange={(e) => setCheckOutTime(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Check-in</Label>
                      <Input
                        type="time"
                        value={checkInTime}
                        onChange={(e) => setCheckInTime(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={handleSaveTimes}
                    disabled={isSavingTimes}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {isSavingTimes ? 'Salvando...' : 'Salvar Horários'}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">Liberado:</span>
                    <span className="font-semibold">{format(localSchedule.checkOut, "HH:mm")}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Hora máx:</span>
                    <span className="font-semibold">{format(localSchedule.checkIn, "HH:mm")}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Info Section */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Informações
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">Data:</span>
                  <span className="font-medium">{format(localSchedule.checkOut, "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
                {localSchedule.estimatedDuration && (
                  <div>
                    <span className="text-xs text-muted-foreground block">Duração est.:</span>
                    <span className="font-medium">{localSchedule.estimatedDuration} min</span>
                  </div>
                )}
                {localSchedule.numberOfGuests && (
                  <div>
                    <span className="text-xs text-muted-foreground block">Hóspedes:</span>
                    <span className="font-medium">{localSchedule.numberOfGuests}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Admin Notes Section */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Obs. para Cleaner
                  </span>
                </div>
                {canManage && adminNotes !== localSchedule.notes && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                  >
                    <Send className="w-3 h-3" />
                    {isSavingNotes ? 'Salvando...' : 'Salvar'}
                  </Button>
                )}
              </div>
              {canManage ? (
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full h-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Adicione observações..."
                />
              ) : (
                <p className="text-sm text-foreground">
                  {localSchedule.notes || 'Sem observações'}
                </p>
              )}
            </div>

            {/* Cleaner Observations Section */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Obs. do Cleaner
                </span>
              </div>
              <div className="min-h-[40px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2">
                {localSchedule.cleanerObservations ? (
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {localSchedule.cleanerObservations}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Nenhuma observação do cleaner
                  </p>
                )}
              </div>
            </div>

            {/* View Details Button - At the end */}
            <Button
              className="w-full gap-2"
              onClick={() => onScheduleClick(localSchedule)}
            >
              <ExternalLink className="w-4 h-4" />
              Ver Detalhes Completos
            </Button>
          </div>
        </CollapsibleContent>
      </article>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, targetStatus: null, isRelease: false, isEarlyRelease: false })}>
        <AlertDialogContent className={confirmDialog.isEarlyRelease ? 'border-amber-500 border-2' : ''}>
          <AlertDialogHeader>
            <AlertDialogTitle className={confirmDialog.isEarlyRelease ? 'text-amber-600 dark:text-amber-400' : ''}>
              {getConfirmationMessage().title}
            </AlertDialogTitle>
            <AlertDialogDescription className={confirmDialog.isEarlyRelease ? 'text-amber-700 dark:text-amber-300' : ''}>
              {getConfirmationMessage().description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmStatusChange}
              className={confirmDialog.isEarlyRelease ? 'bg-amber-600 hover:bg-amber-700' : ''}
            >
              {confirmDialog.isEarlyRelease ? 'Liberar Mesmo Assim' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Collapsible>
  );
});
