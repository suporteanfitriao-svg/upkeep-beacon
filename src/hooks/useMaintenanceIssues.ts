import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MaintenanceIssue {
  id: string;
  schedule_id: string | null;
  property_id: string;
  property_name: string;
  category: string;
  description: string;
  photo_url: string | null;
  severity: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'resolved';
  reported_by: string | null;
  reported_by_name: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  resolved_by: string | null;
  resolved_by_name: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useMaintenanceIssues() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: issues = [], isLoading, refetch } = useQuery({
    queryKey: ['maintenance-issues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_issues')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MaintenanceIssue[];
    },
  });

  const updateIssueMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MaintenanceIssue> }) => {
      const { error } = await supabase
        .from('maintenance_issues')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-issues'] });
      toast({
        title: 'Avaria atualizada',
        description: 'As informações da avaria foram atualizadas com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resolveIssueMutation = useMutation({
    mutationFn: async ({ id, resolution_notes, resolved_by_name }: { id: string; resolution_notes: string; resolved_by_name: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('maintenance_issues')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
          resolved_by_name,
          resolution_notes,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-issues'] });
      toast({
        title: 'Avaria encerrada',
        description: 'A avaria foi marcada como resolvida.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao encerrar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const assignIssueMutation = useMutation({
    mutationFn: async ({ id, assigned_to, assigned_to_name }: { id: string; assigned_to: string; assigned_to_name: string }) => {
      const { error } = await supabase
        .from('maintenance_issues')
        .update({
          assigned_to,
          assigned_to_name,
          status: 'in_progress',
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-issues'] });
      toast({
        title: 'Responsável atribuído',
        description: 'O responsável pela avaria foi atribuído com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atribuir',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const stats = {
    open: issues.filter(i => i.status === 'open').length,
    in_progress: issues.filter(i => i.status === 'in_progress').length,
    resolved: issues.filter(i => i.status === 'resolved').length,
    high_severity: issues.filter(i => i.severity === 'high' && i.status !== 'resolved').length,
  };

  return {
    issues,
    isLoading,
    refetch,
    updateIssue: updateIssueMutation.mutate,
    resolveIssue: resolveIssueMutation.mutate,
    assignIssue: assignIssueMutation.mutate,
    stats,
  };
}
