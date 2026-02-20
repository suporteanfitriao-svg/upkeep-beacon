import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Images, ChevronLeft, ChevronRight, X, Clock, Package, FolderOpen } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface InventoryPhoto {
  url: string;
  taken_at?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  photo_url?: string;
  photo_taken_at?: string;
  photos?: InventoryPhoto[];
  category_id: string;
}

interface InventoryCategory {
  id: string;
  name: string;
  items: InventoryItem[];
}

interface InventoryPhotoGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: InventoryCategory[];
  propertyName?: string;
}

interface FlatPhoto {
  url: string;
  taken_at?: string;
  itemName: string;
  categoryName: string;
}

export function InventoryPhotoGallery({ 
  open, 
  onOpenChange, 
  categories,
  propertyName 
}: InventoryPhotoGalleryProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  // Flatten all photos from all items
  const allPhotos: FlatPhoto[] = categories.flatMap(category => 
    category.items.flatMap(item => {
      const photos: InventoryPhoto[] = Array.isArray(item.photos) && item.photos.length > 0
        ? item.photos
        : item.photo_url 
          ? [{ url: item.photo_url, taken_at: item.photo_taken_at }]
          : [];
      return photos.map(photo => ({
        url: photo.url,
        taken_at: photo.taken_at,
        itemName: item.name,
        categoryName: category.name,
      }));
    })
  );

  const handlePrevious = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1);
    }
  };

  const handleNext = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex < allPhotos.length - 1) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (selectedPhotoIndex !== null) {
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'Escape') setSelectedPhotoIndex(null);
    }
  };

  const selectedPhoto = selectedPhotoIndex !== null ? allPhotos[selectedPhotoIndex] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] p-0 overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Images className="h-5 w-5" />
            Galeria de Fotos
            {propertyName && (
              <Badge variant="outline" className="ml-2 font-normal">
                {propertyName}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {selectedPhotoIndex !== null && selectedPhoto ? (
          <div className="relative flex flex-col h-[80vh]">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background"
              onClick={() => setSelectedPhotoIndex(null)}
            >
              <X className="h-5 w-5" />
            </Button>

            {selectedPhotoIndex > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background h-12 w-12"
                onClick={handlePrevious}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
            )}
            {selectedPhotoIndex < allPhotos.length - 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background h-12 w-12"
                onClick={handleNext}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            )}

            <div className="flex-1 flex items-center justify-center p-4 bg-muted/30">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.itemName}
                className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>

            <div className="p-4 bg-muted/50 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    {selectedPhoto.itemName}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                    <FolderOpen className="h-3 w-3" />
                    {selectedPhoto.categoryName}
                    {selectedPhoto.taken_at && (
                      <>
                        <span className="mx-2">•</span>
                        <Clock className="h-3 w-3" />
                        {format(new Date(selectedPhoto.taken_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                      </>
                    )}
                  </p>
                </div>
                <Badge variant="secondary">
                  {selectedPhotoIndex + 1} / {allPhotos.length}
                </Badge>
              </div>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-[70vh] p-4">
            {allPhotos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Images className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">Nenhuma foto cadastrada</p>
                <p className="text-sm">
                  Adicione fotos aos itens do inventário para visualizá-las aqui.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  {allPhotos.length} foto{allPhotos.length !== 1 ? 's' : ''} encontrada{allPhotos.length !== 1 ? 's' : ''}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {allPhotos.map((photo, index) => (
                    <div
                      key={`${photo.url}-${index}`}
                      className="group relative aspect-square rounded-lg overflow-hidden border cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                      onClick={() => setSelectedPhotoIndex(index)}
                    >
                      <img
                        src={photo.url}
                        alt={photo.itemName}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-0 left-0 right-0 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-sm font-medium truncate">{photo.itemName}</p>
                        <p className="text-xs opacity-80 truncate">{photo.categoryName}</p>
                      </div>
                      {photo.taken_at && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1" 
                          title={format(new Date(photo.taken_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}>
                          <Clock className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}