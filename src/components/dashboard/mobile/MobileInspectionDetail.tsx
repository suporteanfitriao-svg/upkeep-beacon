import { useState, useEffect, useRef } from 'react';
import { 
  X, Clock, Building2, Calendar, User, ClipboardCheck, 
  CheckCircle2, Play, Loader2, MessageSquare, History, Camera, ImagePlus, Trash2,
  AlertTriangle, BookOpen, Shield, ListChecks, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CleanerInspection } from '@/hooks/useCleanerInspections';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useImageCompression } from '@/hooks/useImageCompression';

interface InspectionHistoryEvent {
  timestamp: string;
  action: string;
  user_name?: string;
}

interface InspectionPhoto {
  url: string;
  timestamp: string;
  uploaded_by?: string;
}

interface HouseRule {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  is_active: boolean;
}

interface MobileInspectionDetailProps {
  inspection: CleanerInspection;
  onClose: () => void;
  onUpdate: (shouldClose?: boolean) => void;
}

// Normalize photos to always have timestamp
const normalizePhotos = (photos: (string | InspectionPhoto)[] | undefined): InspectionPhoto[] => {
  if (!photos || !Array.isArray(photos)) return [];
  return photos.map(photo => {
    if (typeof photo === 'string') {
      return { url: photo, timestamp: new Date().toISOString() };
    }
    return photo;
  });
};

export function MobileInspectionDetail({
  inspection,
  onClose,
  onUpdate
}: MobileInspectionDetailProps) {
  console.log('[MobileInspectionDetail] Render - inspection:', inspection?.id, 'status:', inspection?.status);
  
  const isValidInspection = inspection && inspection.id;
  
  const [isVerified, setIsVerified] = useState(false);
  const [comment, setComment] = useState(inspection?.verification_comment || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState<InspectionHistoryEvent[]>(
    Array.isArray(inspection?.history) ? inspection.history : []
  );
  const [photos, setPhotos] = useState<InspectionPhoto[]>(() => 
    normalizePhotos(inspection?.inspection_photos as (string | InspectionPhoto)[] | undefined)
  );
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [requirePhoto, setRequirePhoto] = useState(false);
  const [userName, setUserName] = useState('Usuário');
  const [houseRules, setHouseRules] = useState<HouseRule[]>([]);
  const [localStatus, setLocalStatus] = useState(inspection?.status || 'scheduled');
  const [checklistState, setChecklistState] = useState(inspection?.checklist_state || []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { compressImage } = useImageCompression();

  // Close if inspection is invalid - only run once on mount
  useEffect(() => {
    if (!isValidInspection) {
      console.error('[MobileInspectionDetail] Invalid inspection data:', inspection);
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch property rule for photo requirement, user name, and house rules
  useEffect(() => {
    if (!isValidInspection) return;
    
    const fetchPropertyRule = async () => {
      if (!inspection.property_id) {
        setRequirePhoto(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('require_photo_for_inspections')
          .eq('id', inspection.property_id)
          .single();
        
        if (error) {
          console.error('[MobileInspectionDetail] Error fetching property rule:', error);
          return;
        }
        
        if (data) {
          setRequirePhoto(data.require_photo_for_inspections ?? false);
        }
      } catch (error) {
        console.error('[MobileInspectionDetail] Error in fetchPropertyRule:', error);
      }
    };
    
    const fetchUserName = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', user.id)
            .maybeSingle();
          setUserName(profile?.name || 'Usuário');
        }
      } catch (error) {
        console.error('[MobileInspectionDetail] Error fetching user name:', error);
      }
    };

    const fetchHouseRules = async () => {
      if (!inspection.property_id) return;
      
      try {
        const { data: rules, error } = await supabase
          .from('house_rules')
          .select('*')
          .eq('is_active', true)
          .order('priority', { ascending: false })
          .order('sort_order', { ascending: true });
        
        if (error) {
          console.error('[MobileInspectionDetail] Error fetching house rules:', error);
          return;
        }
        
        if (rules) {
          setHouseRules(rules);
        }
      } catch (error) {
        console.error('[MobileInspectionDetail] Error in fetchHouseRules:', error);
      }
    };

    fetchPropertyRule();
    fetchUserName();
    fetchHouseRules();
  }, [isValidInspection, inspection?.property_id]);

  // Save comment as user types (debounced)
  useEffect(() => {
    if (!isValidInspection) return;
    if (localStatus !== 'in_progress' || comment === inspection?.verification_comment) return;
    
    const timeout = setTimeout(async () => {
      try {
        await supabase
          .from('inspections')
          .update({ verification_comment: comment.trim() })
          .eq('id', inspection.id);
      } catch (error) {
        console.error('Error saving comment:', error);
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [comment, inspection?.id, localStatus, inspection?.verification_comment, isValidInspection]);

  // Return null early if invalid, but after all hooks
  if (!isValidInspection) {
    return null;
  }

  const isInProgress = localStatus === 'in_progress';
  const isScheduled = localStatus === 'scheduled';
  const hasChecklist = checklistState.length > 0;
  const checklistProgress = hasChecklist 
    ? `${checklistState.filter(i => i.checked).length}/${checklistState.length}`
    : null;

  // Check if can finish: must be verified, have comment, and have photo if required
  const hasRequiredPhotos = !requirePhoto || photos.length > 0;
  const canFinish = isVerified && comment.trim().length >= 10 && hasRequiredPhotos;

  // Lightweight start - no validations, no sync waits, just start immediately
  const handleStartInspection = () => {
    if (isSubmitting) return; // Prevent double clicks
    
    const now = new Date().toISOString();
    
    // IMMEDIATE local state update - user sees response instantly
    const newHistory: InspectionHistoryEvent[] = [
      ...history,
      { timestamp: now, action: 'started', user_name: userName }
    ];
    
    setLocalStatus('in_progress');
    setHistory(newHistory);
    setIsSubmitting(true);
    
    toast.success('Inspeção iniciada!');
    
    // Background save - fire and forget, don't block UI
    supabase
      .from('inspections')
      .update({ 
        status: 'in_progress',
        started_at: now,
        history: JSON.parse(JSON.stringify(newHistory))
      })
      .eq('id', inspection.id)
      .then(({ error }) => {
        if (error) {
          console.error('Error saving inspection start:', error);
          // Don't revert UI - let user continue working
        }
        setIsSubmitting(false);
      });
    
    // Notify parent in background - no waiting
    setTimeout(() => onUpdate(false), 50);
  };

  const handleFinishInspection = async () => {
    if (!canFinish) {
      if (!isVerified) {
        toast.error('Marque como verificado para continuar');
      } else if (comment.trim().length < 10) {
        toast.error('Adicione um comentário (mínimo 10 caracteres)');
      } else if (requirePhoto && photos.length === 0) {
        toast.error('Adicione pelo menos 1 foto para finalizar a inspeção');
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      
      // Get user info
      const { data: { user } } = await supabase.auth.getUser();
      let userName = 'Usuário';
      let teamMemberId: string | null = null;
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, team_member_id')
          .eq('id', user.id)
          .maybeSingle();
        userName = profile?.name || 'Usuário';
        teamMemberId = profile?.team_member_id || null;
      }

      const newHistory: InspectionHistoryEvent[] = [
        ...history,
        { timestamp: now, action: 'completed', user_name: userName }
      ];

      const { error } = await supabase
        .from('inspections')
        .update({ 
          status: 'completed',
          completed_at: now,
          completed_by: teamMemberId,
          completed_by_name: userName,
          verification_comment: comment.trim(),
          inspection_photos: JSON.parse(JSON.stringify(photos)),
          history: JSON.parse(JSON.stringify(newHistory))
        })
        .eq('id', inspection.id);

      if (error) throw error;

      toast.success('Inspeção finalizada!');
      onClose();
      onUpdate();
    } catch (error) {
      console.error('Error finishing inspection:', error);
      toast.error('Erro ao finalizar inspeção');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      // Compress image
      const compressedFile = await compressImage(file);
      
      // Upload to storage
      const fileName = `${inspection.id}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('inspection-photos')
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('inspection-photos')
        .getPublicUrl(uploadData.path);

      const newPhoto: InspectionPhoto = {
        url: urlData.publicUrl,
        timestamp: new Date().toISOString(),
        uploaded_by: userName,
      };
      const newPhotos = [...photos, newPhoto];
      setPhotos(newPhotos);

      // Save to inspection immediately
      await supabase
        .from('inspections')
        .update({ inspection_photos: JSON.parse(JSON.stringify(newPhotos)) })
        .eq('id', inspection.id);

      toast.success('Foto adicionada!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Erro ao enviar foto');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = async (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);

    try {
      await supabase
        .from('inspections')
        .update({ inspection_photos: JSON.parse(JSON.stringify(newPhotos)) })
        .eq('id', inspection.id);
      toast.success('Foto removida');
    } catch (error) {
      console.error('Error removing photo:', error);
    }
  };

  // Toggle checklist item and save to database
  const handleChecklistToggle = async (itemId: string) => {
    const updatedState = checklistState.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    setChecklistState(updatedState);

    try {
      await supabase
        .from('inspections')
        .update({ checklist_state: JSON.parse(JSON.stringify(updatedState)) })
        .eq('id', inspection.id);
    } catch (error) {
      console.error('Error updating checklist:', error);
      toast.error('Erro ao atualizar checklist');
    }
  };

  const formatHistoryAction = (action: string) => {
    switch (action) {
      case 'created': return 'Inspeção criada';
      case 'started': return 'Inspeção iniciada';
      case 'completed': return 'Inspeção finalizada';
      default: return action;
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[200] bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-purple-600 text-white">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-6 w-6" />
          <div>
            <h1 className="font-bold text-lg leading-tight">Inspeção</h1>
            <p className="text-sm text-purple-100">{inspection.property_name}</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="text-white hover:bg-purple-700"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6 pb-32">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={isInProgress 
                ? 'bg-yellow-100 text-yellow-700 border-yellow-200' 
                : 'bg-blue-100 text-blue-700 border-blue-200'
              }
            >
              {isInProgress ? (
                <>
                  <Play className="h-3 w-3 mr-1" />
                  Em Andamento
                </>
              ) : (
                <>
                  <Calendar className="h-3 w-3 mr-1" />
                  Agendada
                </>
              )}
            </Badge>
          </div>

          {/* Title and Description */}
          <div>
            <h2 className="text-xl font-bold text-foreground">{inspection.title}</h2>
            {inspection.description && (
              <p className="text-muted-foreground mt-1">{inspection.description}</p>
            )}
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-xl p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs font-medium">Data</span>
              </div>
              <p className="text-sm font-semibold">
                {format(parseISO(inspection.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
            
            {inspection.scheduled_time && (
              <div className="bg-muted/50 rounded-xl p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs font-medium">Horário</span>
                </div>
                <p className="text-sm font-semibold">
                  {inspection.scheduled_time.slice(0, 5)}
                </p>
              </div>
            )}
            
            {inspection.assigned_to_name && (
              <div className="bg-muted/50 rounded-xl p-3 col-span-2">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <User className="h-4 w-4" />
                  <span className="text-xs font-medium">Responsável</span>
                </div>
                <p className="text-sm font-semibold">
                  {inspection.assigned_to_name}
                </p>
              </div>
            )}
          </div>

          {/* Notes from admin */}
          {inspection.notes && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Observações do Gestor
              </h3>
              <p className="text-sm text-blue-600 dark:text-blue-400">{inspection.notes}</p>
            </div>
          )}

          {/* House Rules Section - Show when in progress */}
          {isInProgress && houseRules.length > 0 && (
            <>
              <Separator />
              
              <div className="space-y-3">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-amber-600" />
                  Regras da Casa
                </h3>
                
                <div className="space-y-2">
                  {houseRules.map((rule) => (
                    <div 
                      key={rule.id}
                      className={`p-3 rounded-lg border ${
                        rule.priority === 'high' 
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                          : rule.priority === 'medium'
                            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                            : 'bg-muted/50 border-border'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {rule.priority === 'high' && (
                          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${
                            rule.priority === 'high' 
                              ? 'text-red-700 dark:text-red-300' 
                              : rule.priority === 'medium'
                                ? 'text-amber-700 dark:text-amber-300'
                                : 'text-foreground'
                          }`}>
                            {rule.title}
                          </p>
                          {rule.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {rule.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Requirements Card - Show when in progress */}
          {isInProgress && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Requisitos para Finalizar
              </h3>
              <ul className="space-y-2">
                <li className={`flex items-center gap-2 text-sm ${isVerified ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {isVerified ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-current" />
                  )}
                  Marcar como verificado
                </li>
                <li className={`flex items-center gap-2 text-sm ${comment.trim().length >= 10 ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {comment.trim().length >= 10 ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-current" />
                  )}
                  Comentário obrigatório ({comment.trim().length}/10 caracteres)
                </li>
                {requirePhoto && (
                  <li className={`flex items-center gap-2 text-sm ${photos.length > 0 ? 'text-green-600' : 'text-amber-600'}`}>
                    {photos.length > 0 ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                    Foto obrigatória ({photos.length} enviada{photos.length !== 1 ? 's' : ''})
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Checklist Section - Show when in progress and has checklist */}
          {isInProgress && hasChecklist && (
            <>
              <Separator />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <ListChecks className="h-5 w-5 text-purple-600" />
                    Checklist de Verificação
                  </h3>
                  <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700">
                    {checklistProgress}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  {checklistState.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => handleChecklistToggle(item.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer active:scale-[0.98] transition-all ${
                        item.checked 
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' 
                          : 'bg-muted/30 border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                        item.checked 
                          ? 'bg-green-500 text-white' 
                          : 'border-2 border-muted-foreground/40'
                      }`}>
                        {item.checked && <Check className="h-4 w-4" />}
                      </div>
                      <span className={`text-sm flex-1 ${
                        item.checked ? 'text-green-700 dark:text-green-300 line-through' : 'text-foreground'
                      }`}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
                
                {/* All items checked indicator */}
                {checklistState.length > 0 && checklistState.every(i => i.checked) && (
                  <div className="flex items-center gap-2 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-700 dark:text-green-300">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-medium">Todos os itens verificados!</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Verification Section - Only show when in_progress */}
          {isInProgress && (
            <>
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-purple-600" />
                  Verificação da Inspeção
                </h3>

                {/* Verified Checkbox */}
                <div 
                  className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl cursor-pointer active:bg-muted transition-colors"
                  onClick={() => setIsVerified(!isVerified)}
                >
                  <Checkbox 
                    checked={isVerified}
                    onCheckedChange={(checked) => setIsVerified(checked as boolean)}
                    className="h-6 w-6 rounded-md border-2"
                  />
                  <div className="flex-1">
                    <p className="font-medium">Inspeção Verificada</p>
                    <p className="text-sm text-muted-foreground">
                      Confirmo que realizei a inspeção completa
                    </p>
                  </div>
                </div>

                {/* Comment Field */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Comentário Obrigatório *
                  </label>
                  <Textarea
                    placeholder="Descreva o resultado da inspeção, observações e qualquer pendência encontrada... (mínimo 10 caracteres)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    className="resize-none text-base"
                    onTouchStart={(e) => e.stopPropagation()}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {comment.length}/10 caracteres mínimos
                  </p>
                </div>

                {/* Photo Upload Section */}
                <div className="space-y-3">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Fotos da Inspeção {requirePhoto && <span className="text-destructive">*</span>}
                  </label>
                  
                  {requirePhoto && photos.length === 0 && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        ⚠️ Esta propriedade exige pelo menos 1 foto para finalizar a inspeção.
                      </p>
                    </div>
                  )}

                  {/* Photo Grid */}
                  {photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {photos.map((photo, index) => (
                        <div key={index} className="relative aspect-square">
                          <img 
                            src={photo.url} 
                            alt={`Foto ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg"
                          />
                          {photo.timestamp && (
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 rounded-b-lg">
                              <div className="flex items-center gap-1 text-[9px] text-white">
                                <Clock className="h-2.5 w-2.5" />
                                <span className="truncate">
                                  {format(parseISO(photo.timestamp), "dd/MM HH:mm", { locale: ptBR })}
                                </span>
                              </div>
                            </div>
                          )}
                          <button
                            onClick={() => handleRemovePhoto(index)}
                            className="absolute -top-2 -right-2 h-6 w-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload Button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    className="w-full h-12 border-dashed border-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                  >
                    {isUploadingPhoto ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <ImagePlus className="h-5 w-5 mr-2" />
                        Adicionar Foto
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* History Section */}
          {history.length > 0 && (
            <>
              <Separator />
              
              <div className="space-y-3">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <History className="h-5 w-5 text-muted-foreground" />
                  Histórico
                </h3>
                
                <div className="space-y-2">
                  {history.map((event, idx) => (
                    <div 
                      key={idx}
                      className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="h-2 w-2 rounded-full bg-purple-500 mt-2 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{formatHistoryAction(event.action)}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(event.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          {event.user_name && ` • ${event.user_name}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Creation Date */}
          <div className="text-xs text-muted-foreground text-center pt-4">
            Criada em {format(parseISO(inspection.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
          </div>
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t shadow-lg z-10">
        {isScheduled ? (
          <Button 
            onClick={handleStartInspection}
            disabled={isSubmitting}
            className="w-full h-14 text-lg font-bold bg-purple-600 hover:bg-purple-700"
          >
            {isSubmitting ? (
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
            ) : (
              <Play className="h-6 w-6 mr-2" />
            )}
            {isSubmitting ? 'Iniciando...' : 'Iniciar Inspeção'}
          </Button>
        ) : (
          <Button 
            onClick={handleFinishInspection}
            disabled={isSubmitting || !canFinish}
            className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="h-6 w-6 mr-2" />
            )}
            {isSubmitting 
              ? 'Finalizando...' 
              : !isVerified 
                ? 'Marque como Verificado' 
                : comment.trim().length < 10 
                  ? `Adicione Comentário (${10 - comment.trim().length} car.)`
                  : requirePhoto && photos.length === 0
                    ? 'Adicione Foto Obrigatória'
                    : 'Finalizar Inspeção'
            }
          </Button>
        )}
      </div>
    </div>
    </>
  );
}