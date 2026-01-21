import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

export interface ProgressNote {
  note: string;
  created_at: string;
  created_by_name: string;
}

export interface IssuePhoto {
  url: string;
  timestamp: string;
  uploaded_by?: string;
}

export interface MaintenanceIssue {
  id: string;
  schedule_id: string | null;
  property_id: string;
  property_name: string;
  category: string;
  description: string;
  photo_url: string | null;
  photos: IssuePhoto[];
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
  progress_notes: ProgressNote[];
  started_at: string | null;
  created_at: string;
  updated_at: string;
}

const parseProgressNotes = (notes: Json | null): ProgressNote[] => {
  if (!notes || !Array.isArray(notes)) return [];
  return notes.map(note => {
    if (typeof note === 'object' && note !== null && !Array.isArray(note)) {
      return {
        note: String((note as Record<string, unknown>).note || ''),
        created_at: String((note as Record<string, unknown>).created_at || ''),
        created_by_name: String((note as Record<string, unknown>).created_by_name || ''),
      };
    }
    return { note: '', created_at: '', created_by_name: '' };
  });
};

const parsePhotos = (photos: Json | null): IssuePhoto[] => {
  if (!photos || !Array.isArray(photos)) return [];
  return photos
    .filter(photo => typeof photo === 'object' && photo !== null && !Array.isArray(photo))
    .map(photo => ({
      url: String((photo as Record<string, unknown>).url || ''),
      timestamp: String((photo as Record<string, unknown>).timestamp || ''),
      uploaded_by: (photo as Record<string, unknown>).uploaded_by ? String((photo as Record<string, unknown>).uploaded_by) : undefined,
    }))
    .filter(p => p.url); // Only keep photos with valid URLs
};

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
      return (data || []).map(item => ({
        ...item,
        progress_notes: parseProgressNotes(item.progress_notes),
        photos: parsePhotos(item.photos),
      })) as MaintenanceIssue[];
    },
  });

  const updateIssueMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
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
          started_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-issues'] });
      toast({
        title: 'Responsável atribuído',
        description: 'O responsável pela avaria foi atribuído e o status alterado para "Em Andamento".',
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

  const addProgressNoteMutation = useMutation({
    mutationFn: async ({ id, note, created_by_name, currentNotes }: { id: string; note: string; created_by_name: string; currentNotes: ProgressNote[] }) => {
      const newNote = {
        note,
        created_at: new Date().toISOString(),
        created_by_name,
      };
      
      const updatedNotes = [...currentNotes.map(n => ({ ...n })), newNote];
      
      const { error } = await supabase
        .from('maintenance_issues')
        .update({
          progress_notes: updatedNotes as unknown as Json,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-issues'] });
      toast({
        title: 'Observação adicionada',
        description: 'A observação foi registrada com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao adicionar observação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const startIssueMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from('maintenance_issues')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-issues'] });
      toast({
        title: 'Avaria iniciada',
        description: 'O status foi alterado para "Em Andamento".',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao iniciar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const addPhotoMutation = useMutation({
    mutationFn: async ({ id, photo, currentPhotos }: { id: string; photo: IssuePhoto; currentPhotos: IssuePhoto[] }) => {
      const updatedPhotos = [...currentPhotos, photo];
      
      const { error } = await supabase
        .from('maintenance_issues')
        .update({
          photos: updatedPhotos as unknown as Json,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-issues'] });
      toast({
        title: 'Foto adicionada',
        description: 'A foto foi adicionada à avaria.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao adicionar foto',
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
    addProgressNote: addProgressNoteMutation.mutate,
    startIssue: startIssueMutation.mutate,
    addPhoto: addPhotoMutation.mutate,
    stats,
  };
}
