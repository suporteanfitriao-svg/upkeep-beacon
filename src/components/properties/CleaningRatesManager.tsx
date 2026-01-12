import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Loader2, DollarSign, User } from 'lucide-react';
import { useCleaningRates, CleaningRate } from '@/hooks/useCleaningRates';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: string;
  name: string;
  role: string;
}

interface CleaningRatesManagerProps {
  propertyId: string;
}

export function CleaningRatesManager({ propertyId }: CleaningRatesManagerProps) {
  const { rates, loading, createRate, updateRate, deleteRate } = useCleaningRates(propertyId);
  const [cleaners, setCleaners] = useState<TeamMember[]>([]);
  const [loadingCleaners, setLoadingCleaners] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingRate, setEditingRate] = useState<CleaningRate | null>(null);
  const [formData, setFormData] = useState({
    team_member_id: '',
    rate_value: '',
    is_required: false
  });
  const [saving, setSaving] = useState(false);

  // Fetch cleaners for the dropdown
  useEffect(() => {
    const fetchCleaners = async () => {
      setLoadingCleaners(true);
      const { data, error } = await supabase
        .from('team_members')
        .select('id, name, role')
        .eq('role', 'cleaner')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching cleaners:', error);
      } else {
        setCleaners(data || []);
      }
      setLoadingCleaners(false);
    };

    fetchCleaners();
  }, []);

  // Get cleaners not yet assigned to this property
  const availableCleaners = cleaners.filter(
    c => !rates.some(r => r.team_member_id === c.id)
  );

  const resetForm = () => {
    setFormData({ team_member_id: '', rate_value: '', is_required: false });
    setIsAdding(false);
    setEditingRate(null);
  };

  const handleSubmit = async () => {
    const rateValue = parseFloat(formData.rate_value);
    if (isNaN(rateValue) || rateValue < 0) {
      return;
    }

    setSaving(true);

    if (editingRate) {
      await updateRate(
        editingRate.id,
        { rate_value: editingRate.rate_value, is_required: editingRate.is_required },
        { rate_value: rateValue, is_required: formData.is_required }
      );
    } else {
      if (!formData.team_member_id) {
        setSaving(false);
        return;
      }
      await createRate({
        property_id: propertyId,
        team_member_id: formData.team_member_id,
        rate_value: rateValue,
        is_required: formData.is_required
      });
    }

    resetForm();
    setSaving(false);
  };

  const handleEdit = (rate: CleaningRate) => {
    setEditingRate(rate);
    setFormData({
      team_member_id: rate.team_member_id,
      rate_value: rate.rate_value.toFixed(2),
      is_required: rate.is_required
    });
    setIsAdding(true);
  };

  const handleDelete = async (rateId: string) => {
    await deleteRate(rateId);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading || loadingCleaners) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Taxas por Pessoa de Limpeza</h3>
          <p className="text-sm text-muted-foreground">
            Configure o valor de pagamento por limpeza para cada profissional
          </p>
        </div>
        {!isAdding && availableCleaners.length > 0 && (
          <Button onClick={() => setIsAdding(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Taxa
          </Button>
        )}
      </div>

      {/* Form for adding/editing */}
      {isAdding && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
          <h4 className="font-medium">
            {editingRate ? 'Editar Taxa' : 'Nova Taxa'}
          </h4>
          
          {!editingRate && (
            <div className="space-y-2">
              <Label>Profissional de Limpeza</Label>
              <Select
                value={formData.team_member_id}
                onValueChange={(v) => setFormData(prev => ({ ...prev, team_member_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um profissional" />
                </SelectTrigger>
                <SelectContent>
                  {availableCleaners.map(cleaner => (
                    <SelectItem key={cleaner.id} value={cleaner.id}>
                      {cleaner.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Valor por Limpeza (R$)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.rate_value}
                onChange={(e) => setFormData(prev => ({ ...prev, rate_value: e.target.value }))}
                placeholder="120.00"
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label>Obrigatório</Label>
              <p className="text-xs text-muted-foreground">
                Taxa visível na Home do profissional e usada em cálculos
              </p>
            </div>
            <Switch
              checked={formData.is_required}
              onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_required: v }))}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={resetForm}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !formData.rate_value || (!editingRate && !formData.team_member_id)}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingRate ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </div>
      )}

      {/* Rates list */}
      {rates.length === 0 && !isAdding ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <DollarSign className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Nenhuma taxa configurada</p>
          <p className="text-sm text-muted-foreground/70">
            Adicione taxas para os profissionais de limpeza
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rates.map(rate => (
            <div
              key={rate.id}
              className={cn(
                "flex items-center justify-between rounded-lg border p-4 transition-colors",
                rate.is_required 
                  ? "bg-primary/5 border-primary/20" 
                  : "bg-muted/30"
              )}
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{rate.team_member?.name || 'Profissional'}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-primary">
                      {formatCurrency(rate.rate_value)}
                    </span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      rate.is_required 
                        ? "bg-primary/20 text-primary font-medium"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {rate.is_required ? 'Obrigatório' : 'Opcional'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(rate)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir Taxa</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir a taxa de {rate.team_member?.name}?
                        Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(rate.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      {availableCleaners.length === 0 && cleaners.length > 0 && !isAdding && (
        <p className="text-sm text-muted-foreground text-center">
          Todos os profissionais de limpeza já possuem taxa configurada
        </p>
      )}
    </div>
  );
}
