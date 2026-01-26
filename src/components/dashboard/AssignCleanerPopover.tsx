import { useState } from 'react';
import { UserPlus, Check, Loader2, Users, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useAssignableCleaners } from '@/hooks/useAssignableCleaners';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AssignCleanerPopoverProps {
  scheduleId: string;
  propertyId: string;
  currentCleanerName: string | null;
  responsibleTeamMemberId: string | null;
  status: string;
  onAssigned: (cleanerName: string, teamMemberId: string) => void;
  disabled?: boolean;
}

export function AssignCleanerPopover({
  scheduleId,
  propertyId,
  currentCleanerName,
  responsibleTeamMemberId,
  status,
  onAssigned,
  disabled = false,
}: AssignCleanerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { cleaners, loading, error } = useAssignableCleaners(propertyId);
  const { isAdmin, isSuperAdmin } = useUserRole();

  // REGRA: Anfitrião (manager) NÃO pode atribuir ou alterar cleaner
  // Apenas Admin/SuperAdmin podem fazer essa ação
  const canAssign = isAdmin || isSuperAdmin;

  // Block reassignment during cleaning (except admin - handled in parent)
  const isBlocked = status === 'cleaning' && disabled;

  const handleAssign = async (cleaner: { id: string; name: string }) => {
    if (isBlocked || isSubmitting || !canAssign) return;

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
      setOpen(false);
    } catch (err) {
      console.error('Error assigning cleaner:', err);
      toast.error('Erro ao atribuir responsável');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 w-8 p-0 rounded-full',
            responsibleTeamMemberId ? 'text-primary' : 'text-muted-foreground hover:text-primary'
          )}
          disabled={isBlocked || !canAssign}
          title={
            !canAssign 
              ? 'Apenas o Proprietário pode atribuir responsáveis' 
              : isBlocked 
                ? 'Não é possível reatribuir durante a limpeza' 
                : 'Atribuir limpeza'
          }
          onClick={(e) => e.stopPropagation()}
        >
          {!canAssign ? <Lock className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-2"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-2 pb-2 border-b">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Atribuir Responsável</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : !canAssign ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground text-center py-4 px-2">
              <Lock className="h-4 w-4" />
              <span>Apenas o Proprietário pode atribuir responsáveis</span>
            </div>
          ) : error ? (
            <div className="text-sm text-destructive text-center py-4">{error}</div>
          ) : cleaners.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              Nenhum limpador vinculado a este imóvel
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {cleaners.map((cleaner) => {
                const isSelected = cleaner.id === responsibleTeamMemberId;
                return (
                  <button
                    key={cleaner.id}
                    onClick={() => handleAssign(cleaner)}
                    disabled={isSubmitting}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors',
                      isSelected
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted'
                    )}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{cleaner.name}</span>
                      <span className="text-xs text-muted-foreground">{cleaner.email}</span>
                    </div>
                    {isSelected && <Check className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          )}

          {currentCleanerName && currentCleanerName !== 'Não atribuído' && (
            <div className="px-2 pt-2 border-t text-xs text-muted-foreground">
              Atual: <span className="font-medium">{currentCleanerName}</span>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
