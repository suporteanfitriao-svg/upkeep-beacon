import { Schedule, ScheduleStatus, ChecklistItem, MaintenanceIssue, STATUS_LABELS, STATUS_FLOW, STATUS_ALLOWED_ROLES, AppRole, CategoryPhoto } from '@/types/scheduling';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { LocationModal } from './LocationModal';
import { PasswordModal } from './PasswordModal';
import { IssueReportModal } from './IssueReportModal';
import { AttentionModal } from './AttentionModal';
import { ChecklistPendingModal } from './ChecklistPendingModal';
import { NoChecklistModal } from './NoChecklistModal';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useCreateMaintenanceIssue } from '@/hooks/useCreateMaintenanceIssue';
import { useAcknowledgeInfo } from '@/hooks/useAcknowledgeInfo';
import { usePropertyChecklist } from '@/hooks/usePropertyChecklist';
import { usePropertyAccess } from '@/hooks/usePropertyAccess';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CategoryPhotoUpload } from './CategoryPhotoUpload';

interface ScheduleDetailProps {
  schedule: Schedule;
  onClose: () => void;
  onUpdateSchedule: (schedule: Schedule, previousStatus?: ScheduleStatus, teamMemberId?: string) => void;
}

const statusConfig: Record<ScheduleStatus, { label: string; className: string; badgeClass: string; next?: ScheduleStatus; nextLabel?: string }> = {
  waiting: { 
    label: 'Aguardando Liberação', 
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
  const { role, isAdmin, isManager } = useUserRole();
  const { user } = useAuth();
  const [notes, setNotes] = useState(schedule.notes);
  const [checklist, setChecklist] = useState(schedule.checklist);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [checklistItemStates, setChecklistItemStates] = useState<Record<string, 'yes' | 'no' | null>>({});
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAttentionModal, setShowAttentionModal] = useState(false);
  const [showChecklistPendingModal, setShowChecklistPendingModal] = useState(false);
  const [showNoChecklistModal, setShowNoChecklistModal] = useState(false);
  const [pendingCategories, setPendingCategories] = useState<{ name: string; pendingCount: number; totalCount: number }[]>([]);
  const [teamMemberId, setTeamMemberId] = useState<string | null>(null);
  const [requirePhotoPerCategory, setRequirePhotoPerCategory] = useState(false);
  const [categoryPhotosData, setCategoryPhotosData] = useState<Record<string, CategoryPhoto[]>>({});
  const [confirmMarkCategory, setConfirmMarkCategory] = useState<{ open: boolean; category: string | null }>({ open: false, category: null });
  const [unsavedCategories, setUnsavedCategories] = useState<Set<string>>(new Set());
  const [photoUploadModal, setPhotoUploadModal] = useState<{ open: boolean; category: string | null }>({ open: false, category: null });
  const [deleteIssueConfirm, setDeleteIssueConfirm] = useState<{ open: boolean; issueId: string | null }>({ open: false, issueId: null });
  const statusStyle = statusConfig[schedule.status];

  // Fetch property rules (require_photo_per_category)
  useEffect(() => {
    const fetchPropertyRules = async () => {
      const { data } = await supabase
        .from('properties')
        .select('require_photo_per_category')
        .eq('id', schedule.propertyId)
        .maybeSingle();
      if (data) {
        setRequirePhotoPerCategory(data.require_photo_per_category ?? false);
      }
    };
    fetchPropertyRules();
  }, [schedule.propertyId]);

  // Load category photos from schedule (stored in category_photos JSON column)
  useEffect(() => {
    const existingPhotos = schedule.categoryPhotos || {};
    setCategoryPhotosData(existingPhotos);
  }, [schedule]);

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

  // Use the acknowledge hook for "Li e Compreendi" functionality
  const { 
    hasAcknowledged, 
    isSubmitting: isAckSubmitting, 
    toggleAcknowledge 
  } = useAcknowledgeInfo({
    scheduleId: schedule.id,
    currentAcks: schedule.ackByTeamMembers || [],
    teamMemberId,
  });

  // Check if important info exists
  const hasImportantInfo = Boolean(schedule.importantInfo && schedule.importantInfo.trim().length > 0);

  // Check if property has checklist configured (only for released status, to validate before starting)
  const shouldCheckForChecklist = schedule.status === 'released';
  const { 
    hasChecklist: hasPropertyChecklist, 
    isLoading: isCheckingChecklist 
  } = usePropertyChecklist({
    propertyId: schedule.propertyId,
    enabled: shouldCheckForChecklist,
  });

  // Check if user has access to this property (via team_member_properties or has_all_properties)
  const { 
    hasAccess: hasPropertyAccess, 
    isLoading: isCheckingAccess 
  } = usePropertyAccess({
    propertyId: schedule.propertyId,
    teamMemberId,
    enabled: !!teamMemberId,
  });

  // Check if user can perform status transition - Complete business rules validation
  const canTransition = useMemo(() => {
    const nextStatus = statusConfig[schedule.status].next;
    if (!nextStatus || !role) return { allowed: false, reason: 'Sem permissão' };

    // Rule 1: INICIAR LIMPEZA only for status = released
    if (nextStatus === 'cleaning' && schedule.status !== 'released') {
      return { 
        allowed: false, 
        reason: 'Limpeza só pode ser iniciada quando o status for LIBERADO' 
      };
    }

    // Rule 3: Check role permission
    const allowedRoles = STATUS_ALLOWED_ROLES[nextStatus];
    if (!allowedRoles.includes(role as AppRole)) {
      return { 
        allowed: false, 
        reason: `Apenas ${allowedRoles.map(r => r === 'admin' ? 'administradores' : r === 'manager' ? 'gestores' : 'limpadores').join(' ou ')} podem realizar esta ação` 
      };
    }

    // Rule 4: Check property access (only for cleaners starting cleaning)
    if (nextStatus === 'cleaning' && role === 'cleaner' && !hasPropertyAccess && !isCheckingAccess) {
      return { 
        allowed: false, 
        reason: 'Você não está vinculado a este imóvel' 
      };
    }

    // Rule 5: Check important info acknowledgment (for starting cleaning)
    if (nextStatus === 'cleaning' && hasImportantInfo && !hasAcknowledged) {
      return { 
        allowed: false, 
        reason: 'É necessário confirmar a leitura das informações importantes' 
      };
    }

    // Rule 6: Check if property has checklist (for starting cleaning)
    if (nextStatus === 'cleaning' && !hasPropertyChecklist && !isCheckingChecklist) {
      return { 
        allowed: false, 
        reason: 'Este imóvel não possui checklist configurado' 
      };
    }

    // Rule 7: Check concurrency - if there's already a responsible
    if (nextStatus === 'cleaning' && schedule.responsibleTeamMemberId && schedule.responsibleTeamMemberId !== teamMemberId) {
      // Only admin can override
      if (role !== 'admin') {
        return { 
          allowed: false, 
          reason: 'Limpeza já iniciada por outro responsável' 
        };
      }
      // Admin can override but should be logged in history
    }

    return { allowed: true };
  }, [schedule.status, schedule.responsibleTeamMemberId, role, teamMemberId, hasPropertyAccess, isCheckingAccess, hasImportantInfo, hasAcknowledged, hasPropertyChecklist, isCheckingChecklist]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleChecklistItemChange = (itemId: string, value: 'yes' | 'no', category: string) => {
    setChecklistItemStates(prev => ({
      ...prev,
      [itemId]: value
    }));
    
    // Update local checklist state without saving
    const updatedChecklist = checklist.map(item =>
      item.id === itemId ? { ...item, completed: value === 'yes' } : item
    );
    setChecklist(updatedChecklist);
    
    // Mark category as having unsaved changes
    setUnsavedCategories(prev => new Set(prev).add(category));
  };

  // Save category changes to database
  const handleSaveCategory = useCallback(async (category: string) => {
    if (!teamMemberId) return;
    
    // Update schedule with current checklist state
    await onUpdateSchedule({ ...schedule, checklist }, undefined, teamMemberId);
    
    // Remove category from unsaved set
    setUnsavedCategories(prev => {
      const newSet = new Set(prev);
      newSet.delete(category);
      return newSet;
    });
    
    toast.success(`Categoria "${category}" salva!`);
  }, [schedule, checklist, teamMemberId, onUpdateSchedule]);

  // Handle marking entire category as complete
  const handleMarkCategoryComplete = useCallback(async (category: string) => {
    if (schedule.status !== 'cleaning' || !teamMemberId) return;
    
    const categoryItems = checklist.filter(item => item.category === category);
    
    // Check if any item is marked as DX (no) - don't allow bulk marking
    const hasAnyDX = categoryItems.some(item => checklistItemStates[item.id] === 'no');
    if (hasAnyDX) {
      toast.error('Não é possível marcar categoria com itens DX');
      return;
    }
    
    // Mark all items as completed
    const updatedChecklist = checklist.map(item => 
      item.category === category ? { ...item, completed: true } : item
    );
    
    const updatedStates = { ...checklistItemStates };
    categoryItems.forEach(item => {
      updatedStates[item.id] = 'yes';
    });
    
    setChecklist(updatedChecklist);
    setChecklistItemStates(updatedStates);
    
    // Update schedule with new checklist
    await onUpdateSchedule({ ...schedule, checklist: updatedChecklist }, undefined, teamMemberId);
    
    // Log audit entry for category complete
    try {
      await supabase.rpc('append_schedule_history', {
        p_schedule_id: schedule.id,
        p_team_member_id: teamMemberId,
        p_action: 'categoria_checklist_completa',
        p_from_status: null,
        p_to_status: null,
        p_payload: { category_name: category }
      });
    } catch (error) {
      console.error('Error logging category complete:', error);
    }
    
    toast.success(`Categoria "${category}" marcada como completa!`);
    setConfirmMarkCategory({ open: false, category: null });
  }, [schedule, checklist, checklistItemStates, teamMemberId, onUpdateSchedule]);

  // Check if a category has any item marked as DX
  const categoryHasDX = useCallback((category: string) => {
    const categoryItems = checklist.filter(item => item.category === category);
    return categoryItems.some(item => checklistItemStates[item.id] === 'no');
  }, [checklist, checklistItemStates]);

  // Check which categories are missing required photos
  const getCategoriesMissingPhotos = useCallback(() => {
    if (!requirePhotoPerCategory) return [];
    
    const categories = [...new Set(checklist.map(item => item.category))];
    const missingPhotos: string[] = [];
    
    categories.forEach(category => {
      const categoryItems = checklist.filter(item => item.category === category);
      const allCompleted = categoryItems.every(item => item.completed);
      
      // If category is complete but has no photo
      const hasPhoto = categoryPhotosData[category] && categoryPhotosData[category].length > 0;
      if (allCompleted && !hasPhoto) {
        missingPhotos.push(category);
      }
    });
    
    return missingPhotos;
  }, [requirePhotoPerCategory, checklist, categoryPhotosData]);


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
    if (!targetStatus || targetStatus === schedule.status) return;

    // Validate role permission
    if (!canTransition.allowed) {
      toast.error(canTransition.reason);
      return;
    }

    // Check checklist completion for finalizing
    if (targetStatus === 'completed' && checklist.length > 0) {
      const pending = getPendingCategoriesDetails();
      if (pending.length > 0) {
        setPendingCategories(pending);
        setShowChecklistPendingModal(true);
        return;
      }
      
      // Check for required photos per category
      const categoriesMissingPhotos = getCategoriesMissingPhotos();
      if (categoriesMissingPhotos.length > 0) {
        toast.error(`Foto obrigatória pendente em: ${categoriesMissingPhotos.join(', ')}`);
        return;
      }
    }

    const previousStatus = schedule.status;
    const updates: Partial<Schedule> = { status: targetStatus };
    
    if (targetStatus === 'cleaning' && !schedule.startAt) {
      updates.startAt = new Date();
      updates.teamArrival = new Date();
      if (teamMemberId) {
        updates.responsibleTeamMemberId = teamMemberId;
      }
      toast.success('Chegada da equipe registrada! Checklist carregado.');
    }
    
    if (targetStatus === 'completed' && !schedule.endAt) {
      updates.endAt = new Date();
      updates.teamDeparture = new Date();
      toast.success('Saída da equipe registrada!');
    }
    
    onUpdateSchedule({ ...schedule, ...updates }, previousStatus, teamMemberId || undefined);
    toast.success(`Status atualizado para: ${statusConfig[targetStatus].label}`);
  };

  const { createIssue, isCompressing } = useCreateMaintenanceIssue();

  const handleIssueSubmit = async (issue: { 
    category: string; 
    itemLabel: string; 
    description: string; 
    photoFile?: File;
    severity: 'low' | 'medium' | 'high';
  }) => {
    // Get user profile for reported_by_name
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user?.id)
      .maybeSingle();

    await createIssue({
      scheduleId: schedule.id,
      propertyId: schedule.propertyId,
      propertyName: schedule.propertyName,
      category: issue.category,
      itemLabel: issue.itemLabel,
      description: issue.description,
      severity: issue.severity,
      photoFile: issue.photoFile,
      reportedByName: profile?.name || 'Usuário',
    });

    // Update local state to show issue indicator
    const newIssue: MaintenanceIssue = {
      id: `issue-${Date.now()}`,
      description: `[${issue.category} - ${issue.itemLabel}] ${issue.description}`,
      severity: issue.severity,
      reportedAt: new Date(),
      resolved: false
    };

    const updatedIssues = [...schedule.maintenanceIssues, newIssue];
    onUpdateSchedule({ 
      ...schedule, 
      maintenanceIssues: updatedIssues,
      maintenanceStatus: 'needs_maintenance'
    }, undefined, teamMemberId || undefined);
  };

  const handleSaveNotes = () => {
    onUpdateSchedule({ ...schedule, notes });
    toast.success('Observações salvas!');
  };

  const handleDeleteIssue = async (issueId: string) => {
    const updatedIssues = schedule.maintenanceIssues.filter(issue => issue.id !== issueId);
    
    // Update maintenance status if no more issues
    const newMaintenanceStatus = updatedIssues.length === 0 ? 'ok' : 'needs_maintenance';
    
    onUpdateSchedule({ 
      ...schedule, 
      maintenanceIssues: updatedIssues,
      maintenanceStatus: newMaintenanceStatus
    }, undefined, teamMemberId || undefined);
    
    toast.success('Avaria removida!');
    setDeleteIssueConfirm({ open: false, issueId: null });
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

            {/* Important Info - Only show if there's important info */}
            {(hasImportantInfo || true) && (
              <div className="flex flex-col gap-3 mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-[#E0C051] text-[20px]">info</span>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-white">Informações Importantes</h3>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">
                    ⚠️ <span className="font-bold text-slate-800 dark:text-slate-200">Atenção:</span>{' '}
                    {schedule.importantInfo || 'O hóspede solicitou especial cuidado com os tapetes da sala devido a alergias. Utilize o aspirador em potência máxima.'}
                  </p>
                </div>
                <label className={cn(
                  "flex items-center gap-3 p-1 cursor-pointer group",
                  hasAcknowledged && "opacity-75 cursor-default"
                )}>
                  <input 
                    type="checkbox"
                    checked={hasAcknowledged}
                    disabled={hasAcknowledged || isAckSubmitting}
                    onChange={async (e) => {
                      if (e.target.checked && !hasAcknowledged) {
                        const success = await toggleAcknowledge(true);
                        if (success) {
                          toast.success('Confirmação registrada!');
                        }
                      }
                    }}
                    className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary dark:border-slate-600 dark:bg-slate-700 transition-colors disabled:opacity-50"
                  />
                  <span className={cn(
                    "text-xs font-bold transition-colors",
                    hasAcknowledged 
                      ? "text-emerald-600 dark:text-emerald-400" 
                      : "text-slate-700 dark:text-slate-300 group-hover:text-primary"
                  )}>
                    {hasAcknowledged ? '✓ Leitura confirmada' : 'Li e compreendi as informações'}
                  </span>
                  {isAckSubmitting && (
                    <span className="text-xs text-slate-400">Salvando...</span>
                  )}
                </label>
              </div>
            )}

            {/* Start Cleaning Button - Only show for released status (Rule 1) */}
            {schedule.status === 'released' && (
              <button 
                onClick={() => {
                  // Validate all requirements before starting cleaning
                  if (!canTransition.allowed) {
                    toast.error(canTransition.reason);
                    return;
                  }
                  
                  // Show specific modals for user-friendly feedback
                  if (!hasPropertyChecklist && !isCheckingChecklist) {
                    setShowNoChecklistModal(true);
                    return;
                  }
                  
                  if (hasImportantInfo && !hasAcknowledged) {
                    setShowAttentionModal(true);
                    return;
                  }
                  
                  handleStatusChange('cleaning');
                }}
                disabled={isAckSubmitting || isCheckingChecklist || isCheckingAccess || !canTransition.allowed}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xl py-4 font-bold text-white shadow-[0_4px_20px_-2px_rgba(51,153,153,0.3)] transition-all active:scale-[0.98]",
                  !canTransition.allowed
                    ? "bg-slate-400 hover:bg-slate-500 cursor-not-allowed"
                    : "bg-primary hover:bg-[#267373]"
                )}
              >
                {(isCheckingChecklist || isCheckingAccess) ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    Verificando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined filled">play_circle</span>
                    Iniciar Limpeza
                  </>
                )}
              </button>
            )}

            {/* Liberar para Limpeza Button - Only for waiting status and admin/manager */}
            {schedule.status === 'waiting' && (isAdmin || isManager) && (
              <button 
                onClick={() => handleStatusChange('released')}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-4 font-bold text-white bg-primary hover:bg-[#267373] shadow-[0_4px_20px_-2px_rgba(51,153,153,0.3)] transition-all active:scale-[0.98]"
              >
                <span className="material-symbols-outlined filled">check_circle</span>
                Liberar para Limpeza
              </button>
            )}

            {/* Status info for cleaners on waiting status */}
            {schedule.status === 'waiting' && role === 'cleaner' && (
              <div className="flex w-full items-center justify-center gap-2 rounded-xl py-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">schedule</span>
                <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  Aguardando liberação pelo gestor
                </span>
              </div>
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
              const hasDX = categoryHasDX(category);
              const hasPhotosInCategory = categoryPhotosData[category] && categoryPhotosData[category].length > 0;
              const needsPhoto = requirePhotoPerCategory && allCompleted && !hasPhotosInCategory;
              const photoCount = categoryPhotosData[category]?.length || 0;

              return (
                <div key={category} className={cn(
                  "overflow-hidden rounded-xl border bg-white dark:bg-[#2d3138]",
                  allCompleted ? "border-green-300 dark:border-green-700" : "border-slate-200 dark:border-slate-700"
                )}>
                  <details open={isExpanded} className="group">
                    <summary 
                      onClick={(e) => { e.preventDefault(); toggleCategory(category); }}
                      className={cn(
                        "flex cursor-pointer items-center justify-between p-4 font-medium",
                        allCompleted ? "bg-green-50 dark:bg-green-900/20" : "bg-slate-50 dark:bg-slate-800/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-4 w-4 rounded-full border-2 flex items-center justify-center",
                          allCompleted ? "bg-green-500 border-green-500" : "border-slate-300 dark:border-slate-500"
                        )}>
                          {allCompleted && (
                            <span className="material-symbols-outlined text-white text-[12px]">check</span>
                          )}
                        </div>
                        <span className={cn(
                          "font-bold",
                          allCompleted ? "text-green-700 dark:text-green-300" : "text-slate-900 dark:text-white"
                        )}>{category}</span>
                        {needsPhoto && (
                          <div className="flex items-center gap-1 text-amber-500" title="Foto do ambiente obrigatória para concluir">
                            <span className="material-symbols-outlined text-[16px]">warning</span>
                            <span className="text-[10px] font-semibold">Foto pendente</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5">
                        {/* Mark category complete button - only when cleaning */}
                        {schedule.status === 'cleaning' && !allCompleted && !hasDX && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmMarkCategory({ open: true, category });
                            }}
                            aria-label="Marcar categoria completa" 
                            className="rounded-full p-1 text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                            title="Marcar tudo como OK"
                          >
                            <span className="material-symbols-outlined text-[20px]">check_circle</span>
                          </button>
                        )}
                        {/* Photo button - only enabled when all items completed */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhotoUploadModal({ open: true, category });
                          }}
                          disabled={!allCompleted}
                          aria-label="Adicionar Foto" 
                          className={cn(
                            "relative rounded-full p-1 transition-colors",
                            allCompleted 
                              ? "text-primary hover:text-[#267373] hover:bg-primary/10" 
                              : "text-slate-300 cursor-not-allowed dark:text-slate-600"
                          )}
                          title={allCompleted ? "Adicionar foto do ambiente" : "Complete todos os itens para adicionar foto"}
                        >
                          <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                          {photoCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                              {photoCount}
                            </span>
                          )}
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
                      <div className="flex flex-col">
                        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
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
                                      onChange={() => handleChecklistItemChange(item.id, 'no', category)}
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
                                      onChange={() => handleChecklistItemChange(item.id, 'yes', category)}
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
                        
                        {/* Save button for category - only shows when there are unsaved changes */}
                        {unsavedCategories.has(category) && schedule.status === 'cleaning' && (
                          <div className="p-3 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30">
                            <button
                              onClick={() => handleSaveCategory(category)}
                              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
                            >
                              <span className="material-symbols-outlined text-[18px]">save</span>
                              Salvar Categoria
                            </button>
                          </div>
                        )}
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
                      <div className="flex flex-col flex-1">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{issue.description}</p>
                        <span className="text-[10px] text-[#8A8B88] dark:text-slate-400">
                          Reportado em {format(issue.reportedAt, "dd/MM - HH:mm")}
                        </span>
                      </div>
                      {schedule.status !== 'completed' && (
                        <button
                          onClick={() => setDeleteIssueConfirm({ open: true, issueId: issue.id })}
                          className="flex items-center justify-center rounded-full p-1.5 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors dark:hover:bg-red-900/30"
                          title="Excluir avaria"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      )}
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
          {schedule.status === 'cleaning' && (() => {
            const categoriesMissingPhotos = getCategoriesMissingPhotos();
            const isBlocked = categoriesMissingPhotos.length > 0;
            
            return (
              <div className="flex flex-col gap-2">
                {isBlocked && (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-medium justify-center">
                    <span className="material-symbols-outlined text-[16px]">warning</span>
                    <span>Fotos pendentes em: {categoriesMissingPhotos.join(', ')}</span>
                  </div>
                )}
                <button 
                  onClick={() => handleStatusChange('completed')}
                  disabled={isBlocked}
                  className={cn(
                    "w-full rounded-xl py-4 text-base font-bold text-white shadow-[0_4px_20px_-2px_rgba(51,153,153,0.3)] transition-all active:scale-[0.98]",
                    isBlocked 
                      ? "bg-slate-400 cursor-not-allowed" 
                      : "bg-primary hover:bg-[#267373]"
                  )}
                >
                  Finalizar Limpeza
                </button>
              </div>
            );
          })()}
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
          propertyId={schedule.propertyId}
          propertyName={schedule.propertyName}
          scheduleId={schedule.id}
          scheduleDate={schedule.checkOut.toISOString()}
          passwordFromIcal={schedule.doorPassword}
          accessPassword={schedule.accessPassword}
          teamMemberId={teamMemberId}
          onClose={() => setShowPasswordModal(false)}
          onPasswordUpdated={(newPassword) => {
            onUpdateSchedule({ ...schedule, accessPassword: newPassword });
          }}
        />
      )}

      {/* Issue Report Modal */}
      {showIssueForm && (
        <IssueReportModal
          onClose={() => setShowIssueForm(false)}
          onSubmit={handleIssueSubmit}
          checklist={checklist}
          isSubmitting={isCompressing}
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

      {/* No Checklist Modal */}
      {showNoChecklistModal && (
        <NoChecklistModal
          propertyName={schedule.propertyName}
          onClose={() => setShowNoChecklistModal(false)}
        />
      )}

      {/* Confirm Mark Category Complete Dialog */}
      <AlertDialog 
        open={confirmMarkCategory.open} 
        onOpenChange={(open) => !open && setConfirmMarkCategory({ open: false, category: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar categoria completa?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os itens de "{confirmMarkCategory.category}" serão marcados como OK (✓). 
              Esta ação pode ser desfeita manualmente item por item.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => confirmMarkCategory.category && handleMarkCategoryComplete(confirmMarkCategory.category)}
              className="bg-green-600 hover:bg-green-700"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Category Photo Upload Modal */}
      {photoUploadModal.open && photoUploadModal.category && (
        <CategoryPhotoUpload
          scheduleId={schedule.id}
          category={photoUploadModal.category}
          categoryPhotos={categoryPhotosData}
          isEnabled={schedule.status === 'cleaning'}
          onClose={() => setPhotoUploadModal({ open: false, category: null })}
          onPhotoUploaded={async (category, photo) => {
            const updatedPhotos = { ...categoryPhotosData };
            if (!updatedPhotos[category]) {
              updatedPhotos[category] = [];
            }
            updatedPhotos[category].push(photo);
            setCategoryPhotosData(updatedPhotos);
            
            // Save to database
            try {
              await supabase
                .from('schedules')
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .update({ category_photos: updatedPhotos } as any)
                .eq('id', schedule.id);
            } catch (error) {
              console.error('Error saving category photos:', error);
            }
          }}
          onPhotoDeleted={async (category, photoUrl) => {
            const updatedPhotos = { ...categoryPhotosData };
            if (updatedPhotos[category]) {
              updatedPhotos[category] = updatedPhotos[category].filter(p => p.url !== photoUrl);
            }
            setCategoryPhotosData(updatedPhotos);
            
            // Save to database
            try {
              await supabase
                .from('schedules')
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .update({ category_photos: updatedPhotos } as any)
                .eq('id', schedule.id);
            } catch (error) {
              console.error('Error saving category photos:', error);
            }
          }}
        />
      )}

      {/* Delete Issue Confirmation Dialog */}
      <AlertDialog open={deleteIssueConfirm.open} onOpenChange={(open) => setDeleteIssueConfirm({ open, issueId: open ? deleteIssueConfirm.issueId : null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Avaria</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta avaria? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteIssueConfirm.issueId && handleDeleteIssue(deleteIssueConfirm.issueId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
