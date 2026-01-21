import { Schedule, ScheduleStatus, ChecklistItem, ChecklistItemStatus, MaintenanceIssue, STATUS_LABELS, STATUS_FLOW, STATUS_ALLOWED_ROLES, AppRole, CategoryPhoto } from '@/types/scheduling';
import { Json } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { LocationModal } from './LocationModal';
import { PasswordModal } from './PasswordModal';
import { IssueReportModal } from './IssueReportModal';
import { AttentionModal } from './AttentionModal';
import { ChecklistPendingModal } from './ChecklistPendingModal';
import { NoChecklistModal } from './NoChecklistModal';
import LocationRequiredModal from './mobile/LocationRequiredModal';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useCreateMaintenanceIssue } from '@/hooks/useCreateMaintenanceIssue';
import { useAcknowledgeInfo } from '@/hooks/useAcknowledgeInfo';
import { useAcknowledgeNotes } from '@/hooks/useAcknowledgeNotes';
import { usePropertyChecklist } from '@/hooks/usePropertyChecklist';
import { usePropertyAccess } from '@/hooks/usePropertyAccess';
import { useCleaningCache } from '@/hooks/useCleaningCache';
import { useCheckoutDayVerification } from '@/hooks/useCheckoutDayVerification';
import { useCleaningConcurrencyCheck } from '@/hooks/useCleaningConcurrencyCheck';
import { useProximityCheck, formatDistance } from '@/hooks/useGeolocation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CategoryPhotoUpload } from './CategoryPhotoUpload';
import { MapPin, Navigation } from 'lucide-react';
import { useDebouncedCategorySave } from '@/hooks/useDebouncedCategorySave';

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
  const [cleanerObservations, setCleanerObservations] = useState(schedule.cleanerObservations || '');
  const [checklist, setChecklist] = useState(schedule.checklist);
  // Keep reference to latest checklist for callbacks to avoid stale closures
  const checklistRef = useRef<ChecklistItem[]>(schedule.checklist);
  useEffect(() => {
    checklistRef.current = checklist;
  }, [checklist]);
  const [localIssues, setLocalIssues] = useState<MaintenanceIssue[]>(schedule.maintenanceIssues);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const deriveChecklistItemStates = useCallback(
    (items: ChecklistItem[]) => {
      const initialStates: Record<string, 'yes' | 'no' | null> = {};
      items.forEach((item) => {
        if (item.status === 'ok') initialStates[item.id] = 'yes';
        else if (item.status === 'not_ok') initialStates[item.id] = 'no';
        else initialStates[item.id] = null;
      });
      return initialStates;
    },
    []
  );

  // Initialize checklistItemStates from saved checklist status
  const [checklistItemStates, setChecklistItemStates] = useState<Record<string, 'yes' | 'no' | null>>(() => {
    return deriveChecklistItemStates(schedule.checklist);
  });
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAttentionModal, setShowAttentionModal] = useState(false);
  const [showChecklistPendingModal, setShowChecklistPendingModal] = useState(false);
  const [showNoChecklistModal, setShowNoChecklistModal] = useState(false);
  const [showLocationRequiredModal, setShowLocationRequiredModal] = useState(false);
  const [pendingCategories, setPendingCategories] = useState<{ name: string; pendingCount: number; totalCount: number }[]>([]);
  const [teamMemberId, setTeamMemberId] = useState<string | null>(null);
  const [requirePhotoPerCategory, setRequirePhotoPerCategory] = useState(false);
  const [categoryPhotosData, setCategoryPhotosData] = useState<Record<string, CategoryPhoto[]>>({});
  const [confirmMarkCategory, setConfirmMarkCategory] = useState<{ open: boolean; category: string | null }>({ open: false, category: null });
  const [photoUploadModal, setPhotoUploadModal] = useState<{ open: boolean; category: string | null }>({ open: false, category: null });
  const [deleteIssueConfirm, setDeleteIssueConfirm] = useState<{ open: boolean; issueId: string | null }>({ open: false, issueId: null });
  const [isCommitting, setIsCommitting] = useState(false);
  // Auto-save state tracking (global for the whole checklist)
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<number | null>(null);
  // Track per-category save state so UI only turns green/amber AFTER save success
  const [categorySaveStatus, setCategorySaveStatus] = useState<Record<string, 'idle' | 'dirty' | 'saved'>>({});
  const cacheInitializedRef = useRef(false);
  const hasUserInteractedRef = useRef(false);
  const checklistHydratedRef = useRef(false);
  const statusStyle = statusConfig[schedule.status];

  // Keep ref to latest checklistItemStates for save callbacks
  const checklistItemStatesRef = useRef(checklistItemStates);
  useEffect(() => {
    checklistItemStatesRef.current = checklistItemStates;
  }, [checklistItemStates]);

  // When switching schedules (or reopening the same component), reset session-only refs
  useEffect(() => {
    cacheInitializedRef.current = false;
    hasUserInteractedRef.current = false;
    checklistHydratedRef.current = false;

    setNotes(schedule.notes);
    setCleanerObservations(schedule.cleanerObservations || '');
    setChecklist(schedule.checklist);
    setChecklistItemStates(deriveChecklistItemStates(schedule.checklist));
    setLocalIssues(schedule.maintenanceIssues);
    setCategorySaveStatus({});
  }, [schedule.id, deriveChecklistItemStates]);

  // When the backend finishes linking/loading a checklist (after "Iniciar Limpeza"), hydrate local state.
  // CRITICAL: Only hydrate ONCE and NEVER if user has already interacted
  useEffect(() => {
    // Skip if not in cleaning status
    if (schedule.status !== 'cleaning') return;
    
    // CRITICAL: Never overwrite if user has already started working
    if (hasUserInteractedRef.current) {
      console.log('[ScheduleDetail] User has interacted, skipping checklist hydration from prop');
      return;
    }

    // Hydrate when checklist becomes available (either first time or when prop updates with loaded checklist)
    if (schedule.checklist.length > 0) {
      // Only log and set hydrated flag on first hydration
      if (!checklistHydratedRef.current) {
        console.log('[ScheduleDetail] Hydrating checklist from schedule prop:', schedule.checklist.length, 'items');
        checklistHydratedRef.current = true;
      }
      setChecklist(schedule.checklist);
      setChecklistItemStates(deriveChecklistItemStates(schedule.checklist));
    }
  }, [schedule.status, schedule.checklist, deriveChecklistItemStates]);

  // Check if admin notes exist
  const hasAdminNotes = Boolean(schedule.notes && schedule.notes.trim().length > 0);
  // Checkout day verification for password visibility
  const isCheckoutDay = useCheckoutDayVerification(schedule);
  
  // Concurrency check hook
  const { checkConcurrency, startCleaningAtomic } = useCleaningConcurrencyCheck();

  // Cleaning cache hook - only active during cleaning status (Rule 41.3, 44.3)
  const { loadCache, saveCache, clearCache } = useCleaningCache({
    scheduleId: schedule.id,
    teamMemberId,
    isActive: schedule.status === 'cleaning',
  });

  // Helper: Check if a category is complete (all items have OK or DX selection)
  const isCategoryComplete = useCallback((category: string, states: Record<string, 'yes' | 'no' | null>) => {
    const categoryItems = checklist.filter(item => item.category === category);
    return categoryItems.every(item => {
      const state = states[item.id];
      return state === 'yes' || state === 'no';
    });
  }, [checklist]);

  // Global rule: only auto-save when the ENTIRE checklist is complete.
  const isChecklistComplete = useCallback((states: Record<string, 'yes' | 'no' | null>) => {
    if (checklist.length === 0) return false;
    return checklist.every((item) => {
      const state = states[item.id];
      return state === 'yes' || state === 'no';
    });
  }, [checklist]);

  // Auto-save hook with debounce (whole checklist)
  const { scheduleSave, flushAll } = useDebouncedCategorySave({
    scheduleId: schedule.id,
    teamMemberId,
    checklist,
    debounceMs: 800,
    enabled: schedule.status === 'cleaning',
    onSaveStart: () => setIsAutoSaving(true),
    onSaveComplete: (_category, success) => {
      setIsAutoSaving(false);
      if (success) {
        setLastAutoSavedAt(Date.now());

        // After a successful save, do a lightweight reload from the backend to
        // guarantee UI derives from persisted data (mobile race-condition fix).
        // This ensures category colors + pending counters reflect the saved state
        // even if any local state got out of sync.
        (async () => {
          try {
            const { data, error } = await supabase
              .from('schedules')
              .select('checklists')
              .eq('id', schedule.id)
              .maybeSingle();

            if (error) throw error;

            const reloaded = Array.isArray(data?.checklists)
              ? (data?.checklists as unknown as ChecklistItem[])
              : null;

            if (reloaded && reloaded.length > 0) {
              setChecklist(reloaded);
              setChecklistItemStates(deriveChecklistItemStates(reloaded));
              checklistRef.current = reloaded;
            }
          } catch (e) {
            console.warn('[AutoSave] Reload after save failed:', e);
          }
        })();

        // CRITICAL: After a successful save, mark ALL completed categories as "saved".
        // Use checklistItemStatesRef (always up-to-date) + checklistRef for complete detection.
        // This ensures immediate UI update after auto-save completes.
        setCategorySaveStatus((prev) => {
          const next: Record<string, 'idle' | 'dirty' | 'saved'> = { ...prev };
          const currentChecklist = checklistRef.current;
          const currentStates = checklistItemStatesRef.current;
          const categories = [...new Set(currentChecklist.map((i) => i.category))];
          
          categories.forEach((cat) => {
            const catItems = currentChecklist.filter((i) => i.category === cat);
            // Category is complete if ALL items have a selection (yes/no) in UI state
            // OR have a persisted status (ok/not_ok) - for reload scenarios
            const allHaveSelection = catItems.length > 0 && catItems.every((item) => {
              const localState = currentStates[item.id];
              if (localState === 'yes' || localState === 'no') return true;
              return item.status === 'ok' || item.status === 'not_ok';
            });
            
            if (allHaveSelection) {
              // Mark as saved - this triggers immediate color change
              next[cat] = 'saved';
            }
          });

          return next;
        });
      }
    },
    clearCache,
  });

  // Check if schedule already has saved progress in the database (items with ok/not_ok status)
  const scheduleHasSavedProgress = useMemo(() => {
    return schedule.checklist.some(item => item.status === 'ok' || item.status === 'not_ok');
  }, [schedule.checklist]);

  // Load cache on mount if cleaning (Rule 41.3.3, 44.3.3)
  // IMPORTANT: Skip cache restoration if:
  // 1. User already interacted in this session
  // 2. Schedule already has saved progress in DB (DB is authoritative)
  useEffect(() => {
    if (schedule.status === 'cleaning' && teamMemberId && !cacheInitializedRef.current) {
      // If the user already started interacting, never override their current progress with cached data.
      if (hasUserInteractedRef.current) {
        cacheInitializedRef.current = true;
        clearCache(); // Clear stale cache since user is actively working
        return;
      }

      // If the schedule already has saved progress in DB, DB is authoritative - don't restore cache
      if (scheduleHasSavedProgress) {
        console.log('[ScheduleDetail] Schedule has DB progress, skipping cache restore');
        cacheInitializedRef.current = true;
        clearCache(); // Clear potentially stale cache
        return;
      }

      const cachedData = loadCache();
      if (cachedData) {
        console.log('[ScheduleDetail] Restoring from cache...');
        if (cachedData.checklistState.length > 0) {
          setChecklist(cachedData.checklistState);
        }
        if (Object.keys(cachedData.checklistItemStates).length > 0) {
          setChecklistItemStates(cachedData.checklistItemStates);
        }
        // Prioritize cached observations over schedule value (more recent)
        if (cachedData.observationsText) {
          setCleanerObservations(cachedData.observationsText);
        } else if (schedule.cleanerObservations) {
          setCleanerObservations(schedule.cleanerObservations);
        }
        if (cachedData.draftIssues.length > 0) {
          setLocalIssues(cachedData.draftIssues);
        }
        if (Object.keys(cachedData.categoryPhotos).length > 0) {
          setCategoryPhotosData(cachedData.categoryPhotos);
        }
        toast.info('Progresso anterior restaurado');
      }
      cacheInitializedRef.current = true;
    }
  }, [schedule.status, schedule.cleanerObservations, teamMemberId, loadCache, clearCache, scheduleHasSavedProgress]);

  // Auto-save to cache on state changes (Rule 41.3.2, 44.3.2)
  useEffect(() => {
    if (schedule.status === 'cleaning' && teamMemberId && cacheInitializedRef.current) {
      saveCache({
        checklistState: checklist,
        checklistItemStates,
        observationsText: cleanerObservations,
        draftIssues: localIssues,
        categoryPhotos: categoryPhotosData,
      });
    }
  }, [checklist, checklistItemStates, cleanerObservations, localIssues, categoryPhotosData, schedule.status, teamMemberId, saveCache]);

  // State for require_photo_for_issues
  const [requirePhotoForIssues, setRequirePhotoForIssues] = useState(false);
  // State for require_checklist (whether checklist is required for this property)
  const [requireChecklist, setRequireChecklist] = useState(true);
  // State for property coordinates (geolocation)
  const [propertyCoords, setPropertyCoords] = useState<{ latitude: number | null; longitude: number | null }>({
    latitude: null,
    longitude: null,
  });

  // Fetch property rules (require_photo_per_category, require_photo_for_issues, require_checklist, coordinates)
  useEffect(() => {
    const fetchPropertyRules = async () => {
      const { data } = await supabase
        .from('properties')
        .select('require_photo_per_category, require_photo_for_issues, require_checklist, latitude, longitude')
        .eq('id', schedule.propertyId)
        .maybeSingle();
      if (data) {
        setRequirePhotoPerCategory(data.require_photo_per_category ?? false);
        setRequirePhotoForIssues(data.require_photo_for_issues ?? false);
        setRequireChecklist(data.require_checklist ?? true);
        setPropertyCoords({
          latitude: data.latitude,
          longitude: data.longitude,
        });
      }
    };
    fetchPropertyRules();
  }, [schedule.propertyId]);

  // Proximity check for cleaner - check when status is released or cleaning
  // This is used for both starting cleaning AND for content access control
  const shouldCheckProximity = (schedule.status === 'released' || schedule.status === 'cleaning') && role === 'cleaner';
  const proximityCheck = useProximityCheck(
    shouldCheckProximity ? propertyCoords.latitude : null,
    shouldCheckProximity ? propertyCoords.longitude : null,
    500 // 500 meters max distance
  );

  // Auto-close location required modal when location becomes available and within range
  useEffect(() => {
    if (showLocationRequiredModal && 
        proximityCheck.permissionState === 'granted' && 
        proximityCheck.isWithinRange && 
        !proximityCheck.loading) {
      setShowLocationRequiredModal(false);
      toast.success('Localização verificada! Você pode iniciar a limpeza.');
    }
  }, [showLocationRequiredModal, proximityCheck.permissionState, proximityCheck.isWithinRange, proximityCheck.loading]);

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

  // Use the acknowledge hook for "Li e Compreendi" functionality (important info)
  const { 
    hasAcknowledged, 
    isSubmitting: isAckSubmitting, 
    toggleAcknowledge 
  } = useAcknowledgeInfo({
    scheduleId: schedule.id,
    currentAcks: schedule.ackByTeamMembers || [],
    teamMemberId,
  });

  // Use the acknowledge notes hook for admin notes (saved in history, cannot be undone)
  const { 
    hasAcknowledged: hasAcknowledgedNotes, 
    isSubmitting: isNotesAckSubmitting, 
    acknowledgeNotes 
  } = useAcknowledgeNotes({
    scheduleId: schedule.id,
    history: schedule.history || [],
    teamMemberId,
    notes: schedule.notes,
    scheduleStatus: schedule.status,
  });

  // Check if important info exists
  const hasImportantInfo = Boolean(schedule.importantInfo && schedule.importantInfo.trim().length > 0);

  // Determine if content should be locked (checklist, observations)
  // Content is locked when:
  // 1. Status is 'waiting' (not released yet)
  // 2. Cleaner is too far from property (for status released/cleaning)
  // 3. Important info exists but not acknowledged yet
  const isContentLocked = useMemo(() => {
    // Status waiting = always locked
    if (schedule.status === 'waiting') {
      return { locked: true, reason: 'Aguardando liberação do checkout' };
    }

    // For cleaners, check proximity
    if (role === 'cleaner' && proximityCheck.propertyHasCoordinates) {
      if (proximityCheck.loading) {
        return { locked: true, reason: 'Verificando sua localização...', isLoading: true };
      }
      if (proximityCheck.error) {
        return { locked: true, reason: proximityCheck.error };
      }
      if (!proximityCheck.isWithinRange && proximityCheck.distance !== null) {
        return { 
          locked: true, 
          reason: `Você está a ${formatDistance(proximityCheck.distance)} do imóvel. Aproxime-se para acessar o conteúdo (máx 500m).`
        };
      }
    }

    // Check if important info acknowledgment is required
    if (hasImportantInfo && !hasAcknowledged && role === 'cleaner') {
      return { locked: true, reason: 'Leia e confirme as informações importantes antes de continuar' };
    }

    // Check if admin notes acknowledgment is required
    if (hasAdminNotes && !hasAcknowledgedNotes && role === 'cleaner') {
      return { locked: true, reason: 'Leia e confirme a observação do administrador antes de continuar' };
    }

    return { locked: false };
  }, [schedule.status, role, proximityCheck, hasImportantInfo, hasAcknowledged, hasAdminNotes, hasAcknowledgedNotes]);

  // Checklist is editable ONLY during cleaning (and when not locked)
  const isChecklistEditable = schedule.status === 'cleaning' && !isContentLocked.locked;

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

    // Rule 5b: Check admin notes acknowledgment (for starting cleaning)
    if (nextStatus === 'cleaning' && hasAdminNotes && !hasAcknowledgedNotes) {
      return { 
        allowed: false, 
        reason: 'É necessário confirmar a leitura das observações do administrador' 
      };
    }

    // Rule 6: Check if property has checklist (for starting cleaning) - only if checklist is required
    if (nextStatus === 'cleaning' && requireChecklist && !hasPropertyChecklist && !isCheckingChecklist) {
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

    // Rule 8: Check proximity for cleaners (must be within 500m of property)
    // Only applies if property has coordinates configured
    if (nextStatus === 'cleaning' && role === 'cleaner' && proximityCheck.propertyHasCoordinates) {
      if (proximityCheck.loading) {
        return { 
          allowed: false, 
          reason: 'Verificando sua localização...',
          isLoadingLocation: true
        };
      }
      if (proximityCheck.error) {
        return { 
          allowed: false, 
          reason: proximityCheck.error
        };
      }
      if (!proximityCheck.isWithinRange && proximityCheck.distance !== null) {
        return { 
          allowed: false, 
          reason: `Você está a ${formatDistance(proximityCheck.distance)} do imóvel. Aproxime-se para iniciar (máx 500m).`
        };
      }
    }

    return { allowed: true };
  }, [schedule.status, schedule.responsibleTeamMemberId, role, teamMemberId, hasPropertyAccess, isCheckingAccess, hasImportantInfo, hasAcknowledged, hasAdminNotes, hasAcknowledgedNotes, hasPropertyChecklist, isCheckingChecklist, requireChecklist, proximityCheck]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleChecklistItemChange = useCallback((itemId: string, value: 'yes' | 'no', category: string) => {
    if (!isChecklistEditable) return;
    hasUserInteractedRef.current = true;

    // 1) Update item states (source of truth for category completion UI)
    const newStates = {
      ...checklistItemStates,
      [itemId]: value,
    };
    setChecklistItemStates(newStates);
    // Keep ref in sync immediately (avoid races where save completes before effect runs)
    checklistItemStatesRef.current = newStates;

    // Any interaction makes the category "dirty" until a save succeeds.
    setCategorySaveStatus((prev) => ({
      ...prev,
      [category]: 'dirty',
    }));

    // 2) Update checklist using functional set to avoid stale-closure overwrites
    const itemStatus: ChecklistItemStatus = value === 'yes' ? 'ok' : 'not_ok';
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              completed: value === 'yes',
              status: itemStatus,
            }
          : item
      )
    );

    // 3) Auto-save ONLY when the WHOLE checklist is complete (regra global)
    if (isChecklistComplete(newStates)) {
      toast.success('Checklist completo! Salvando...', { duration: 2000 });
      scheduleSave();
    }
  }, [scheduleSave, isChecklistEditable, checklistItemStates, isChecklistComplete]);

  // Handle marking entire category as complete - updates local state and triggers auto-save
  // OPTIMIZED: Uses React.unstable_batchedUpdates pattern to prevent UI freezing on mobile
  const handleMarkCategoryComplete = useCallback((category: string) => {
    if (!isChecklistEditable || !teamMemberId) return;

    hasUserInteractedRef.current = true;
    
    // Close confirmation dialog FIRST so user sees the update
    setConfirmMarkCategory({ open: false, category: null });
    
    // Pre-calculate everything BEFORE any state updates to minimize re-renders
    const categoryItems = checklist.filter(item => item.category === category);
    
    // Check if any item is marked as DX (no) - don't allow bulk marking
    const hasAnyDX = categoryItems.some(item => checklistItemStates[item.id] === 'no');
    if (hasAnyDX) {
      toast.error('Não é possível marcar categoria com itens DX');
      return;
    }
    
    // Pre-calculate updated states
    const updatedStates: Record<string, 'yes' | 'no' | null> = { ...checklistItemStates };
    categoryItems.forEach(item => {
      updatedStates[item.id] = 'yes';
    });
    
    // Pre-calculate updated checklist
    const updatedChecklist = checklist.map(item => 
      item.category === category ? { ...item, completed: true, status: 'ok' as const } : item
    );
    
    // Use requestAnimationFrame to batch DOM updates and prevent UI blocking
    // This allows the browser to remain responsive while processing
    requestAnimationFrame(() => {
      // Single batched state update - React 18 auto-batches these
      setChecklistItemStates(updatedStates);
      // Keep ref in sync immediately (avoid races where save completes before effect runs)
      checklistItemStatesRef.current = updatedStates;
      setChecklist(updatedChecklist);

      setCategorySaveStatus((prev) => ({
        ...prev,
        [category]: 'dirty',
      }));
      
      // Auto-save ONLY if the WHOLE checklist is complete (regra global)
      setTimeout(() => {
        if (isChecklistComplete(updatedStates)) {
          toast.success('Checklist completo! Salvando...', { duration: 2000 });
          scheduleSave();
        }
      }, 0);
      
      toast.success(`Categoria "${category}" marcada como completa!`);
    });
  }, [isChecklistEditable, checklist, checklistItemStates, teamMemberId, scheduleSave, isChecklistComplete]);

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
      // Category is complete when ALL items have a selection (OK or DX)
      const allSelected = categoryItems.every(item => {
        const state = checklistItemStates[item.id];
        return state === 'yes' || state === 'no';
      });
      
      // If category is complete but has no photo
      const hasPhoto = categoryPhotosData[category] && categoryPhotosData[category].length > 0;
      if (allSelected && !hasPhoto) {
        missingPhotos.push(category);
      }
    });
    
    return missingPhotos;
  }, [requirePhotoPerCategory, checklist, checklistItemStates, categoryPhotosData]);


  // Check if item has a selection (OK or DX) - Rule 15.7.2/15.7.3
  const isItemSelected = useCallback((item: ChecklistItem) => {
    const state = checklistItemStates[item.id];
    // Item is "selected" if it has OK (yes) or DX (no) - never both, never empty to finalize
    if (state === 'yes' || state === 'no') return true;
    // Fallback to persisted status (covers post-save reload and any sync edge cases)
    return item.status === 'ok' || item.status === 'not_ok';
  }, [checklistItemStates]);

  const getPendingCategoriesDetails = () => {
    const categories = Object.keys(groupedChecklist);
    const pending: { name: string; pendingCount: number; totalCount: number }[] = [];
    
    categories.forEach(category => {
      const items = groupedChecklist[category];
      // Count items that have ANY selection (OK or DX) - Rule 15.8.1
      const selectedCount = items.filter(item => isItemSelected(item)).length;
      const pendingCount = items.length - selectedCount;
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

  const handleStatusChange = async (newStatus?: ScheduleStatus) => {
    const targetStatus = newStatus || statusConfig[schedule.status].next;
    if (!targetStatus || targetStatus === schedule.status) return;

    // Validate role permission
    if (!canTransition.allowed) {
      toast.error(canTransition.reason);
      return;
    }

    // Check checklist completion for finalizing - only if checklist is required
    if (targetStatus === 'completed' && requireChecklist && checklist.length > 0) {
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
    
    // Rule 41.8: Single commit when finalizing
    if (targetStatus === 'completed') {
      setIsCommitting(true);
      try {
        // Commit all data: checklist, observations, issues, photos
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const commitPayload: any = {
          status: 'completed',
          end_at: new Date().toISOString(),
          checklists: checklist,
          cleaner_observations: cleanerObservations || null,
          maintenance_issues: localIssues,
          category_photos: categoryPhotosData,
          maintenance_status: localIssues.length > 0 ? 'needs_maintenance' : 'ok',
        };

        const { error } = await supabase
          .from('schedules')
          .update(commitPayload)
          .eq('id', schedule.id);

        if (error) {
          throw error;
        }

        // Log observations in history (Rule 41.10.1)
        if (teamMemberId && cleanerObservations) {
          await supabase.rpc('append_schedule_history', {
            p_schedule_id: schedule.id,
            p_team_member_id: teamMemberId,
            p_action: 'observacoes_enviadas',
            p_from_status: 'cleaning',
            p_to_status: 'completed',
            p_payload: { has_observations: true }
          });
        }

        // Clear cache after successful commit (Rule 41.8.1)
        clearCache();
        
        updates.endAt = new Date();
        updates.teamDeparture = new Date();
        toast.success('Limpeza finalizada com sucesso!');
        
        onUpdateSchedule({ ...schedule, ...updates }, previousStatus, teamMemberId || undefined);
      } catch (error) {
        // Rule 41.8.2: On failure, don't clear cache, allow retry
        console.error('Error committing cleaning:', error);
        toast.error('Erro ao finalizar limpeza. Tente novamente.');
        setIsCommitting(false);
        return;
      }
      setIsCommitting(false);
      return;
    }
    
    onUpdateSchedule({ ...schedule, ...updates }, previousStatus, teamMemberId || undefined);
    toast.success(`Status atualizado para: ${statusConfig[targetStatus].label}`);
  };

  const handleStartCleaning = useCallback(() => {
    // First, check if property has coordinates - if it does, location is MANDATORY
    if (role === 'cleaner' && proximityCheck.propertyHasCoordinates) {
      // Check location permission state
      if (proximityCheck.permissionState === 'denied' || proximityCheck.permissionState === 'prompt') {
        setShowLocationRequiredModal(true);
        return;
      }

      // Check if we have an error (GPS off, etc)
      if (proximityCheck.error) {
        setShowLocationRequiredModal(true);
        return;
      }

      // Check if still loading
      if (proximityCheck.loading) {
        toast.info('Aguarde a verificação de localização...');
        return;
      }

      // Check if too far from property
      if (!proximityCheck.isWithinRange && proximityCheck.distance !== null) {
        setShowLocationRequiredModal(true);
        return;
      }
    }

    if (!canTransition.allowed) {
      toast.error(canTransition.reason);
      return;
    }
    if (requireChecklist && !hasPropertyChecklist && !isCheckingChecklist) {
      setShowNoChecklistModal(true);
      return;
    }
    if (hasImportantInfo && !hasAcknowledged) {
      setShowAttentionModal(true);
      return;
    }
    handleStatusChange('cleaning');
  }, [
    canTransition.allowed,
    canTransition.reason,
    handleStatusChange,
    hasAcknowledged,
    hasImportantInfo,
    hasPropertyChecklist,
    isCheckingChecklist,
    proximityCheck.distance,
    proximityCheck.error,
    proximityCheck.isWithinRange,
    proximityCheck.loading,
    proximityCheck.permissionState,
    proximityCheck.propertyHasCoordinates,
    requireChecklist,
    role,
  ]);

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

    // Update LOCAL state only (Rule 41.1 - no reload)
    const newIssue: MaintenanceIssue = {
      id: `issue-${Date.now()}`,
      description: `[${issue.category} - ${issue.itemLabel}] ${issue.description}`,
      severity: issue.severity,
      reportedAt: new Date(),
      resolved: false
    };

    setLocalIssues(prev => [...prev, newIssue]);
    // Cache auto-saves via useEffect
  };

  const handleSaveNotes = () => {
    onUpdateSchedule({ ...schedule, notes });
    toast.success('Observações salvas!');
  };

  // Rule 41.6, 44.1: Delete issue WITHOUT reload - only update local state
  const handleDeleteIssue = async (issueId: string) => {
    // Update local state only (no server call until commit)
    const updatedIssues = localIssues.filter(issue => issue.id !== issueId);
    setLocalIssues(updatedIssues);
    
    // Cache is auto-saved via useEffect
    toast.success('Avaria removida!');
    setDeleteIssueConfirm({ open: false, issueId: null });
    
    // Log the removal in history (soft delete audit - Rule 41.10.1)
    if (teamMemberId) {
      try {
        await supabase.rpc('append_schedule_history', {
          p_schedule_id: schedule.id,
          p_team_member_id: teamMemberId,
          p_action: 'avaria_removida',
          p_from_status: null,
          p_to_status: null,
          p_payload: { issue_id: issueId }
        });
      } catch (error) {
        console.error('Error logging issue removal:', error);
      }
    }
  };

  // "Concluídos" = itens com qualquer seleção (OK ou DX), com fallback para status persistido.
  const completedTasks = useMemo(() => {
    return checklist.filter((item) => {
      const local = checklistItemStates[item.id];
      if (local === 'yes' || local === 'no') return true;
      return item.status === 'ok' || item.status === 'not_ok';
    }).length;
  }, [checklist, checklistItemStates]);

  const totalTasks = checklist.length;

  // Group checklist by category - useMemo to ensure recalculation on checklist changes
  const groupedChecklist = useMemo(() => {
    return checklist.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, ChecklistItem[]>);
  }, [checklist]);

  // Get current time
  const currentTime = format(new Date(), "HH:mm");

  return (
    <div className="fixed inset-0 z-[200] bg-stone-50 dark:bg-[#22252a] font-display text-slate-800 dark:text-slate-100 antialiased flex flex-col overflow-hidden">
      <div className="relative flex-1 w-full flex flex-col overflow-x-hidden overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center bg-stone-50/90 dark:bg-[#22252a]/90 px-4 py-4 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
          <button 
            onClick={onClose}
            className="flex items-center justify-center rounded-full p-2 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 mr-2"
          >
            <span className="material-symbols-outlined text-slate-900 dark:text-white">arrow_back</span>
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold leading-none tracking-tight text-slate-900 dark:text-white">{schedule.propertyName}</h2>
              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {format(schedule.checkOut, "dd/MM/yyyy")}
              </span>
            </div>
            <span className="text-xs font-medium text-[#8A8B88] dark:text-slate-400">{schedule.propertyAddress}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {/* Global sync indicator */}
            {isAutoSaving && (
              <div className="flex items-center gap-1.5 text-primary animate-pulse">
                <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                <span className="text-xs font-medium">Salvando...</span>
              </div>
            )}
            <span className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
              statusStyle.badgeClass
            )}>
              {statusStyle.label}
            </span>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col gap-6 p-6 pb-6">
          {/* Waiting Status Alert Card - Rule 41 */}
          {schedule.status === 'waiting' && (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 p-4 flex gap-3 items-start">
              <span className="material-symbols-outlined text-amber-500 text-[22px] mt-0.5">lock_clock</span>
              <div className="flex-1">
                <h4 className="font-bold text-amber-700 dark:text-amber-400 text-sm mb-1">Aguardando Liberação</h4>
                <p className="text-xs text-amber-600 dark:text-amber-500/80 leading-relaxed">
                  Checkout ainda não realizado pelo hóspede. A limpeza só poderá ser iniciada após a saída confirmada.
                </p>
              </div>
            </div>
          )}

          {/* Time Cards */}
          <div className={cn("grid grid-cols-2 gap-3", schedule.status === 'waiting' && "opacity-60")}>
            <div className="rounded-xl bg-white dark:bg-[#2d3138] p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center gap-1">
              <span className="text-[10px] font-bold uppercase text-[#8A8B88] dark:text-slate-400 tracking-wide">Previsão de Liberação</span>
              <div className="flex items-center gap-1.5 text-slate-900 dark:text-white">
                <span className="material-symbols-outlined text-[18px] text-primary">schedule</span>
                <span className="text-lg font-bold">{format(schedule.checkOut, "HH:mm")}</span>
              </div>
            </div>
            <div className="rounded-xl bg-white dark:bg-[#2d3138] p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center gap-1">
              <span className="text-[10px] font-bold uppercase text-[#8A8B88] dark:text-slate-400 tracking-wide">Entrada do Próximo Hóspede</span>
              <div className="flex items-center gap-1.5 text-slate-900 dark:text-white">
                <span className="material-symbols-outlined text-[18px] text-primary">login</span>
                <span className="text-lg font-bold">{format(schedule.checkIn, "HH:mm")}</span>
              </div>
            </div>
          </div>

          {/* Admin Notes for Cleaner - with mandatory reading confirmation */}
          {hasAdminNotes && role === 'cleaner' && (
            <div className={cn(
              "rounded-2xl p-4 border-2 transition-all",
              hasAcknowledgedNotes 
                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700" 
                : "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700"
            )}>
              <div className="flex items-center gap-2 mb-3">
                <span className={cn(
                  "material-symbols-outlined text-[20px]",
                  hasAcknowledgedNotes ? "text-emerald-500" : "text-amber-500"
                )}>
                  {hasAcknowledgedNotes ? 'check_circle' : 'campaign'}
                </span>
                <h3 className={cn(
                  "text-xs font-bold uppercase tracking-widest flex-1",
                  hasAcknowledgedNotes ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"
                )}>
                  Observação do Administrador
                </h3>
                {!hasAcknowledgedNotes && (
                  <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
                    LEITURA OBRIGATÓRIA
                  </span>
                )}
              </div>
              
              <div className={cn(
                "rounded-xl p-4 border mb-3",
                hasAcknowledgedNotes 
                  ? "bg-white dark:bg-slate-800/50 border-emerald-200 dark:border-emerald-800" 
                  : "bg-white dark:bg-slate-800/50 border-amber-200 dark:border-amber-800"
              )}>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {schedule.notes}
                </p>
              </div>

              <label className={cn(
                "flex items-center gap-3 py-2 cursor-pointer",
                hasAcknowledgedNotes && "cursor-default"
              )}>
                <div className={cn(
                  "w-6 h-6 border-2 rounded flex items-center justify-center transition-colors",
                  hasAcknowledgedNotes 
                    ? "bg-emerald-500 border-emerald-500" 
                    : "border-amber-400 dark:border-amber-600 bg-white dark:bg-slate-800"
                )}>
                  {hasAcknowledgedNotes && (
                    <span className="material-symbols-outlined text-white text-[16px]">check</span>
                  )}
                </div>
                <input 
                  type="checkbox"
                  checked={hasAcknowledgedNotes}
                  disabled={hasAcknowledgedNotes || isNotesAckSubmitting}
                  onChange={async (e) => {
                    if (e.target.checked && !hasAcknowledgedNotes) {
                      await acknowledgeNotes();
                    }
                  }}
                  className="sr-only"
                />
                <span className={cn(
                  "text-sm font-medium transition-colors",
                  hasAcknowledgedNotes 
                    ? "text-emerald-700 dark:text-emerald-400" 
                    : "text-amber-700 dark:text-amber-400"
                )}>
                  {hasAcknowledgedNotes ? '✓ Leitura confirmada' : 'Li e compreendi a observação acima'}
                </span>
              </label>
            </div>
          )}

          {/* Info Card with lock overlay for waiting status */}
          <div className="relative group">
            <section className={cn(
              "rounded-2xl bg-white dark:bg-[#2d3138] shadow-lg p-5 border border-slate-100 dark:border-slate-700 space-y-4",
              schedule.status === 'waiting' && "opacity-50 grayscale-[0.5]"
            )}>
              {/* Important Info - ALWAYS visible and required, even when content is locked */}
              {(hasImportantInfo || schedule.importantInfo) && (
                <div className={cn(
                  "flex flex-col gap-3 p-4 rounded-xl border-2",
                  hasAcknowledged 
                    ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700" 
                    : "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 animate-pulse"
                )}>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "material-symbols-outlined text-[20px]",
                      hasAcknowledged ? "text-emerald-500" : "text-amber-500"
                    )}>
                      {hasAcknowledged ? 'check_circle' : 'warning'}
                    </span>
                    <h3 className={cn(
                      "text-xs font-bold uppercase tracking-widest",
                      hasAcknowledged ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"
                    )}>
                      {hasAcknowledged ? 'Informações Confirmadas' : '⚠️ Leitura Obrigatória'}
                    </h3>
                    {!hasAcknowledged && (
                      <span className="ml-auto text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
                        OBRIGATÓRIO
                      </span>
                    )}
                  </div>
                  <div className={cn(
                    "rounded-xl p-4 border",
                    hasAcknowledged 
                      ? "bg-white dark:bg-slate-800/50 border-emerald-200 dark:border-emerald-800" 
                      : "bg-white dark:bg-slate-800/50 border-amber-200 dark:border-amber-800"
                  )}>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {schedule.importantInfo || 'Nenhuma informação importante para esta limpeza.'}
                    </p>
                  </div>
                  <label className={cn(
                    "flex items-center gap-3 py-2 cursor-pointer group/label",
                    hasAcknowledged && "cursor-default",
                    schedule.status === 'waiting' && "pointer-events-none opacity-50"
                  )}>
                    <div className={cn(
                      "w-6 h-6 border-2 rounded flex items-center justify-center transition-colors",
                      hasAcknowledged 
                        ? "bg-emerald-500 border-emerald-500" 
                        : "border-amber-400 dark:border-amber-600 bg-white dark:bg-slate-800"
                    )}>
                      {hasAcknowledged && (
                        <span className="material-symbols-outlined text-white text-[16px]">check</span>
                      )}
                    </div>
                    <input 
                      type="checkbox"
                      checked={hasAcknowledged}
                      disabled={hasAcknowledged || isAckSubmitting || schedule.status === 'waiting'}
                      onChange={async (e) => {
                        if (e.target.checked && !hasAcknowledged) {
                          const success = await toggleAcknowledge(true);
                          if (success) {
                            toast.success('Confirmação registrada!');
                          }
                        }
                      }}
                      className="sr-only"
                    />
                    <span className={cn(
                      "text-sm font-medium transition-colors",
                      hasAcknowledged 
                        ? "text-emerald-700 dark:text-emerald-400" 
                        : "text-amber-700 dark:text-amber-400"
                    )}>
                      {hasAcknowledged ? '✓ Leitura confirmada' : 'Li e compreendi as informações acima'}
                    </span>
                    {isAckSubmitting && (
                      <span className="text-xs text-slate-400 ml-2">Salvando...</span>
                    )}
                  </label>
                  {!hasAcknowledged && schedule.status !== 'waiting' && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 italic">
                      Você deve confirmar a leitura antes de iniciar a limpeza.
                    </p>
                  )}
                </div>
              )}

              {/* Proximity indicator for cleaners */}
              {schedule.status === 'released' && role === 'cleaner' && proximityCheck.propertyHasCoordinates && (
                <div className={cn(
                  "flex flex-col gap-2 rounded-xl p-3 mb-3 text-sm",
                  proximityCheck.loading 
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    : proximityCheck.isWithinRange 
                      ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                      : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Navigation className="h-4 w-4" />
                      {proximityCheck.loading ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-pulse">●</span>
                          Verificando sua localização...
                        </span>
                      ) : proximityCheck.error ? (
                        <span className="font-medium">{proximityCheck.error}</span>
                      ) : proximityCheck.distance !== null ? (
                        <span className="font-medium">
                          {proximityCheck.isWithinRange 
                            ? `Você está a ${formatDistance(proximityCheck.distance)} do imóvel ✓` 
                            : `Você está a ${formatDistance(proximityCheck.distance)} do imóvel`
                          }
                        </span>
                      ) : null}
                    </div>
                    {!proximityCheck.loading && (
                      <button
                        onClick={() => proximityCheck.refresh()}
                        className="text-xs underline hover:no-underline flex items-center gap-1"
                      >
                        <MapPin className="h-3 w-3" />
                        Atualizar
                      </button>
                    )}
                  </div>
                  
                  {/* Additional info when out of range */}
                  {!proximityCheck.loading && !proximityCheck.isWithinRange && proximityCheck.distance !== null && (
                    <div className="flex flex-col gap-1 pt-2 border-t border-red-200 dark:border-red-800">
                      <p className="text-xs font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">block</span>
                        Você precisa estar dentro de 500m do imóvel para iniciar
                      </p>
                      <p className="text-xs opacity-80">
                        Aproxime-se do endereço: <strong>{schedule.propertyAddress || schedule.propertyName}</strong>
                      </p>
                      <p className="text-xs opacity-60 mt-1">
                        Faltam aproximadamente {formatDistance(proximityCheck.distance - 500)} para entrar no raio permitido
                      </p>
                    </div>
                  )}
                  
                  {/* Error help text */}
                  {proximityCheck.error && (
                    <div className="text-xs opacity-80 pt-1 border-t border-red-200 dark:border-red-800">
                      {proximityCheck.error.includes('Permissão') && (
                        <p>Acesse as configurações do navegador e permita o acesso à localização para este site.</p>
                      )}
                      {proximityCheck.error.includes('indisponível') && (
                        <p>Verifique se o GPS do seu dispositivo está ativado.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Action button for Iniciar Limpeza - Only when status is released */}
              {schedule.status === 'released' && (
                <button 
                  onClick={handleStartCleaning}
                  disabled={isAckSubmitting || isCheckingChecklist || isCheckingAccess || proximityCheck.loading}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-xl py-4 font-bold text-white shadow-[0_4px_20px_-2px_rgba(51,153,153,0.3)] transition-all active:scale-[0.98]",
                    (role === 'cleaner' && proximityCheck.propertyHasCoordinates && (!proximityCheck.isWithinRange || proximityCheck.permissionState !== 'granted'))
                      ? "bg-slate-400 hover:bg-slate-500"
                      : !canTransition.allowed
                        ? "bg-slate-400 hover:bg-slate-500 cursor-not-allowed"
                        : "bg-primary hover:bg-[#267373]"
                  )}
                >
                  {(isCheckingChecklist || isCheckingAccess || proximityCheck.loading) ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">progress_activity</span>
                      {proximityCheck.loading ? 'Verificando localização...' : 'Verificando...'}
                    </>
                  ) : (role === 'cleaner' && proximityCheck.propertyHasCoordinates && proximityCheck.permissionState !== 'granted') ? (
                    <>
                      <span className="material-symbols-outlined">location_off</span>
                      Permitir Localização
                    </>
                  ) : (role === 'cleaner' && proximityCheck.propertyHasCoordinates && !proximityCheck.isWithinRange && proximityCheck.distance !== null) ? (
                    <>
                      <span className="material-symbols-outlined">location_off</span>
                      Aproxime-se ({formatDistance(proximityCheck.distance)})
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined filled">play_circle</span>
                      Iniciar Limpeza
                    </>
                  )}
                </button>
              )}

              {/* Disabled Iniciar Limpeza button for waiting status */}
              {schedule.status === 'waiting' && (
                <button 
                  disabled
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-4 font-bold text-slate-500 dark:text-slate-400 bg-slate-300 dark:bg-slate-700 cursor-not-allowed"
                >
                  <span className="material-symbols-outlined">play_circle</span>
                  Iniciar Limpeza
                </button>
              )}
            </section>

            {/* Lock overlay centered for waiting status */}
            {schedule.status === 'waiting' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-white/90 dark:bg-slate-900/90 p-3 rounded-full shadow-xl border border-slate-200 dark:border-slate-700">
                  <span className="material-symbols-outlined text-slate-400 text-[32px]">lock</span>
                </div>
              </div>
            )}
          </div>

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

          {/* Action Buttons - Ver Endereço e Ver Senha */}
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setShowLocationModal(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] transition-all active:scale-[0.98] dark:bg-white dark:text-slate-900"
            >
              <span className="material-symbols-outlined text-[18px]">map</span>
              Ver Endereço
            </button>
            {/* Rule: Cleaners can only see password button when schedule is released/cleaning/completed AND it's checkout day */}
            {(isAdmin || isManager || (schedule.status !== 'waiting' && isCheckoutDay)) ? (
              <button 
                onClick={() => setShowPasswordModal(true)}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3.5 text-xs font-bold text-slate-500 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:bg-[#2d3138] dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <span className="material-symbols-outlined text-[18px]">vpn_key</span>
                Ver Senha da Porta
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-3.5 text-xs font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500" title={!isCheckoutDay ? 'Senha disponível apenas no dia do checkout' : 'Aguardando liberação'}>
                <span className="material-symbols-outlined text-[18px]">lock</span>
                {!isCheckoutDay && schedule.status !== 'waiting' ? 'Senha (dia do checkout)' : 'Senha Bloqueada'}
              </div>
            )}
          </div>

          {/* Content Lock Alert Banner - shown when content is locked for cleaners */}
          {isContentLocked.locked && role === 'cleaner' && schedule.status !== 'waiting' && (
            <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-4 flex gap-3 items-start">
              <span className="material-symbols-outlined text-red-500 text-[22px] mt-0.5">block</span>
              <div className="flex-1">
                <h4 className="font-bold text-red-700 dark:text-red-400 text-sm mb-1">Conteúdo Bloqueado</h4>
                <p className="text-xs text-red-600 dark:text-red-500/80 leading-relaxed">
                  {isContentLocked.reason}
                </p>
                {proximityCheck.propertyHasCoordinates && !proximityCheck.isWithinRange && (
                  <button
                    onClick={() => proximityCheck.refresh()}
                    className="mt-2 text-xs font-medium text-red-700 dark:text-red-400 underline hover:no-underline flex items-center gap-1"
                  >
                    <MapPin className="h-3 w-3" />
                    Verificar localização novamente
                  </button>
                )}
              </div>
            </div>
          )}

          {/* === Content with opacity-40 when locked === */}
          <div className={cn(
            "space-y-4",
            isContentLocked.locked && "opacity-40 select-none pointer-events-none"
          )}>
            {/* Progress Section - Only show if checklist is required */}
            {requireChecklist && (
              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Progresso do Checklist</h3>
                  <span className="text-xs font-bold text-slate-400">{completedTasks}/{totalTasks} Concluídos</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-primary transition-all duration-500" 
                    style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
                  />
                </div>
              </section>
            )}

            {/* Checklist Section - Only show if checklist is required */}
            {requireChecklist && (
              <section className="flex flex-col gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-400 text-[20px]">check_circle</span>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Checklist de Limpeza</h3>
                </div>

            {Object.entries(groupedChecklist).map(([category, items]) => {
              const totalInCategory = items.length;
              const isExpanded = expandedCategories[category] ?? false;
              // Robust selection source:
              // - Prefer local UI state (checklistItemStates)
              // - Fallback to persisted item.status on reload/realtime
              const getSelection = (item: ChecklistItem): 'yes' | 'no' | null => {
                const local = checklistItemStates[item.id];
                if (local === 'yes' || local === 'no') return local;
                if (item.status === 'ok') return 'yes';
                if (item.status === 'not_ok') return 'no';
                return null;
              };

              // Count OK (yes) and DX (no) items separately
              const okCount = items.filter(item => getSelection(item) === 'yes').length;
              const dxCount = items.filter(item => getSelection(item) === 'no').length;
              const selectedCount = okCount + dxCount;
              const allSelected = selectedCount === totalInCategory;
              const hasDX = dxCount > 0;
              // A categoria só fica "verde/amarelo" quando temos evidência de persistência:
              // - categorySaveStatus === 'saved' (save callback) OU
              // - todos os itens já estão com status ok/not_ok no checklist (estado vindo do backend após reload/realtime)
              const isPersistedComplete = totalInCategory > 0 && items.every(it => it.status === 'ok' || it.status === 'not_ok');
              const saveStatus = categorySaveStatus[category] ?? (isPersistedComplete ? 'saved' : allSelected ? 'dirty' : 'idle');
              const isSaved = allSelected && saveStatus === 'saved';
              const isDirtyComplete = allSelected && saveStatus === 'dirty';
              const hasPhotosInCategory = categoryPhotosData[category] && categoryPhotosData[category].length > 0;
              const needsPhoto = requirePhotoPerCategory && allSelected && !hasPhotosInCategory;
              const photoCount = categoryPhotosData[category]?.length || 0;

              return (
                <div key={category} className={cn(
                  "relative overflow-hidden rounded-xl border bg-white dark:bg-[#2d3138]",
                  isSaved
                    ? hasDX
                      ? "border-amber-300 dark:border-amber-700"
                      : "border-green-300 dark:border-green-700"
                    : isDirtyComplete
                      ? "border-primary/30"
                      : "border-slate-200 dark:border-slate-700"
                )}>
                  <details open={isExpanded} className="group">
                    <summary 
                      onClick={(e) => { e.preventDefault(); toggleCategory(category); }}
                      className={cn(
                        "flex cursor-pointer items-center justify-between p-4 font-medium",
                        isSaved
                          ? hasDX
                            ? "bg-amber-50 dark:bg-amber-900/20"
                            : "bg-green-50 dark:bg-green-900/20"
                          : isDirtyComplete
                            ? "bg-primary/5 dark:bg-primary/10"
                            : "bg-slate-50 dark:bg-slate-800/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-4 w-4 rounded-full border-2 flex items-center justify-center",
                          isSaved
                            ? hasDX
                              ? "bg-amber-500 border-amber-500"
                              : "bg-green-500 border-green-500"
                            : isDirtyComplete
                              ? "border-primary"
                              : "border-slate-300 dark:border-slate-500"
                        )}>
                          {isSaved && (
                            <span className="material-symbols-outlined text-white text-[12px]">
                              {hasDX ? 'warning' : 'check'}
                            </span>
                          )}
                          {!isSaved && isDirtyComplete && (
                            <span className="material-symbols-outlined text-primary text-[12px] animate-spin">sync</span>
                          )}
                        </div>
                        <span className={cn(
                          "font-bold",
                          isSaved
                            ? hasDX
                              ? "text-amber-700 dark:text-amber-300"
                              : "text-green-700 dark:text-green-300"
                            : "text-slate-900 dark:text-white"
                        )}>{category}</span>
                        {needsPhoto && (
                          <div className="flex items-center gap-1 text-amber-500" title="Foto do ambiente obrigatória para concluir">
                            <span className="material-symbols-outlined text-[16px]">warning</span>
                            <span className="text-[10px] font-semibold">Foto pendente</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5">
                        {/* Progress indicator: OK / DX counts */}
                        {!isExpanded && (
                          <div className="flex items-center gap-1.5">
                            {okCount > 0 && (
                              <span className="flex items-center gap-0.5 text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full">
                                <span className="material-symbols-outlined text-[12px]">check</span>
                                {okCount}
                              </span>
                            )}
                            {dxCount > 0 && (
                              <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded-full">
                                <span className="material-symbols-outlined text-[12px]">close</span>
                                {dxCount}
                              </span>
                            )}
                            {selectedCount < totalInCategory && (
                              <span className="text-xs font-semibold text-slate-400">
                                {selectedCount}/{totalInCategory}
                              </span>
                            )}
                          </div>
                        )}
                        {/* Photo button - only enabled when all items selected */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setPhotoUploadModal({ open: true, category });
                          }}
                          disabled={!allSelected || !isChecklistEditable}
                          aria-label="Adicionar Foto" 
                          className={cn(
                            "relative rounded-full p-1 transition-colors",
                            allSelected 
                              ? "text-primary hover:text-[#267373] hover:bg-primary/10" 
                              : "text-slate-300 cursor-not-allowed dark:text-slate-600"
                          )}
                          title={
                            !isChecklistEditable
                              ? 'Checklist não editável'
                              : allSelected
                                ? 'Adicionar foto do ambiente'
                                : 'Selecione todos os itens para adicionar foto'
                          }
                        >
                          <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                          {photoCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                              {photoCount}
                            </span>
                          )}
                        </button>
                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-600 mx-1" />
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
                              <div key={item.id} className="flex items-center px-4 py-4 gap-4 active:bg-slate-50 dark:active:bg-slate-800/30 transition-colors touch-manipulation">
                                <div className="flex items-center gap-3 shrink-0">
                                  {/* DX (No) button - larger touch target */}
                                  <label className="relative cursor-pointer touch-manipulation">
                                    <input 
                                      type="radio" 
                                      name={`item-${item.id}`} 
                                      value="no"
                                      checked={itemState === 'no'}
                                      disabled={!isChecklistEditable}
                                      onChange={() => handleChecklistItemChange(item.id, 'no', category)}
                                      className="peer sr-only" 
                                    />
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100/50 text-slate-300 transition-all active:scale-95 peer-checked:bg-red-500 peer-checked:text-white peer-checked:shadow-md dark:bg-slate-700/50 dark:text-slate-500 dark:peer-checked:bg-red-500">
                                      <span className="material-symbols-outlined text-[20px] font-bold">close</span>
                                    </div>
                                  </label>
                                  {/* OK (Yes) button - larger touch target */}
                                  <label className="relative cursor-pointer touch-manipulation">
                                    <input 
                                      type="radio" 
                                      name={`item-${item.id}`} 
                                      value="yes"
                                      checked={itemState === 'yes'}
                                      disabled={!isChecklistEditable}
                                      onChange={() => handleChecklistItemChange(item.id, 'yes', category)}
                                      className="peer sr-only" 
                                    />
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100/50 text-slate-300 transition-all active:scale-95 peer-checked:bg-green-500 peer-checked:text-white peer-checked:shadow-md dark:bg-slate-700/50 dark:text-slate-500 dark:peer-checked:bg-green-500">
                                      <span className="material-symbols-outlined text-[20px] font-bold">check</span>
                                    </div>
                                  </label>
                                </div>
                                <span className="text-base font-medium text-slate-700 dark:text-slate-300 leading-tight">{item.title}</span>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Auto-save status indicator */}
                        {schedule.status === 'cleaning' && (
                          <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                            {isAutoSaving ? (
                              <div className="flex items-center gap-2 text-primary">
                                <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                                <span className="text-xs font-medium">Salvando...</span>
                              </div>
                            ) : lastAutoSavedAt ? (
                              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                <span className="text-xs font-medium">Salvo automaticamente</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-slate-400">
                                <span className="material-symbols-outlined text-[16px]">cloud_sync</span>
                                <span className="text-xs font-medium">Auto-save ativo</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </details>
                </div>
              );
            })}
            </section>
            )}

            {/* Maintenance Section - Uses localIssues (Rule 41.1, 44.1) */}
            <section className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 text-[20px]">build</span>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Manutenção</h3>
              </div>
              
              {localIssues.length > 0 && (
                <div className="flex flex-col gap-3">
                  {localIssues.map(issue => (
                    <div key={issue.id} className="rounded-xl border border-amber-100 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/10 p-4 flex items-start gap-3">
                      <span className="material-symbols-outlined text-amber-500 text-[20px]">warning</span>
                      <div className="flex flex-col flex-1">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">{issue.description}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Reportado em {format(issue.reportedAt, "dd/MM - HH:mm")}
                        </p>
                      </div>
                      {schedule.status !== 'completed' && schedule.status !== 'waiting' && (
                        <button
                          onClick={() => setDeleteIssueConfirm({ open: true, issueId: issue.id })}
                          className="flex items-center justify-center rounded-full p-1.5 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors dark:hover:bg-red-900/30"
                          title="Excluir avaria"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowIssueForm(true)}
                disabled={schedule.status === 'waiting'}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 py-3 font-bold text-slate-400 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[20px]">report_problem</span>
                Reportar Avaria
              </button>
            </section>
            {/* Cleaner Observations Section - Editable during cleaning */}
            <section className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 text-[20px]">chat_bubble</span>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Suas Observações</h3>
              </div>
              <div className="bg-white dark:bg-[#2d3138] border border-slate-200 dark:border-slate-800 rounded-xl p-4 min-h-[96px]">
                {schedule.status === 'waiting' ? (
                  <span className="text-sm text-slate-300 dark:text-slate-600 italic">
                    Disponível quando a limpeza iniciar...
                  </span>
                ) : schedule.status === 'cleaning' ? (
                  <textarea 
                    value={cleanerObservations}
                    onChange={(e) => setCleanerObservations(e.target.value)}
                    className="w-full h-full min-h-[72px] bg-transparent text-sm text-slate-600 dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-600 placeholder:italic resize-none focus:outline-none" 
                    placeholder="Adicione observações sobre a limpeza (serão enviadas ao finalizar)..."
                  />
                ) : (
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {cleanerObservations || 'Sem observações'}
                  </span>
                )}
              </div>
            </section>
          </div>

          {/* History Section */}
          <section className="flex flex-col gap-3 mt-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-primary text-[20px]">history</span>
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-white">Histórico</h3>
            </div>
            <div className="relative pl-4 border-l-2 border-slate-100 dark:border-slate-700 ml-2 space-y-6">
              {/* Agendamento Criado - uses schedule creation from history or fallback */}
              {(() => {
                const createdEvent = schedule.history?.find(e => e.action === 'schedule_created');
                return (
                  <div className="relative">
                    <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-white bg-slate-300 dark:border-[#2d3138] dark:bg-slate-600" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Agendamento criado</span>
                      <span className="text-[10px] text-[#8A8B88] dark:text-slate-500">
                        {createdEvent ? format(new Date(createdEvent.timestamp), "dd/MM 'às' HH:mm") : "--/-- às --:--"}
                      </span>
                    </div>
                  </div>
                );
              })()}
              
              {/* Liberado - shows release time from history */}
              {(() => {
                const releaseEvent = schedule.history?.find(e => 
                  (e.action === 'status_change' && e.to_status === 'released') ||
                  e.action === 'liberacao_automatica_checkout' ||
                  e.action === 'liberacao_automatica_antecipada'
                );
                const isReleased = schedule.status !== 'waiting';
                const isAutoRelease = releaseEvent?.action?.startsWith('liberacao_automatica');
                
                return (
                  <div className={cn("relative", !releaseEvent && "opacity-50")}>
                    <span className={cn(
                      "absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-white dark:border-[#2d3138]",
                      isReleased ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"
                    )} />
                    <div className="flex flex-col">
                      <span className={cn(
                        "text-xs font-bold",
                        isReleased ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"
                      )}>
                        Liberado
                        {isAutoRelease && (
                          <span className="ml-1 text-[10px] font-normal text-amber-600 dark:text-amber-400">(automático)</span>
                        )}
                      </span>
                      <span className="text-[10px] text-[#8A8B88] dark:text-slate-600">
                        {releaseEvent ? format(new Date(releaseEvent.timestamp), "dd/MM 'às' HH:mm") : "--:--"}
                      </span>
                      {releaseEvent?.team_member_name && !isAutoRelease && (
                        <span className="text-[10px] text-muted-foreground">
                          por {releaseEvent.team_member_name}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
              
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
      </div>
      
      {/* Footer Button - Always visible at bottom with safe area for notched devices */}
      <div className="shrink-0 bg-stone-50 dark:bg-[#22252a] border-t border-slate-200 dark:border-slate-800 px-4 pt-4 pb-safe">
          {/* Waiting status - disabled button */}
          {schedule.status === 'waiting' && (
            <button 
              disabled
              className="w-full bg-primary/40 text-white/50 py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/20 cursor-not-allowed"
            >
              Finalizar Limpeza
            </button>
          )}

          {/* Released status - no button shown */}
          {schedule.status === 'released' && (
            <button
              onClick={handleStartCleaning}
              disabled={isAckSubmitting || isCheckingChecklist || isCheckingAccess || proximityCheck.loading}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl py-4 font-bold text-white shadow-[0_4px_20px_-2px_rgba(51,153,153,0.3)] transition-all active:scale-[0.98]",
                (role === 'cleaner' && proximityCheck.propertyHasCoordinates && (!proximityCheck.isWithinRange || proximityCheck.permissionState !== 'granted'))
                  ? "bg-slate-400 hover:bg-slate-500"
                  : !canTransition.allowed
                    ? "bg-slate-400 hover:bg-slate-500 cursor-not-allowed"
                    : "bg-primary hover:bg-[#267373]"
              )}
            >
              {(isCheckingChecklist || isCheckingAccess || proximityCheck.loading) ? (
                <>
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  {proximityCheck.loading ? 'Verificando localização...' : 'Verificando...'}
                </>
              ) : (role === 'cleaner' && proximityCheck.propertyHasCoordinates && proximityCheck.permissionState !== 'granted') ? (
                <>
                  <span className="material-symbols-outlined">location_off</span>
                  Permitir Localização
                </>
              ) : (role === 'cleaner' && proximityCheck.propertyHasCoordinates && !proximityCheck.isWithinRange && proximityCheck.distance !== null) ? (
                <>
                  <span className="material-symbols-outlined">location_off</span>
                  Aproxime-se ({formatDistance(proximityCheck.distance)})
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined filled">play_circle</span>
                  Iniciar Limpeza
                </>
              )}
            </button>
          )}

          {/* Cleaning status - Finalizar button */}
          {schedule.status === 'cleaning' && (() => {
            const categoriesMissingPhotos = getCategoriesMissingPhotos();
            const pendingCategoriesPreview = getPendingCategoriesDetails();
            const hasPendingItems = pendingCategoriesPreview.length > 0;
            const hasMissingPhotos = categoriesMissingPhotos.length > 0;
            const isBlocked = hasMissingPhotos || hasPendingItems;
            const totalPendingItems = pendingCategoriesPreview.reduce((acc, cat) => acc + cat.pendingCount, 0);
            
            return (
              <div className="flex flex-col gap-3">
                {/* Missing Photos Alert - only show this as visual hint */}
                {hasMissingPhotos && (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-medium justify-center bg-amber-50 dark:bg-amber-900/20 rounded-lg py-2 px-3 border border-amber-200 dark:border-amber-700/50">
                    <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                    <span>Fotos pendentes em: {categoriesMissingPhotos.join(', ')}</span>
                  </div>
                )}

                <button 
                  onClick={() => handleStatusChange('completed')}
                  disabled={isCommitting || (requireChecklist && (hasPendingItems || hasMissingPhotos))}
                  className={cn(
                    "w-full rounded-xl py-4 text-base font-bold text-white shadow-lg shadow-primary/20 transition-all active:scale-[0.98]",
                    isCommitting || (requireChecklist && (hasPendingItems || hasMissingPhotos))
                      ? "bg-slate-400 cursor-not-allowed" 
                      : "bg-primary hover:bg-[#267373]"
                  )}
                >
                  {isCommitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      Finalizando...
                    </span>
                  ) : requireChecklist && hasPendingItems ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">checklist</span>
                      Complete o Checklist ({totalPendingItems} pendentes)
                    </span>
                  ) : requireChecklist && hasMissingPhotos ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                      Adicionar Fotos ({categoriesMissingPhotos.length})
                    </span>
                  ) : (
                    'Finalizar Limpeza'
                  )}
                </button>
              </div>
            );
          })()}

          {/* Completed status - success message */}
          {schedule.status === 'completed' && (
            <div className="flex items-center justify-center gap-2 text-primary py-2">
              <span className="material-symbols-outlined">check_circle</span>
              <span className="font-bold">Limpeza Finalizada</span>
            </div>
          )}
        </div>

      {/* Location Modal */}
      {showLocationModal && (
        <LocationModal
          propertyName={schedule.propertyName}
          address={schedule.propertyAddress || ''}
          latitude={schedule.propertyLatitude}
          longitude={schedule.propertyLongitude}
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
          scheduleStatus={schedule.status}
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
          requirePhoto={requirePhotoForIssues}
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

      {/* Location Required Modal - Forces location permission before starting cleaning */}
      <LocationRequiredModal
        isOpen={showLocationRequiredModal}
        onClose={() => setShowLocationRequiredModal(false)}
        permissionState={proximityCheck.permissionState}
        onRequestPermission={() => {
          proximityCheck.requestPermission();
          // After requesting permission, check again
          setTimeout(() => {
            proximityCheck.refresh();
          }, 1000);
        }}
        distance={proximityCheck.distance}
        isLoading={proximityCheck.loading}
        onRetry={() => proximityCheck.refresh()}
        error={proximityCheck.error}
      />
    </div>
  );
}
