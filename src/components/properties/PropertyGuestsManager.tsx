import { useEffect, useState } from 'react';
import { Users, Save, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PropertyGuestsManagerProps {
  propertyId: string;
  propertyName: string;
  initialMin: number;
  initialDefault: number;
  initialMax: number;
  onSaved?: () => void;
}

/**
 * Inline editor for guest configuration on a property.
 * Lives inside the property card tabs so Owners/Anfitriões can update
 * min/default/max guests without re-opening the full property dialog.
 */
export function PropertyGuestsManager({
  propertyId,
  initialMin,
  initialDefault,
  initialMax,
  onSaved,
}: PropertyGuestsManagerProps) {
  const [min, setMin] = useState<string>(String(initialMin));
  const [def, setDef] = useState<string>(String(initialDefault));
  const [max, setMax] = useState<string>(String(initialMax));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMin(String(initialMin));
    setDef(String(initialDefault));
    setMax(String(initialMax));
  }, [initialMin, initialDefault, initialMax]);

  const minNum = parseInt(min, 10);
  const defNum = parseInt(def, 10);
  const maxNum = parseInt(max, 10);

  const dirty =
    minNum !== initialMin || defNum !== initialDefault || maxNum !== initialMax;

  const validate = (): string | null => {
    if (!Number.isFinite(minNum) || !Number.isFinite(defNum) || !Number.isFinite(maxNum)) {
      return 'Preencha todos os campos';
    }
    if (minNum < 1) return 'Mínimo deve ser pelo menos 1';
    if (defNum <= minNum) return 'Padrão deve ser maior que o mínimo';
    if (maxNum < defNum) return 'Máximo deve ser maior ou igual ao padrão';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('properties')
      .update({ min_guests: minNum, default_guests: defNum, max_guests: maxNum })
      .eq('id', propertyId);
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar hóspedes');
      return;
    }
    toast.success('Hóspedes atualizados');
    onSaved?.();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <Users className="w-4 h-4 mt-0.5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Configuração de Hóspedes</p>
          <p className="text-xs text-muted-foreground">
            Mínimo ≤ Padrão ≤ Máximo. O padrão é usado nas novas limpezas e como base para edição
            inline nos cards.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor={`min-${propertyId}`} className="text-xs">Mínimo</Label>
          <Input
            id={`min-${propertyId}`}
            type="number"
            min={1}
            value={min}
            onChange={(e) => setMin(e.target.value)}
            className="rounded-xl"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`def-${propertyId}`} className="text-xs">Padrão</Label>
          <Input
            id={`def-${propertyId}`}
            type="number"
            min={1}
            value={def}
            onChange={(e) => setDef(e.target.value)}
            className="rounded-xl"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`max-${propertyId}`} className="text-xs">Máximo</Label>
          <Input
            id={`max-${propertyId}`}
            type="number"
            min={1}
            value={max}
            onChange={(e) => setMax(e.target.value)}
            className="rounded-xl"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar
        </button>
      </div>
    </div>
  );
}
