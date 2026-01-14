import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useImageCompression } from './useImageCompression';

interface CreateMaintenanceIssueParams {
  scheduleId: string;
  propertyId: string;
  propertyName: string;
  category: string;
  itemLabel: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  photoFile?: File;
  reportedByName: string;
}

export function useCreateMaintenanceIssue() {
  const { toast } = useToast();
  const { compressAndUpload, isCompressing } = useImageCompression();

  const uploadPhoto = useCallback(async (blob: Blob, fileName: string): Promise<string> => {
    const filePath = `${Date.now()}-${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('maintenance-photos')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
      });

    if (uploadError) {
      throw new Error(`Erro ao fazer upload: ${uploadError.message}`);
    }

    const { data: publicUrl } = supabase.storage
      .from('maintenance-photos')
      .getPublicUrl(filePath);

    return publicUrl.publicUrl;
  }, []);

  const createIssue = useCallback(async (params: CreateMaintenanceIssueParams) => {
    try {
      let photoUrl: string | null = null;

      // Upload photo if provided (with timestamp enabled by default)
      if (params.photoFile) {
        photoUrl = await compressAndUpload(
          params.photoFile,
          uploadPhoto,
          { maxWidth: 1280, maxSizeKB: 600, addTimestamp: true }
        );
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Create maintenance issue
      const { data, error } = await supabase
        .from('maintenance_issues')
        .insert({
          schedule_id: params.scheduleId,
          property_id: params.propertyId,
          property_name: params.propertyName,
          category: params.category,
          item_label: params.itemLabel,
          description: params.description,
          severity: params.severity,
          photo_url: photoUrl,
          reported_by: user?.id,
          reported_by_name: params.reportedByName,
          status: 'open',
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: 'Avaria registrada',
        description: 'A avaria foi registrada com sucesso.',
      });

      return data;
    } catch (error) {
      toast({
        title: 'Erro ao registrar avaria',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      throw error;
    }
  }, [compressAndUpload, uploadPhoto, toast]);

  return {
    createIssue,
    isCompressing,
  };
}
