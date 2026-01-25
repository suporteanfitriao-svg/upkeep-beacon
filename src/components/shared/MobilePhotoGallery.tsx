import { useState } from 'react';
import { X, Download, Clock, ChevronLeft, ChevronRight, ZoomIn, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface PhotoWithTimestamp {
  url: string;
  timestamp?: string;
  uploaded_by?: string;
}

interface MobilePhotoGalleryProps {
  photos: PhotoWithTimestamp[];
  onRemove?: (index: number) => void;
  editable?: boolean;
  className?: string;
}

export function MobilePhotoGallery({ 
  photos, 
  onRemove,
  editable = false,
  className = '' 
}: MobilePhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (photos.length === 0) {
    return null;
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
    if (selectedIndex !== null && selectedIndex < photos.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'left') handleNext();
    else handlePrevious();
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return null;
    try {
      const date = parseISO(timestamp);
      if (!isValid(date)) return null;
      return format(date, "dd/MM HH:mm", { locale: ptBR });
    } catch {
      return null;
    }
  };

  const selectedPhoto = selectedIndex !== null ? photos[selectedIndex] : null;

  return (
    <>
      {/* Thumbnail Grid */}
      <div className={cn("flex flex-wrap gap-2", className)}>
        {photos.map((photo, index) => (
          <div 
            key={index} 
            className="relative w-20 h-20 flex-shrink-0 group"
          >
            <button
              type="button"
              onClick={() => setSelectedIndex(index)}
              className="w-20 h-20 rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <img 
                src={photo.url} 
                alt={`Foto ${index + 1}`}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              {/* Zoom overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center rounded-lg">
                <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
            
            {/* Timestamp badge */}
            {photo.timestamp && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1 rounded-b-lg pointer-events-none">
                <div className="flex items-center gap-0.5 text-[8px] text-white">
                  <Clock className="h-2 w-2 flex-shrink-0" />
                  <span className="truncate">{formatTimestamp(photo.timestamp)}</span>
                </div>
              </div>
            )}
            
            {/* Remove button (editable mode) */}
            {editable && onRemove && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(index);
                }}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md z-10"
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Fullscreen Gallery Modal */}
      {selectedIndex !== null && selectedPhoto && (
        <div 
          className="fixed inset-0 z-[300] bg-black flex flex-col animate-fade-in"
          onClick={() => setSelectedIndex(null)}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-black/80">
            <span className="text-white text-sm font-medium">
              {selectedIndex + 1} / {photos.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-10 w-10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(selectedPhoto.url, selectedIndex);
                }}
              >
                <Download className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-10 w-10"
                onClick={() => setSelectedIndex(null)}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* Image Container with swipe support */}
          <div 
            className="flex-1 flex items-center justify-center relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
              const touch = e.touches[0];
              (e.currentTarget as any)._touchStartX = touch.clientX;
            }}
            onTouchEnd={(e) => {
              const startX = (e.currentTarget as any)._touchStartX;
              const endX = e.changedTouches[0].clientX;
              const diff = startX - endX;
              
              if (Math.abs(diff) > 50) {
                handleSwipe(diff > 0 ? 'left' : 'right');
              }
            }}
          >
            {/* Previous button */}
            {selectedIndex > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 h-12 w-12 rounded-full bg-black/30"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevious();
                }}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
            )}

            {/* Image */}
            <img 
              src={selectedPhoto.url} 
              alt={`Foto ${selectedIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />

            {/* Next button */}
            {selectedIndex < photos.length - 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20 h-12 w-12 rounded-full bg-black/30"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            )}
          </div>

          {/* Footer with metadata */}
          <div className="p-4 bg-black/80">
            <div className="flex items-center justify-between text-white text-sm">
              <div className="flex items-center gap-3">
                {selectedPhoto.timestamp && (
                  <span className="flex items-center gap-1 text-white/80">
                    <Clock className="h-4 w-4" />
                    {format(parseISO(selectedPhoto.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                )}
              </div>
              {selectedPhoto.uploaded_by && (
                <span className="text-white/60 text-xs">
                  por {selectedPhoto.uploaded_by}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
