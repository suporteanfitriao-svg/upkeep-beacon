import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeKB?: number;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1280,
  maxHeight: 1280,
  quality: 0.75,
  maxSizeKB: 500,
};

export function useInventoryPhotoUpload() {
  const [isUploading, setIsUploading] = useState(false);

  // Add timestamp overlay to image
  const addTimestampToImage = useCallback((
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ) => {
    const now = new Date();
    const timestamp = format(now, "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
    
    const fontSize = Math.max(14, Math.floor(canvas.width / 40));
    const padding = Math.floor(fontSize * 0.8);
    
    ctx.font = `bold ${fontSize}px 'Segoe UI', Arial, sans-serif`;
    const textWidth = ctx.measureText(timestamp).width;
    
    // Position at bottom-right corner
    const x = canvas.width - textWidth - padding * 2;
    const y = canvas.height - padding * 2;
    
    // Draw semi-transparent background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    const bgHeight = fontSize + padding;
    const bgWidth = textWidth + padding * 2;
    const borderRadius = 4;
    
    ctx.beginPath();
    ctx.roundRect(x - padding, y - fontSize, bgWidth, bgHeight, borderRadius);
    ctx.fill();
    
    // Draw timestamp text
    ctx.fillStyle = '#ffffff';
    ctx.fillText(timestamp, x, y - padding / 2);
    
    return now;
  }, []);

  const compressAndUploadWithTimestamp = useCallback(async (
    file: File,
    itemId: string,
    options: CompressionOptions = {}
  ): Promise<{ url: string; takenAt: Date }> => {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    setIsUploading(true);

    try {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        throw new Error('Formato de imagem não suportado. Use JPG, PNG ou WebP.');
      }

      // Check file size before compression (max 8MB)
      if (file.size > 8 * 1024 * 1024) {
        throw new Error('Arquivo muito grande. Máximo de 8MB.');
      }

      // Read and process image
      const imageBlob = await new Promise<{ blob: Blob; takenAt: Date }>((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          const img = new Image();
          
          img.onload = () => {
            try {
              // Calculate new dimensions maintaining aspect ratio
              let { width, height } = img;
              const maxWidth = opts.maxWidth!;
              const maxHeight = opts.maxHeight!;

              if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
              }

              // Create canvas and draw image
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
              }

              ctx.drawImage(img, 0, 0, width, height);
              
              // Add timestamp overlay
              const takenAt = addTimestampToImage(ctx, canvas);

              // Convert to blob with quality adjustment
              let quality = opts.quality!;
              const maxSizeBytes = opts.maxSizeKB! * 1024;

              const attemptCompression = (q: number) => {
                canvas.toBlob(
                  (blob) => {
                    if (!blob) {
                      reject(new Error('Failed to compress image'));
                      return;
                    }

                    // If still too large and quality can be reduced, try again
                    if (blob.size > maxSizeBytes && q > 0.3) {
                      attemptCompression(q - 0.1);
                      return;
                    }

                    resolve({ blob, takenAt });
                  },
                  'image/jpeg',
                  q
                );
              };

              attemptCompression(quality);
            } catch (error) {
              reject(error);
            }
          };

          img.onerror = () => {
            reject(new Error('Failed to load image'));
          };

          img.src = e.target?.result as string;
        };

        reader.onerror = () => {
          reject(new Error('Failed to read file'));
        };

        reader.readAsDataURL(file);
      });

      // Upload to Supabase Storage
      const fileName = `${itemId}/${Date.now()}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from('inventory-photos')
        .upload(fileName, imageBlob.blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('inventory-photos')
        .getPublicUrl(fileName);

      return { url: publicUrl, takenAt: imageBlob.takenAt };
    } finally {
      setIsUploading(false);
    }
  }, [addTimestampToImage]);

  const deletePhoto = useCallback(async (photoUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = photoUrl.split('/inventory-photos/');
      if (urlParts.length < 2) return;
      
      const filePath = urlParts[1];
      
      const { error } = await supabase.storage
        .from('inventory-photos')
        .remove([filePath]);
        
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting photo:', error);
    }
  }, []);

  return {
    compressAndUploadWithTimestamp,
    deletePhoto,
    isUploading,
  };
}
