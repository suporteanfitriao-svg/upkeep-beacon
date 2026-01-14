import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeKB?: number;
  addTimestamp?: boolean;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1280,
  maxHeight: 1280,
  quality: 0.75,
  maxSizeKB: 600,
  addTimestamp: true,
};

export function useImageCompression() {
  const [isCompressing, setIsCompressing] = useState(false);

  // Add timestamp overlay to image
  const addTimestampToImage = useCallback((
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ): Date => {
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

  const compressImage = useCallback(async (
    file: File,
    options: CompressionOptions = {}
  ): Promise<Blob> => {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    setIsCompressing(true);

    return new Promise((resolve, reject) => {
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
              setIsCompressing(false);
              reject(new Error('Canvas context not available'));
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            // Add timestamp overlay if enabled
            if (opts.addTimestamp) {
              addTimestampToImage(ctx, canvas);
            }

            // Convert to blob with quality adjustment
            let quality = opts.quality!;
            const maxSizeBytes = opts.maxSizeKB! * 1024;

            const attemptCompression = (q: number) => {
              canvas.toBlob(
                (blob) => {
                  if (!blob) {
                    setIsCompressing(false);
                    reject(new Error('Failed to compress image'));
                    return;
                  }

                  // If still too large and quality can be reduced, try again
                  if (blob.size > maxSizeBytes && q > 0.3) {
                    attemptCompression(q - 0.1);
                    return;
                  }

                  setIsCompressing(false);
                  resolve(blob);
                },
                'image/jpeg',
                q
              );
            };

            attemptCompression(quality);
          } catch (error) {
            setIsCompressing(false);
            reject(error);
          }
        };

        img.onerror = () => {
          setIsCompressing(false);
          reject(new Error('Failed to load image'));
        };

        img.src = e.target?.result as string;
      };

      reader.onerror = () => {
        setIsCompressing(false);
        reject(new Error('Failed to read file'));
      };

      reader.readAsDataURL(file);
    });
  }, [addTimestampToImage]);

  const compressAndUpload = useCallback(async (
    file: File,
    uploadFn: (blob: Blob, fileName: string) => Promise<string>,
    options?: CompressionOptions
  ): Promise<string> => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Formato de imagem não suportado. Use JPG, PNG ou WebP.');
    }

    // Check file size before compression (max 8MB)
    if (file.size > 8 * 1024 * 1024) {
      throw new Error('Arquivo muito grande. Máximo de 8MB.');
    }

    const compressedBlob = await compressImage(file, options);
    const fileName = `${Date.now()}-${file.name.replace(/\.[^/.]+$/, '')}.jpg`;
    
    return uploadFn(compressedBlob, fileName);
  }, [compressImage]);

  return {
    compressImage,
    compressAndUpload,
    addTimestampToImage,
    isCompressing,
  };
}

export type { CompressionOptions };
