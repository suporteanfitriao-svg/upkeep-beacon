import { useState, useEffect } from 'react';
import { 
  X, Clock, Building2, Calendar, User, ClipboardCheck, 
  CheckCircle2, Play, Loader2, MessageSquare, History
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

interface InspectionHistoryEvent {
  timestamp: string;
  action: string;
  user_name?: string;
}

interface MobileInspectionDetailProps {
  inspection: CleanerInspection & {
    started_at?: string;
    history?: InspectionHistoryEvent[];
    verification_comment?: string;
  };
  onClose: () => void;
  onUpdate: () => void;
}

export function MobileInspectionDetail({
  inspection,
  onClose,
  onUpdate
}: MobileInspectionDetailProps) {
  const [isVerified, setIsVerified] = useState(false);
  const [comment, setComment] = useState(inspection.verification_comment || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState<InspectionHistoryEvent[]>(
    Array.isArray(inspection.history) ? inspection.history : []
  );

  const isInProgress = inspection.status === 'in_progress';
  const isScheduled = inspection.status === 'scheduled';

  // Check if can finish: must be verified and have comment
  const canFinish = isVerified && comment.trim().length >= 10;

  const handleStartInspection = async () => {
    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      
      // Get user name for history
      const { data: { user } } = await supabase.auth.getUser();
      let userName = 'Usuário';
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .maybeSingle();
        userName = profile?.name || 'Usuário';
      }

      const newHistory: InspectionHistoryEvent[] = [
        ...history,
        { timestamp: now, action: 'started', user_name: userName }
      ];

      const { error } = await supabase
        .from('inspections')
        .update({ 
          status: 'in_progress',
          started_at: now,
          history: JSON.parse(JSON.stringify(newHistory))
        })
        .eq('id', inspection.id);

      if (error) throw error;

      toast.success('Inspeção iniciada!');
      setHistory(newHistory);
      onUpdate();
    } catch (error) {
      console.error('Error starting inspection:', error);
      toast.error('Erro ao iniciar inspeção');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishInspection = async () => {
    if (!canFinish) {
      toast.error('Marque como verificado e adicione um comentário (mínimo 10 caracteres)');
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

  // Save comment as user types (debounced)
  useEffect(() => {
    if (!isInProgress || comment === inspection.verification_comment) return;
    
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
  }, [comment, inspection.id, isInProgress, inspection.verification_comment]);

  const formatHistoryAction = (action: string) => {
    switch (action) {
      case 'created': return 'Inspeção criada';
      case 'started': return 'Inspeção iniciada';
      case 'completed': return 'Inspeção finalizada';
      default: return action;
    }
  };

  return (
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
                  : 'Finalizar Inspeção'
            }
          </Button>
        )}
      </div>
    </div>
  );
}