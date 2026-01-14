import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollText, ArrowLeft, ArrowRight, Plus, Trash2, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HouseRulesStepProps {
  onNext: () => void;
  onBack: () => void;
}

interface HouseRule {
  id: string;
  title: string;
  description: string;
  priority: 'info' | 'warning';
  isNew?: boolean;
}

const defaultRules: HouseRule[] = [
  { id: '1', title: 'Horário de Silêncio', description: 'Manter silêncio entre 22h e 8h', priority: 'info', isNew: true },
  { id: '2', title: 'Proibido Fumar', description: 'Não é permitido fumar em áreas internas', priority: 'warning', isNew: true },
  { id: '3', title: 'Animais de Estimação', description: 'Não é permitido animais de estimação', priority: 'info', isNew: true },
  { id: '4', title: 'Check-out', description: 'Deixar chaves na mesa de centro ao sair', priority: 'info', isNew: true },
];

export function HouseRulesStep({ onNext, onBack }: HouseRulesStepProps) {
  const [rules, setRules] = useState<HouseRule[]>([]);
  const [newRule, setNewRule] = useState<{ title: string; description: string; priority: 'info' | 'warning' }>({ title: '', description: '', priority: 'info' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRules(defaultRules);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('house_rules')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;

      if (data && data.length > 0) {
        const mappedRules: HouseRule[] = data.map(r => ({
          id: r.id,
          title: r.title,
          description: r.description || '',
          priority: r.priority as 'info' | 'warning',
        }));
        setRules(mappedRules);
      } else {
        // Use default rules for new users
        setRules(defaultRules);
      }
    } catch (error) {
      console.error('Error fetching rules:', error);
      setRules(defaultRules);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = () => {
    if (!newRule.title.trim()) return;
    
    setRules(prev => [
      ...prev,
      { ...newRule, id: `temp-${Date.now()}`, isNew: true }
    ]);
    setNewRule({ title: '', description: '', priority: 'info' });
  };

  const handleRemoveRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const handleSaveAndNext = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      // Deactivate existing rules
      await supabase
        .from('house_rules')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // Insert all current rules
      for (let idx = 0; idx < rules.length; idx++) {
        const rule = rules[idx];
        const { error } = await supabase
          .from('house_rules')
          .insert({
            user_id: user.id,
            title: rule.title,
            description: rule.description,
            priority: rule.priority,
            sort_order: idx,
          });

        if (error) throw error;
      }

      toast.success('Regras salvas com sucesso!');
      onNext();
    } catch (error) {
      console.error('Error saving rules:', error);
      toast.error('Erro ao salvar regras');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl w-full flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl w-full">
      <div className="text-center mb-8">
        <div className="mb-6 flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <ScrollText className="h-7 w-7" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Regras da Casa</h2>
        <p className="text-muted-foreground">
          Defina as regras padrão que serão exibidas para hóspedes e equipe.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Adicionar Regra
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Título da Regra</Label>
            <Input
              placeholder="Ex: Horário de Silêncio"
              value={newRule.title}
              onChange={(e) => setNewRule(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              placeholder="Descreva a regra em detalhes..."
              value={newRule.description}
              onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="priority"
                checked={newRule.priority === 'info'}
                onChange={() => setNewRule(prev => ({ ...prev, priority: 'info' }))}
                className="text-primary"
              />
              <Info className="h-4 w-4 text-blue-500" />
              <span className="text-sm">Informativa</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="priority"
                checked={newRule.priority === 'warning'}
                onChange={() => setNewRule(prev => ({ ...prev, priority: 'warning' }))}
                className="text-primary"
              />
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm">Importante</span>
            </label>
          </div>
          <Button onClick={handleAddRule} disabled={!newRule.title.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Regra
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Regras Cadastradas</CardTitle>
          <CardDescription>{rules.length} regra{rules.length !== 1 ? 's' : ''}</CardDescription>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma regra cadastrada ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border"
                >
                  <div className="mt-0.5">
                    {rule.priority === 'warning' ? (
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                    ) : (
                      <Info className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{rule.title}</p>
                    {rule.description && (
                      <p className="text-xs text-muted-foreground mt-1">{rule.description}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => handleRemoveRule(rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={handleSaveAndNext} disabled={saving || rules.length === 0}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              Próximo
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
      {rules.length === 0 && (
        <p className="text-xs text-destructive text-center mt-2">
          Adicione pelo menos uma regra da casa para continuar.
        </p>
      )}
    </div>
  );
}