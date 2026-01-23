import { useState } from 'react';
import { UserPlus, Check, Loader2, Users, X, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAssignableCleaners } from '@/hooks/useAssignableCleaners';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AssignCleanerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: string;
  propertyId: string;
  propertyName: string;
  currentCleanerName: string | null;
  responsibleTeamMemberId: string | null;
  status: string;
  onAssigned: (cleanerName: string, teamMemberId: string) => void;
}

export function AssignCleanerSheet({
  open,
  onOpenChange,
  scheduleId,
  propertyId,
  propertyName,
  currentCleanerName,
  responsibleTeamMemberId,
  status,
  onAssigned,
}: AssignCleanerSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { cleaners, loading, error } = useAssignableCleaners(propertyId);

  // Block reassignment during cleaning
  const isBlocked = status === 'cleaning';

  const handleAssign = async (cleaner: { id: string; name: string }) => {
    if (isBlocked || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from('schedules')
        .update({
          responsible_team_member_id: cleaner.id,
          cleaner_name: cleaner.name,
        })
        .eq('id', scheduleId);

      if (updateError) throw updateError;

      onAssigned(cleaner.name, cleaner.id);
      toast.success(`${cleaner.name} atribuído(a) à limpeza`);
      onOpenChange(false);
    } catch (err) {
      console.error('Error assigning cleaner:', err);
      toast.error('Erro ao atribuir responsável');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAssignment = async () => {
    if (isBlocked || isSubmitting || !responsibleTeamMemberId) return;

    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from('schedules')
        .update({
          responsible_team_member_id: null,
          cleaner_name: null,
        })
        .eq('id', scheduleId);

      if (updateError) throw updateError;

      onAssigned('', '');
      toast.success('Responsável removido');
      onOpenChange(false);
    } catch (err) {
      console.error('Error removing assignment:', err);
      toast.error('Erro ao remover responsável');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[24px] px-0 pb-safe max-h-[85dvh]">
        {/* Header */}
        <SheetHeader className="px-5 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <UserPlus className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <SheetTitle className="text-lg font-bold text-foreground">
                Atribuir Responsável
              </SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {propertyName}
              </p>
            </div>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="px-5 py-4 overflow-y-auto max-h-[60dvh]">
          {/* Current Assignment */}
          {currentCleanerName && currentCleanerName !== 'Não atribuído' && (
            <div className="mb-4 p-3 bg-primary/5 rounded-xl border border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Atual:</p>
                    <p className="font-semibold text-foreground">{currentCleanerName}</p>
                  </div>
                </div>
                {!isBlocked && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleRemoveAssignment}
                    disabled={isSubmitting}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Block Message */}
          {isBlocked && (
            <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-700 dark:text-amber-300 text-center">
                Não é possível alterar o responsável durante a limpeza
              </p>
            </div>
          )}

          {/* Cleaners List */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Equipe Disponível
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-sm text-destructive text-center py-8 px-4">
                {error}
              </div>
            ) : cleaners.length === 0 ? (
              <div className="text-center py-8 px-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mx-auto mb-3">
                  <Users className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Nenhum limpador vinculado a este imóvel
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {cleaners.map((cleaner) => {
                  const isSelected = cleaner.id === responsibleTeamMemberId;
                  return (
                    <button
                      key={cleaner.id}
                      onClick={() => handleAssign(cleaner)}
                      disabled={isSubmitting || isBlocked}
                      className={cn(
                        'w-full flex items-center justify-between p-4 rounded-xl border transition-all',
                        isSelected
                          ? 'bg-primary/10 border-primary/30 ring-2 ring-primary/20'
                          : 'bg-card border-border hover:bg-accent hover:border-accent',
                        (isSubmitting || isBlocked) && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold",
                          isSelected 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted text-muted-foreground"
                        )}>
                          {cleaner.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div className="text-left">
                          <p className={cn(
                            "font-semibold",
                            isSelected ? "text-primary" : "text-foreground"
                          )}>
                            {cleaner.name}
                          </p>
                          <p className="text-xs text-muted-foreground">{cleaner.email}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pt-4 border-t border-border">
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}