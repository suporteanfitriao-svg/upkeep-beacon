import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useImageCompression } from '@/hooks/useImageCompression';

interface CategoryPhoto {
  url: string;
  uploadedAt: string;
  uploadedBy?: string;
}

interface CategoryPhotoUploadProps {
  scheduleId: string;
  category: string;
  categoryPhotos: Record<string, CategoryPhoto[]>;
  onPhotoUploaded: (category: string, photo: CategoryPhoto) => void;
  onPhotoDeleted: (category: string, photoUrl: string) => void;
  isEnabled: boolean;
  onClose: () => void;
}

export function CategoryPhotoUpload({
  scheduleId,
  category,
  categoryPhotos,
  onPhotoUploaded,
  onPhotoDeleted,
  isEnabled,
  onClose,
}: CategoryPhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { compressImage, isCompressing } = useImageCompression();

  const photos = categoryPhotos[category] || [];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens são permitidas');
      return;
    }

    setIsUploading(true);
    try {
      // Compress image with timestamp
      const compressedFile = await compressImage(file, { addTimestamp: true });
      
      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedCategory = category.replace(/[^a-zA-Z0-9]/g, '_');
      const originalName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const fileName = `${scheduleId}/${sanitizedCategory}/${timestamp}_${originalName}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('checklist-photos')
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('checklist-photos')
        .getPublicUrl(data.path);

      const newPhoto: CategoryPhoto = {
        url: urlData.publicUrl,
        uploadedAt: new Date().toISOString(),
      };

      onPhotoUploaded(category, newPhoto);
      toast.success('Foto enviada com sucesso!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Erro ao enviar foto');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeletePhoto = async (photoUrl: string) => {
    setDeletingUrl(photoUrl);
    try {
      // Extract path from URL
      const urlParts = photoUrl.split('/checklist-photos/');
      if (urlParts.length > 1) {
        const path = urlParts[1];
        await supabase.storage.from('checklist-photos').remove([path]);
      }
      
      onPhotoDeleted(category, photoUrl);
      toast.success('Foto removida');
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Erro ao remover foto');
    } finally {
      setDeletingUrl(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-lg bg-white dark:bg-[#2d3138] rounded-t-2xl p-5 pb-8 animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">photo_camera</span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Fotos: {category}</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="material-symbols-outlined text-slate-500">close</span>
          </button>
        </div>

        {/* Photos Grid */}
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {photos.map((photo, idx) => (
              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                <img 
                  src={photo.url} 
                  alt={`Foto ${idx + 1} - ${category}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => handleDeletePhoto(photo.url)}
                  disabled={deletingUrl === photo.url}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {deletingUrl === photo.url ? (
                    <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {photos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-500">
            <span className="material-symbols-outlined text-[48px] mb-2">photo_library</span>
            <p className="text-sm font-medium">Nenhuma foto anexada</p>
          </div>
        )}

        {/* Upload Button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
          disabled={!isEnabled}
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={!isEnabled || isUploading || isCompressing}
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold transition-all",
            isEnabled
              ? "bg-primary text-white hover:bg-[#267373] active:scale-[0.98]"
              : "bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500"
          )}
        >
          {isUploading || isCompressing ? (
            <>
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              {isCompressing ? 'Comprimindo...' : 'Enviando...'}
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">add_a_photo</span>
              Adicionar Foto
            </>
          )}
        </button>

        {!isEnabled && (
          <p className="text-xs text-center text-amber-600 dark:text-amber-400 mt-2 font-medium">
            Complete todos os itens da categoria para adicionar fotos
          </p>
        )}
      </div>
    </div>
  );
}