import { useState } from 'react';
import { X, Download, Clock, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface PhotoWithTimestamp {
  url: string;
  timestamp?: string;
  uploaded_by?: string;
}

interface PhotoGalleryProps {
  photos: (string | PhotoWithTimestamp)[];
  title?: string;
  emptyMessage?: string;
  className?: string;
}

export function PhotoGallery({ 
  photos, 
  title = 'Fotos',
  emptyMessage = 'Nenhuma foto disponível',
  className = '' 
}: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  
  // Normalize photos to PhotoWithTimestamp format
  const normalizedPhotos: PhotoWithTimestamp[] = photos.map(photo => {
    if (typeof photo === 'string') {
      return { url: photo };
    }
    return photo;
  });

  if (normalizedPhotos.length === 0) {
    return (
      <div className={`text-sm text-muted-foreground italic ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  const handleDownload = async (url: string, index: number) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `foto-${index + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  const handlePrevious = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const handleNext = () => {
    if (selectedIndex !== null && selectedIndex < normalizedPhotos.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return null;
    try {
      const date = parseISO(timestamp);
      if (!isValid(date)) return null;
      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return null;
    }
  };

  const selectedPhoto = selectedIndex !== null ? normalizedPhotos[selectedIndex] : null;

  return (
    <div className={className}>
      {title && (
        <p className="text-sm font-medium mb-2">{title}</p>
      )}
      
      {/* Thumbnail Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {normalizedPhotos.map((photo, index) => (
          <div 
            key={index} 
            className="relative aspect-square group cursor-pointer overflow-hidden rounded-lg border bg-muted"
            onClick={() => setSelectedIndex(index)}
          >
            <img 
              src={photo.url} 
              alt={`Foto ${index + 1}`}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {photo.timestamp && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                <div className="flex items-center gap-1 text-[10px] text-white">
                  <Clock className="h-3 w-3" />
                  <span className="truncate">{formatTimestamp(photo.timestamp)}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Expanded View Dialog */}
      <Dialog open={selectedIndex !== null} onOpenChange={() => setSelectedIndex(null)}>
        <DialogContent className="max-w-4xl p-0 gap-0 bg-black/95 border-none">
          {selectedPhoto && (
            <div className="relative">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 text-white hover:bg-white/20 h-10 w-10"
                onClick={() => setSelectedIndex(null)}
              >
                <X className="h-6 w-6" />
              </Button>

              {/* Navigation - Previous */}
              {selectedIndex !== null && selectedIndex > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 h-12 w-12"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
              )}

              {/* Navigation - Next */}
              {selectedIndex !== null && selectedIndex < normalizedPhotos.length - 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 h-12 w-12"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              )}

              {/* Image */}
              <div className="flex items-center justify-center min-h-[400px] max-h-[70vh]">
                <img 
                  src={selectedPhoto.url} 
                  alt={`Foto ${(selectedIndex ?? 0) + 1}`}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              </div>

              {/* Footer with info and download */}
              <div className="p-4 bg-black/80 flex items-center justify-between">
                <div className="text-white text-sm">
                  <span className="font-medium">Foto {(selectedIndex ?? 0) + 1} de {normalizedPhotos.length}</span>
                  {selectedPhoto.timestamp && (
                    <span className="text-white/70 ml-2 flex items-center gap-1 inline-flex">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTimestamp(selectedPhoto.timestamp)}
                    </span>
                  )}
                  {selectedPhoto.uploaded_by && (
                    <span className="text-white/70 ml-2">• {selectedPhoto.uploaded_by}</span>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDownload(selectedPhoto.url, selectedIndex ?? 0)}
                  className="h-9"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
