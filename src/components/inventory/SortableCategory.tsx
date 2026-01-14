import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { GripVertical, Edit2, Trash2, ChevronRight } from 'lucide-react';

interface SortableCategoryProps {
  id: string;
  name: string;
  propertyName: string;
  itemCount: number;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const SortableCategory = ({
  id,
  name,
  propertyName,
  itemCount,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: SortableCategoryProps) => {
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
      className={`flex items-center justify-between p-4 cursor-pointer active:bg-muted/70 transition-colors touch-manipulation ${
        isSelected ? 'bg-primary/5 border-l-4 border-primary' : ''
      } ${isDragging ? 'bg-muted shadow-lg z-10 ring-2 ring-primary' : ''}`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Drag handle - larger touch target */}
        <button
          {...attributes}
          {...listeners}
          className="touch-none p-2 -m-1 hover:bg-muted rounded-lg cursor-grab active:cursor-grabbing active:bg-muted/80"
          onClick={(e) => e.stopPropagation()}
          aria-label="Arrastar para reordenar"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-base truncate">{name}</p>
          <p className="text-sm text-muted-foreground truncate">
            {propertyName} • {itemCount} itens
          </p>
        </div>
      </div>
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg active:bg-muted"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          aria-label="Editar categoria"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg text-destructive active:bg-destructive/10"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Excluir categoria"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <ChevronRight className="h-5 w-5 text-muted-foreground ml-1" />
      </div>
    </div>
  );
};
