import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { GripVertical, Edit2, Trash2, Clock, History } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SortableItemProps {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  details?: string;
  photoUrl?: string;
  photoTakenAt?: string;
  onEdit: () => void;
  onDelete: () => void;
  onPhotoClick: () => void;
  onHistoryClick: () => void;
}

export const SortableItem = ({
  id,
  name,
  quantity,
  unit,
  details,
  photoUrl,
  photoTakenAt,
  onEdit,
  onDelete,
  onPhotoClick,
  onHistoryClick,
}: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={isDragging ? 'bg-muted shadow-lg' : ''}
    >
      <TableCell className="w-8">
        <button
          {...attributes}
          {...listeners}
          className="touch-none p-1 hover:bg-muted rounded cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          {photoUrl ? (
            <div 
              className="relative cursor-pointer group"
              onClick={onPhotoClick}
            >
              <img
                src={photoUrl}
                alt={name}
                className="h-10 w-10 rounded object-cover border group-hover:opacity-80 transition-opacity"
              />
              {photoTakenAt && (
                <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-0.5">
                  <Clock className="h-2.5 w-2.5 text-primary-foreground" />
                </div>
              )}
            </div>
          ) : (
            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
              --
            </div>
          )}
          <div>
            <p className="font-medium">{name}</p>
            {details && (
              <p className="text-xs text-muted-foreground line-clamp-1">{details}</p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-center">
        {quantity} {unit || 'un'}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onHistoryClick}>
            <History className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:bg-destructive/10"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

// Mobile version
export const SortableItemMobile = ({
  id,
  name,
  quantity,
  unit,
  details,
  photoUrl,
  photoTakenAt,
  onEdit,
  onDelete,
  onPhotoClick,
  onHistoryClick,
}: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 border rounded-lg bg-card ${isDragging ? 'shadow-lg' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="touch-none p-1 hover:bg-muted rounded cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>
      
      {photoUrl ? (
        <div 
          className="relative cursor-pointer flex-shrink-0"
          onClick={onPhotoClick}
        >
          <img
            src={photoUrl}
            alt={name}
            className="h-12 w-12 rounded object-cover border"
          />
          {photoTakenAt && (
            <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-0.5">
              <Clock className="h-2.5 w-2.5 text-primary-foreground" />
            </div>
          )}
        </div>
      ) : null}

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{name}</p>
        <p className="text-sm text-muted-foreground">
          {quantity} {unit || 'un'}
        </p>
        {details && (
          <p className="text-xs text-muted-foreground truncate">{details}</p>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
