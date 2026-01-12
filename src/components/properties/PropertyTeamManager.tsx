import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'cleaner';
  is_active: boolean;
  has_all_properties: boolean;
}

interface PropertyTeamManagerProps {
  propertyId: string;
  propertyName: string;
}

export function PropertyTeamManager({ propertyId, propertyName }: PropertyTeamManagerProps) {
  const [cleaners, setCleaners] = useState<TeamMember[]>([]);
  const [assignedCleanerIds, setAssignedCleanerIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchCleanersAndAssignments();
  }, [propertyId]);

  const fetchCleanersAndAssignments = async () => {
    try {
      setLoading(true);
      
      // Fetch all active cleaners
      const { data: cleanersData, error: cleanersError } = await supabase
        .from('team_members')
        .select('id, name, email, role, is_active, has_all_properties')
        .eq('role', 'cleaner')
        .eq('is_active', true)
        .order('name');

      if (cleanersError) throw cleanersError;

      // Fetch current assignments for this property
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('team_member_properties')
        .select('team_member_id')
        .eq('property_id', propertyId);

      if (assignmentsError) throw assignmentsError;

      setCleaners(cleanersData || []);
      setAssignedCleanerIds(new Set(assignmentsData?.map(a => a.team_member_id) || []));
    } catch (error) {
      console.error('Error fetching cleaners:', error);
      toast.error('Erro ao carregar responsáveis');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCleaner = async (cleanerId: string, isCurrentlyAssigned: boolean) => {
    setSaving(cleanerId);
    
    try {
      if (isCurrentlyAssigned) {
        // Remove assignment
        const { error } = await supabase
          .from('team_member_properties')
          .delete()
          .eq('team_member_id', cleanerId)
          .eq('property_id', propertyId);

        if (error) throw error;

        setAssignedCleanerIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(cleanerId);
          return newSet;
        });
        toast.success('Responsável removido');
      } else {
        // Add assignment
        const { error } = await supabase
          .from('team_member_properties')
          .insert({
            team_member_id: cleanerId,
            property_id: propertyId,
          });

        if (error) throw error;

        setAssignedCleanerIds(prev => new Set([...prev, cleanerId]));
        toast.success('Responsável atribuído');
      }
    } catch (error: any) {
      console.error('Error toggling cleaner:', error);
      if (error.code === '23505') {
        toast.error('Responsável já atribuído');
      } else {
        toast.error('Erro ao atualizar responsável');
      }
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (cleaners.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mx-auto mb-3">
          <span className="material-symbols-outlined text-muted-foreground text-[24px]">person_off</span>
        </div>
        <p className="text-sm text-muted-foreground">Nenhum profissional de limpeza cadastrado.</p>
        <p className="text-xs text-muted-foreground mt-1">Adicione membros na página de Equipe.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Responsáveis pela Limpeza</p>
        <span className="text-xs text-muted-foreground">
          {assignedCleanerIds.size} de {cleaners.length} atribuídos
        </span>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Selecione os profissionais que podem realizar limpezas nesta propriedade.
      </p>

      <div className="space-y-2 mt-3">
        {cleaners.map((cleaner) => {
          const isAssigned = assignedCleanerIds.has(cleaner.id);
          const hasAllAccess = cleaner.has_all_properties;
          const isSaving = saving === cleaner.id;

          return (
            <div
              key={cleaner.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-xl border transition-colors",
                hasAllAccess 
                  ? "bg-primary/5 border-primary/20" 
                  : isAssigned 
                    ? "bg-muted/50 border-border" 
                    : "bg-card border-border/50 hover:border-border"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                  {cleaner.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{cleaner.name}</p>
                  <p className="text-xs text-muted-foreground">{cleaner.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {hasAllAccess ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    <span className="material-symbols-outlined text-[12px]">check_circle</span>
                    Acesso total
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    {isSaving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                    ) : (
                      <Checkbox
                        checked={isAssigned}
                        onCheckedChange={() => handleToggleCleaner(cleaner.id, isAssigned)}
                        className="h-5 w-5"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground mt-4 flex items-start gap-1">
        <span className="material-symbols-outlined text-[12px] mt-0.5">info</span>
        Profissionais com "Acesso total" podem atender todas as propriedades automaticamente.
      </p>
    </div>
  );
}
