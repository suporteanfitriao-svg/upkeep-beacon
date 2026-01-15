import { useState, useEffect, useMemo } from 'react';
import { Schedule, ScheduleStatus, STATUS_FLOW, STATUS_LABELS, STATUS_ALLOWED_ROLES, ChecklistItem } from '@/types/scheduling';
import { cn } from '@/lib/utils';
import { AlertTriangle, Check, Clock, Sparkles, ChevronDown, ChevronUp, ExternalLink, User, Timer, Play, CircleCheck, KeyRound, MessageSquare, Send, AlertCircle } from 'lucide-react';
import { wasCompletedWithDelay, getDelayMinutes } from '@/hooks/useCleaningTimeAlert';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AssignCleanerPopover } from './AssignCleanerPopover';
import { EditTimesPopover } from './EditTimesPopover';
import { PasswordModal } from './PasswordModal';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { toast } from 'sonner';

interface AdminScheduleRowProps {
  schedule: Schedule;
  onClick: () => void;
  onScheduleUpdated?: (schedule: Schedule) => void;
}

const statusConfig: Record<ScheduleStatus, { 
  label: string; 
  borderColor: string;
  bgColor: string;
  iconBgColor: string;
  textColor: string;
  icon: typeof Clock;
  showTime?: boolean;
}> = {
  waiting: { 
    label: 'Aguardando Liberação', 
    borderColor: 'bg-amber-500',
    bgColor: 'bg-[#FFF8E1] dark:bg-amber-900/30',
    iconBgColor: 'bg-[#FFF8E1] dark:bg-amber-900/30',
    textColor: 'text-amber-600 dark:text-amber-400',
    icon: Clock,
  },
  released: { 
    label: 'Liberado', 
    borderColor: 'bg-green-500',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    iconBgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-600 dark:text-green-400',
    icon: Check,
    showTime: true,
  },
  cleaning: { 
    label: 'Em Limpeza', 
    borderColor: 'bg-primary',
    bgColor: 'bg-[#E0F2F1] dark:bg-teal-900/30',
    iconBgColor: 'bg-[#E0F2F1] dark:bg-teal-900/30',
    textColor: 'text-primary',
    icon: Sparkles,
    showTime: true,
  },
  completed: { 
    label: 'Finalizado', 
    borderColor: 'bg-green-500',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    iconBgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-600 dark:text-green-400',
    icon: Check,
    showTime: true,
  },
};

const avatarColors = [
  { bg: 'bg-primary/10', border: 'border-primary/20', text: 'text-primary' },
  { bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-orange-200 dark:border-orange-700/50', text: 'text-orange-600 dark:text-orange-400' },
  { bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-200 dark:border-blue-700/50', text: 'text-blue-600 dark:text-blue-400' },
  { bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-200 dark:border-purple-700/50', text: 'text-purple-600 dark:text-purple-400' },
  { bg: 'bg-rose-100 dark:bg-rose-900/30', border: 'border-rose-200 dark:border-rose-700/50', text: 'text-rose-600 dark:text-rose-400' },
];

function getAvatarColor(name: string) {
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % avatarColors.length;
  return avatarColors[index];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function AdminScheduleRow({ schedule, onClick, onScheduleUpdated }: AdminScheduleRowProps) {
  const { isAdmin, isManager } = useUserRole();
  const { user } = useAuth();
  const [teamMemberId, setTeamMemberId] = useState<string | null>(null);
  const [localSchedule, setLocalSchedule] = useState(schedule);
  const [isExpanded, setIsExpanded] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    targetStatus: ScheduleStatus | null;
    isRelease: boolean;
  }>({ open: false, targetStatus: null, isRelease: false });
  const [passwordMode, setPasswordMode] = useState<'ical' | 'manual' | 'global' | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState(schedule.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const statusStyle = statusConfig[localSchedule.status];
  const hasIssue = localSchedule.maintenanceStatus !== 'ok';
  const checkoutTime = format(localSchedule.checkOut, "HH:mm");
  const checkinTime = format(localSchedule.checkIn, "HH:mm");
  const avatarColor = getAvatarColor(localSchedule.cleanerName);
  const Icon = statusStyle.icon;
  const isCompleted = localSchedule.status === 'completed';
  const canManage = isAdmin || isManager;
  const hasManualPassword = Boolean(localSchedule.accessPassword);

  // Calculate NOK (not_ok) items count for visual indicator
  const nokItemsCount = useMemo(() => {
    return localSchedule.checklist.filter(item => item.status === 'not_ok').length;
  }, [localSchedule.checklist]);

  // Check if completed with delay
  const completedWithDelay = useMemo(() => wasCompletedWithDelay(localSchedule), [localSchedule]);
  const delayMinutes = useMemo(() => getDelayMinutes(localSchedule), [localSchedule]);

  // Fetch property password mode
  useEffect(() => {
    const fetchPasswordMode = async () => {
      if (!localSchedule.propertyId) return;
      const { data } = await supabase
        .from('properties')
        .select('password_mode')
        .eq('id', localSchedule.propertyId)
        .single();
      if (data) setPasswordMode(data.password_mode as 'ical' | 'manual' | 'global');
    };
    fetchPasswordMode();
  }, [localSchedule.propertyId]);

  // Fetch team member id for current user
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
  }, [schedule]);

  const handleAssigned = (cleanerName: string, cleanerTeamMemberId: string) => {
    const updated = {
      ...localSchedule,
      cleanerName,
      responsibleTeamMemberId: cleanerTeamMemberId,
    };
    setLocalSchedule(updated);
    onScheduleUpdated?.(updated);
  };

  const handleTimesUpdated = (checkIn: Date, checkOut: Date) => {
    const updated = {
      ...localSchedule,
      checkIn,
      checkOut,
    };
    setLocalSchedule(updated);
    onScheduleUpdated?.(updated);
  };

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

  // Cleaner cannot reassign during cleaning, only admin can
  const canReassignDuringCleaning = isAdmin;
  const isReassignDisabled = localSchedule.status === 'cleaning' && !canReassignDuringCleaning;

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleOpenDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };

  const handleReleaseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!teamMemberId || localSchedule.status !== 'waiting') return;
    setConfirmDialog({ open: true, targetStatus: 'released', isRelease: true });
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
        team_member_name: null,
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

  const handleStatusClick = (status: ScheduleStatus) => {
    if (!teamMemberId || status === localSchedule.status) return;
    setConfirmDialog({ open: true, targetStatus: status, isRelease: false });
  };

  const handleStatusChange = async (newStatus: ScheduleStatus) => {
    if (!teamMemberId || newStatus === localSchedule.status) return;

    // Check if transition is valid
    const nextStatus = STATUS_FLOW[localSchedule.status];
    if (nextStatus !== newStatus) {
      toast.error('Transição de status inválida');
      return;
    }

    // Check if user role is allowed
    const userRole = isAdmin ? 'admin' : isManager ? 'manager' : 'cleaner';
    if (!STATUS_ALLOWED_ROLES[newStatus].includes(userRole as any)) {
      toast.error('Você não tem permissão para esta transição');
      return;
    }

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
        team_member_name: null,
        role: userRole,
        action: 'status_change',
        from_status: localSchedule.status,
        to_status: newStatus,
        payload: {},
      };

      const updateData: Record<string, unknown> = {
        status: newStatus,
        history: [...existingHistory, historyEvent],
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'cleaning') {
        updateData.start_at = new Date().toISOString();
      } else if (newStatus === 'completed') {
        updateData.end_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('schedules')
        .update(updateData)
        .eq('id', localSchedule.id);

      if (error) throw error;

      const updated = { ...localSchedule, status: newStatus };
      setLocalSchedule(updated);
      onScheduleUpdated?.(updated);
      toast.success(`Status alterado para: ${STATUS_LABELS[newStatus]}`);
    } catch (error) {
      console.error('Error changing status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const handleConfirmStatusChange = async () => {
    if (confirmDialog.isRelease) {
      await handleReleaseForCleaning();
    } else if (confirmDialog.targetStatus) {
      await handleStatusChange(confirmDialog.targetStatus);
    }
    setConfirmDialog({ open: false, targetStatus: null, isRelease: false });
  };

  const getAvailableTransitions = (): ScheduleStatus[] => {
    const nextStatus = STATUS_FLOW[localSchedule.status];
    if (!nextStatus) return [];
    
    const userRole = isAdmin ? 'admin' : isManager ? 'manager' : 'cleaner';
    if (!STATUS_ALLOWED_ROLES[nextStatus].includes(userRole as any)) return [];
    
    return [nextStatus];
  };

  const canRelease = canManage && localSchedule.status === 'waiting';
  const availableTransitions = canManage ? getAvailableTransitions() : [];

  const getConfirmationMessage = () => {
    if (confirmDialog.isRelease) {
      return {
        title: 'Liberar para Limpeza',
        description: `Tem certeza que deseja liberar "${localSchedule.propertyName}" para limpeza? Esta ação permitirá que o responsável inicie o serviço.`,
      };
    }
    if (confirmDialog.targetStatus) {
      return {
        title: `Alterar Status para "${STATUS_LABELS[confirmDialog.targetStatus]}"`,
        description: `Tem certeza que deseja alterar o status de "${localSchedule.propertyName}" de "${STATUS_LABELS[localSchedule.status]}" para "${STATUS_LABELS[confirmDialog.targetStatus]}"?`,
      };
    }
    return { title: '', description: '' };
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <article 
        className={cn(
          'bg-card rounded-3xl shadow-sm border border-border relative overflow-hidden group transition-all',
          isCompleted && 'opacity-75 hover:opacity-100',
          isExpanded && 'shadow-md'
        )}
      >
        {/* Left Border Indicator */}
        <div className={cn('absolute left-0 top-0 bottom-0 w-1.5', hasIssue && isCompleted ? 'bg-rose-500' : statusStyle.borderColor)} />
        
        {/* Main Row - Collapsible Trigger */}
        <CollapsibleTrigger asChild>
          <div 
            onClick={handleToggleExpand}
            className="p-5 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-4 pl-2">
              {/* Status Icon */}
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform',
                statusStyle.iconBgColor
              )}>
                {localSchedule.status === 'cleaning' ? (
                  <Sparkles className={cn('w-5 h-5', statusStyle.textColor)} />
                ) : (
                  <Icon className={cn('w-5 h-5', statusStyle.textColor)} />
                )}
              </div>
              
              {/* Property Info */}
              <div>
                <h4 className="font-bold text-foreground">{localSchedule.propertyName}</h4>
                <div className="flex items-center gap-2">
                  {localSchedule.status === 'cleaning' && (
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                  <p className={cn('text-sm font-medium', statusStyle.textColor)}>
                    {statusStyle.label}
                    {statusStyle.showTime && ` - ${checkoutTime}`}
                  </p>
                  {hasIssue && (
                    <div className="flex items-center gap-1 bg-rose-100 dark:bg-rose-900/40 px-2 py-0.5 rounded-full">
                      <AlertTriangle className="w-3 h-3 text-rose-500" />
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide">
                        Avaria
                      </span>
                    </div>
                  )}
                  {/* NOK items indicator */}
                  {nokItemsCount > 0 && (
                    <div className="flex items-center gap-1 bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded-full" title={`${nokItemsCount} item(ns) marcado(s) como NOK no checklist`}>
                      <span className="material-symbols-outlined text-[12px] text-red-500">close</span>
                      <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">
                        {nokItemsCount} NOK
                      </span>
                    </div>
                  )}
                  {/* Completed with delay indicator */}
                  {completedWithDelay && (
                    <div 
                      className="flex items-center gap-1 bg-orange-100 dark:bg-orange-900/40 px-2 py-0.5 rounded-full" 
                      title={`Concluído com ${delayMinutes} minutos de atraso após check-in`}
                    >
                      <AlertCircle className="w-3 h-3 text-orange-500" />
                      <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide">
                        +{delayMinutes}min atraso
                      </span>
                    </div>
                  )}
                  {/* Password indicator for manual mode */}
                  {passwordMode === 'manual' && canManage && (
                    hasManualPassword ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPasswordModal(true);
                        }}
                        className="flex items-center gap-1 bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded-full hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors"
                        title="Senha definida - clique para alterar"
                      >
                        <Check className="w-3 h-3 text-green-500" />
                        <KeyRound className="w-3 h-3 text-green-500" />
                        <span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wide">
                          Senha
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPasswordModal(true);
                        }}
                        className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 rounded-full hover:bg-purple-200 dark:hover:bg-purple-900/60 transition-colors"
                        title="Definir senha manual"
                      >
                        <KeyRound className="w-3 h-3 text-purple-500" />
                        <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                          Senha
                        </span>
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-6 md:gap-10">
              {/* Checkout Time */}
              <div className="hidden md:block text-right">
                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-0.5">
                  Checkout Previsto
                </p>
                <div className="flex items-center justify-end gap-1.5 text-foreground">
                  <Clock className="w-3 h-3" />
                  <span className="font-semibold text-sm">{checkoutTime}</span>
                </div>
              </div>
              
              {/* Responsible */}
              <div className="flex items-center gap-3">
                <div className="hidden lg:block text-right">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-0.5">
                    Responsável
                  </p>
                  <p className="text-xs font-semibold text-foreground">{localSchedule.cleanerName}</p>
                </div>
                <div 
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border',
                    avatarColor.bg,
                    avatarColor.border,
                    avatarColor.text
                  )}
                  title={localSchedule.cleanerName}
                >
                  {getInitials(localSchedule.cleanerName)}
                </div>
              </div>

              {/* Status Actions - Release Button */}
              {canRelease && (
                <button
                  onClick={handleReleaseClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors text-xs font-semibold"
                  title="Liberar para limpeza"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Liberar</span>
                </button>
              )}

              {/* Status Dropdown for transitions */}
              {availableTransitions.length > 0 && localSchedule.status !== 'waiting' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors text-xs font-semibold border',
                        statusStyle.bgColor,
                        statusStyle.textColor,
                        'hover:opacity-80'
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{statusStyle.label}</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    {availableTransitions.map((status) => (
                      <DropdownMenuItem
                        key={status}
                        onClick={() => handleStatusClick(status)}
                        className="gap-2"
                      >
                        {status === 'released' && <Play className="w-4 h-4" />}
                        {status === 'cleaning' && <Sparkles className="w-4 h-4" />}
                        {status === 'completed' && <CircleCheck className="w-4 h-4" />}
                        {STATUS_LABELS[status]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              {/* Chevron */}
              <button className="text-muted-foreground hover:text-primary transition-colors ml-2">
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </CollapsibleTrigger>

        {/* Expanded Details */}
        <CollapsibleContent>
          <div className="px-5 pb-5 pt-0 border-t border-border/50">
            <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Responsible Section */}
              <div className="bg-muted/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Responsável
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div 
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border',
                        avatarColor.bg,
                        avatarColor.border,
                        avatarColor.text
                      )}
                    >
                      {getInitials(localSchedule.cleanerName)}
                    </div>
                    <span className="font-semibold text-foreground">{localSchedule.cleanerName}</span>
                  </div>
                  {canManage && (
                    <AssignCleanerPopover
                      scheduleId={localSchedule.id}
                      propertyId={localSchedule.propertyId}
                      currentCleanerName={localSchedule.cleanerName}
                      responsibleTeamMemberId={localSchedule.responsibleTeamMemberId || null}
                      status={localSchedule.status}
                      onAssigned={handleAssigned}
                      disabled={isReassignDisabled}
                    />
                  )}
                </div>
              </div>

              {/* Times Section */}
              <div className="bg-muted/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Timer className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Horários
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Check-in:</span>
                      <span className="font-semibold text-foreground">{checkinTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Check-out:</span>
                      <span className="font-semibold text-foreground">{checkoutTime}</span>
                    </div>
                  </div>
                  {canManage && (
                    <EditTimesPopover
                      scheduleId={localSchedule.id}
                      checkIn={localSchedule.checkIn}
                      checkOut={localSchedule.checkOut}
                      status={localSchedule.status}
                      onUpdated={handleTimesUpdated}
                      teamMemberId={teamMemberId}
                    />
                  )}
                </div>
              </div>

              {/* Password Section - Only for manual mode */}
              {passwordMode === 'manual' && canManage && (
                <div className="bg-muted/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <KeyRound className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Senha Manual
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {hasManualPassword ? (
                        <>
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium">
                            <Check className="w-3 h-3" />
                            Definida
                          </span>
                          <span className="font-mono text-sm font-bold text-foreground tracking-widest">
                            {localSchedule.accessPassword}
                          </span>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          Não definida
                        </span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPasswordModal(true);
                      }}
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      {hasManualPassword ? 'Alterar' : 'Definir'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Quick Info & Open Details */}
              <div className="bg-muted/30 rounded-xl p-4 flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Info
                  </span>
                </div>
                <div className="flex flex-col gap-1 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Data:</span>
                    <span className="font-medium text-foreground text-sm">
                      {format(localSchedule.checkOut, "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  {localSchedule.estimatedDuration && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Duração est.:</span>
                      <span className="font-medium text-foreground text-sm">
                        {localSchedule.estimatedDuration} min
                      </span>
                    </div>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full gap-2"
                  onClick={handleOpenDetails}
                >
                  <ExternalLink className="w-4 h-4" />
                  Acessar Detalhes
                </Button>
              </div>
            </div>

            {/* Observations Section */}
            <div className="px-5 pb-5 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Admin Notes - Editable */}
              <div className="bg-muted/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Observação para o Cleaner
                    </span>
                  </div>
                  {canManage && adminNotes !== localSchedule.notes && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveNotes();
                      }}
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
                    onClick={(e) => e.stopPropagation()}
                    className="w-full h-20 bg-background/50 border border-border rounded-lg p-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Adicione observações que o cleaner verá ao abrir a tarefa..."
                  />
                ) : (
                  <p className="text-sm text-foreground">
                    {localSchedule.notes || 'Sem observações'}
                  </p>
                )}
              </div>

              {/* Cleaner Observations - Read Only for Admin */}
              <div className="bg-muted/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Observações do Cleaner
                  </span>
                </div>
                <div className="min-h-[80px] bg-background/50 border border-border rounded-lg p-2">
                  {localSchedule.cleanerObservations ? (
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {localSchedule.cleanerObservations}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Nenhuma observação do cleaner ainda
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </article>

      {/* Password Modal */}
      {showPasswordModal && (
        <PasswordModal
          propertyId={localSchedule.propertyId}
          propertyName={localSchedule.propertyName}
          scheduleId={localSchedule.id}
          scheduleDate={localSchedule.checkOut.toISOString()}
          scheduleStatus={localSchedule.status}
          passwordFromIcal={localSchedule.doorPassword}
          accessPassword={localSchedule.accessPassword}
          teamMemberId={teamMemberId}
          onClose={() => setShowPasswordModal(false)}
          onPasswordUpdated={(newPassword) => {
            const updated = { ...localSchedule, accessPassword: newPassword };
            setLocalSchedule(updated);
            onScheduleUpdated?.(updated);
          }}
        />
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, targetStatus: null, isRelease: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getConfirmationMessage().title}</AlertDialogTitle>
            <AlertDialogDescription>
              {getConfirmationMessage().description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmStatusChange}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Collapsible>
  );
}