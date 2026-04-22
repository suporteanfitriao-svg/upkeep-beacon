import { useState } from 'react';
import { Users, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InlineGuestEditorProps {
  scheduleId: string;
  currentGuests: number;
  minGuests: number;
  maxGuests: number;
  canEdit: boolean;
  onSaved?: (newValue: number) => void;
}

/**
 * Inline editor for the number of guests on a schedule card.
 * Visible to Owner (admin/superadmin) and Anfitrião (manager).
 * Cleaners see a read-only badge.
 * Persists to schedules.number_of_guests, clamped to property's min/max.
 */
export function InlineGuestEditor({
  scheduleId,
  currentGuests,
  minGuests,
  maxGuests,
  canEdit,
  onSaved,
}: InlineGuestEditorProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<number>(currentGuests);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const clamped = Math.max(minGuests, Math.min(maxGuests, Math.floor(value) || minGuests));
    if (clamped !== value) {
      setValue(clamped);
    }
    if (clamped === currentGuests) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('schedules')
      .update({ number_of_guests: clamped })
      .eq('id', scheduleId);
    setSaving(false);
    if (error) {
      toast.error('Erro ao atualizar hóspedes');
      return;
    }
    toast.success(`Hóspedes atualizados para ${clamped}`);
    onSaved?.(clamped);
    setEditing(false);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setValue(currentGuests);
    setEditing(false);
  };

  if (!canEdit) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Users className="w-3 h-3" />
        {currentGuests}
      </span>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        className={cn(
          'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md',
          'border border-dashed border-border text-muted-foreground',
          'hover:border-primary hover:text-primary transition-colors'
        )}
        title={`Editar hóspedes (${minGuests}–${maxGuests})`}
      >
        <Users className="w-3 h-3" />
        {currentGuests}
        <span className="text-[9px] opacity-60 ml-0.5">edit</span>
      </button>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      <Users className="w-3 h-3 text-primary" />
      <input
        type="number"
        min={minGuests}
        max={maxGuests}
        value={value}
        autoFocus
        onChange={(e) => setValue(parseInt(e.target.value, 10) || minGuests)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') handleCancel(e as unknown as React.MouseEvent);
        }}
        className="w-12 h-6 px-1 text-xs border border-border rounded bg-background"
      />
      <span className="text-[9px] text-muted-foreground">
        {minGuests}–{maxGuests}
      </span>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="p-0.5 rounded text-status-completed hover:bg-status-completed/10"
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
      </button>
      <button
        type="button"
        onClick={handleCancel}
        disabled={saving}
        className="p-0.5 rounded text-muted-foreground hover:bg-muted"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
