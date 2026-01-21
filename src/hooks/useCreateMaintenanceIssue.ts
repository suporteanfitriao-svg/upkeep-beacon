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
  photoFiles?: File[];
  reportedByName: string;
}

interface IssuePhoto {
  url: string;
  timestamp: string;
  uploaded_by?: string;
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
      const photos: IssuePhoto[] = [];
      let legacyPhotoUrl: string | null = null;

      // Upload photos if provided (with timestamp enabled by default)
      if (params.photoFiles && params.photoFiles.length > 0) {
        for (const file of params.photoFiles) {
          const photoUrl = await compressAndUpload(
            file,
            uploadPhoto,
            { maxWidth: 1280, maxSizeKB: 600, addTimestamp: true }
          );
          
          if (photoUrl) {
            photos.push({
              url: photoUrl,
              timestamp: new Date().toISOString(),
              uploaded_by: params.reportedByName,
            });
            
            // Keep first photo in legacy field for backwards compatibility
            if (!legacyPhotoUrl) {
              legacyPhotoUrl = photoUrl;
            }
          }
        }
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
          photo_url: legacyPhotoUrl,
          photos: photos as unknown as null, // Cast for type compatibility
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
