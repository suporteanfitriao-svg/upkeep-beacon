import { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Settings as SettingsIcon, 
  Clock, 
  Camera, 
  Bell, 
  Package, 
  ScrollText, 
  ClipboardList,
  Plus,
  Trash2,
  AlertTriangle,
  Info,
  Loader2,
  Save,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OnboardingConfig {
  default_check_in_time: string;
  default_check_out_time: string;
  require_photo_for_issues: boolean;
  require_photo_per_category: boolean;
  enable_notifications: boolean;
  auto_release_schedules: boolean;
}

interface HouseRule {
  id: string;
  title: string;
  description: string;
  priority: 'info' | 'warning';
}

interface InventoryCategory {
  id: string;
  name: string;
  items: { id: string; name: string }[];
}

interface ChecklistCategory {
  id: string;
  name: string;
  items: string[];
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // General config
  const [config, setConfig] = useState<OnboardingConfig>({
    default_check_in_time: '15:00',
    default_check_out_time: '11:00',
    require_photo_for_issues: true,
    require_photo_per_category: false,
    enable_notifications: true,
    auto_release_schedules: true,
  });

  // House rules
  const [rules, setRules] = useState<HouseRule[]>([]);
  const [newRule, setNewRule] = useState<{ title: string; description: string; priority: 'info' | 'warning' }>({ 
    title: '', description: '', priority: 'info' 
  });

  // Inventory
  const [inventory, setInventory] = useState<InventoryCategory[]>([]);
  const [newItemInputs, setNewItemInputs] = useState<{ [categoryId: string]: string }>({});

  // Checklists
  const [checklists, setChecklists] = useState<ChecklistCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all data in parallel
      const [configRes, rulesRes, inventoryRes, inventoryItemsRes, checklistsRes] = await Promise.all([
        supabase.from('onboarding_settings').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('house_rules').select('*').eq('user_id', user.id).eq('is_active', true).order('sort_order'),
        supabase.from('inventory_categories').select('*').eq('user_id', user.id).eq('is_active', true).order('sort_order'),
        supabase.from('inventory_items').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('default_checklists').select('*').eq('user_id', user.id).eq('is_active', true).order('created_at'),
      ]);

      // Config
      if (configRes.data) {
        setConfig({
          default_check_in_time: configRes.data.default_check_in_time?.slice(0, 5) || '15:00',
          default_check_out_time: configRes.data.default_check_out_time?.slice(0, 5) || '11:00',
          require_photo_for_issues: configRes.data.require_photo_for_issues,
          require_photo_per_category: configRes.data.require_photo_per_category,
          enable_notifications: configRes.data.enable_notifications,
          auto_release_schedules: configRes.data.auto_release_schedules,
        });
      }

      // Rules
      if (rulesRes.data) {
        setRules(rulesRes.data.map(r => ({
          id: r.id,
          title: r.title,
          description: r.description || '',
          priority: r.priority as 'info' | 'warning',
        })));
      }

      // Inventory
      if (inventoryRes.data && inventoryItemsRes.data) {
        const mappedInventory: InventoryCategory[] = inventoryRes.data.map(cat => ({
          id: cat.id,
          name: cat.name,
          items: inventoryItemsRes.data
            .filter(item => item.category_id === cat.id)
            .map(item => ({ id: item.id, name: item.name })),
        }));
        setInventory(mappedInventory);
      }

      // Checklists
      if (checklistsRes.data) {
        const mappedChecklists: ChecklistCategory[] = checklistsRes.data.map(d => ({
          id: d.id,
          name: d.name,
          items: (d.items as { title: string }[])?.map(i => i.title) || [],
        }));
        setChecklists(mappedChecklists);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase.from('onboarding_settings').upsert({
        user_id: user.id,
        ...config,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      if (error) throw error;
      toast.success('Configurações gerais salvas!');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRule = () => {
    if (!newRule.title.trim()) return;
    setRules(prev => [...prev, { ...newRule, id: `temp-${Date.now()}` }]);
    setNewRule({ title: '', description: '', priority: 'info' });
  };

  const handleRemoveRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const handleSaveRules = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Deactivate existing
      await supabase.from('house_rules').update({ is_active: false }).eq('user_id', user.id);

      // Insert new
      for (let idx = 0; idx < rules.length; idx++) {
        const rule = rules[idx];
        await supabase.from('house_rules').insert({
          user_id: user.id,
          title: rule.title,
          description: rule.description,
          priority: rule.priority,
          sort_order: idx,
        });
      }

      toast.success('Regras da casa salvas!');
      await fetchAllData();
    } catch (error) {
      console.error('Error saving rules:', error);
      toast.error('Erro ao salvar regras');
    } finally {
      setSaving(false);
    }
  };

  const handleAddInventoryItem = (categoryId: string) => {
    const itemName = newItemInputs[categoryId]?.trim();
    if (!itemName) return;

    setInventory(prev => prev.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          items: [...cat.items, { id: `temp-${Date.now()}`, name: itemName }],
        };
      }
      return cat;
    }));
    setNewItemInputs(prev => ({ ...prev, [categoryId]: '' }));
  };

  const handleRemoveInventoryItem = (categoryId: string, itemId: string) => {
    setInventory(prev => prev.map(cat => {
      if (cat.id === categoryId) {
        return { ...cat, items: cat.items.filter(i => i.id !== itemId) };
      }
      return cat;
    }));
  };

  const handleSaveInventory = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // For each category, sync items
      for (const cat of inventory) {
        // Delete existing items for this category
        await supabase.from('inventory_items').update({ is_active: false }).eq('category_id', cat.id);

        // Insert current items
        for (let idx = 0; idx < cat.items.length; idx++) {
          const item = cat.items[idx];
          if (item.id.startsWith('temp-')) {
            await supabase.from('inventory_items').insert({
              category_id: cat.id,
              name: item.name,
              sort_order: idx,
            });
          } else {
            await supabase.from('inventory_items').update({
              is_active: true,
              sort_order: idx,
            }).eq('id', item.id);
          }
        }
      }

      toast.success('Inventário salvo!');
      await fetchAllData();
    } catch (error) {
      console.error('Error saving inventory:', error);
      toast.error('Erro ao salvar inventário');
    } finally {
      setSaving(false);
    }
  };

  const handleAddChecklistCategory = () => {
    if (!newCategoryName.trim()) return;
    setChecklists(prev => [...prev, { id: `temp-${Date.now()}`, name: newCategoryName, items: [] }]);
    setNewCategoryName('');
  };

  const handleRemoveChecklistCategory = (id: string) => {
    setChecklists(prev => prev.filter(c => c.id !== id));
  };

  const handleAddChecklistItem = (categoryId: string, item: string) => {
    if (!item.trim()) return;
    setChecklists(prev => prev.map(c => 
      c.id === categoryId ? { ...c, items: [...c.items, item] } : c
    ));
  };

  const handleRemoveChecklistItem = (categoryId: string, itemIndex: number) => {
    setChecklists(prev => prev.map(c => 
      c.id === categoryId ? { ...c, items: c.items.filter((_, i) => i !== itemIndex) } : c
    ));
  };

  const handleSaveChecklists = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Deactivate existing
      await supabase.from('default_checklists').update({ is_active: false }).eq('user_id', user.id);

      // Insert new
      for (const cat of checklists) {
        const items = cat.items.map(item => ({
          id: crypto.randomUUID(),
          title: item,
          category: cat.name,
        }));

        await supabase.from('default_checklists').insert({
          user_id: user.id,
          name: cat.name,
          items: items,
        });
      }

      toast.success('Checklists salvos!');
      await fetchAllData();
    } catch (error) {
      console.error('Error saving checklists:', error);
      toast.error('Erro ao salvar checklists');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <main className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <header className="h-16 border-b border-border flex items-center px-4 lg:px-6 gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <SettingsIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Configurações</h1>
                <p className="text-xs text-muted-foreground">Gerencie suas configurações de onboarding</p>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 lg:p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-4xl mx-auto">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="general" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="hidden sm:inline">Geral</span>
                </TabsTrigger>
                <TabsTrigger value="rules" className="flex items-center gap-2">
                  <ScrollText className="h-4 w-4" />
                  <span className="hidden sm:inline">Regras</span>
                </TabsTrigger>
                <TabsTrigger value="inventory" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  <span className="hidden sm:inline">Inventário</span>
                </TabsTrigger>
                <TabsTrigger value="checklists" className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  <span className="hidden sm:inline">Checklists</span>
                </TabsTrigger>
              </TabsList>

              {/* General Config Tab */}
              <TabsContent value="general" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Horários Padrão
                    </CardTitle>
                    <CardDescription>Configure os horários de check-in e check-out padrão</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="check-in">Check-in</Label>
                      <Input
                        id="check-in"
                        type="time"
                        value={config.default_check_in_time}
                        onChange={(e) => setConfig(prev => ({ ...prev, default_check_in_time: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="check-out">Check-out</Label>
                      <Input
                        id="check-out"
                        type="time"
                        value={config.default_check_out_time}
                        onChange={(e) => setConfig(prev => ({ ...prev, default_check_out_time: e.target.value }))}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Camera className="h-5 w-5" />
                      Fotos e Documentação
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Exigir foto ao reportar problemas</Label>
                        <p className="text-xs text-muted-foreground">Responsáveis devem anexar foto ao criar chamados</p>
                      </div>
                      <Switch
                        checked={config.require_photo_for_issues}
                        onCheckedChange={(checked) => setConfig(prev => ({ ...prev, require_photo_for_issues: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Exigir foto por categoria do checklist</Label>
                        <p className="text-xs text-muted-foreground">Uma foto para cada categoria completada</p>
                      </div>
                      <Switch
                        checked={config.require_photo_per_category}
                        onCheckedChange={(checked) => setConfig(prev => ({ ...prev, require_photo_per_category: checked }))}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Notificações e Automações
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Ativar notificações</Label>
                        <p className="text-xs text-muted-foreground">Receba alertas sobre novas limpezas e problemas</p>
                      </div>
                      <Switch
                        checked={config.enable_notifications}
                        onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enable_notifications: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Liberar limpezas automaticamente</Label>
                        <p className="text-xs text-muted-foreground">Liberar agendamentos no horário do checkout</p>
                      </div>
                      <Switch
                        checked={config.auto_release_schedules}
                        onCheckedChange={(checked) => setConfig(prev => ({ ...prev, auto_release_schedules: checked }))}
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button onClick={handleSaveConfig} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Salvar Configurações
                  </Button>
                </div>
              </TabsContent>

              {/* House Rules Tab */}
              <TabsContent value="rules" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
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
                          checked={newRule.priority === 'info'}
                          onChange={() => setNewRule(prev => ({ ...prev, priority: 'info' }))}
                        />
                        <Info className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">Informativa</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={newRule.priority === 'warning'}
                          onChange={() => setNewRule(prev => ({ ...prev, priority: 'warning' }))}
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

                <Card>
                  <CardHeader>
                    <CardTitle>Regras Cadastradas</CardTitle>
                    <CardDescription>{rules.length} regra{rules.length !== 1 ? 's' : ''}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {rules.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Nenhuma regra cadastrada.</p>
                    ) : (
                      <div className="space-y-3">
                        {rules.map((rule) => (
                          <div key={rule.id} className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border">
                            <div className="mt-0.5">
                              {rule.priority === 'warning' ? (
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                              ) : (
                                <Info className="h-5 w-5 text-blue-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{rule.title}</p>
                              {rule.description && <p className="text-xs text-muted-foreground mt-1">{rule.description}</p>}
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

                <div className="flex justify-end">
                  <Button onClick={handleSaveRules} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Salvar Regras
                  </Button>
                </div>
              </TabsContent>

              {/* Inventory Tab */}
              <TabsContent value="inventory" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {inventory.map((category) => (
                    <Card key={category.id}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center justify-between">
                          {category.name}
                          <span className="text-xs font-normal text-muted-foreground">{category.items.length} itens</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {category.items.map((item) => (
                            <li key={item.id} className="flex items-center justify-between gap-2 text-sm text-muted-foreground group">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                                {item.name}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10"
                                onClick={() => handleRemoveInventoryItem(category.id, item.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                        <div className="flex gap-2 mt-3">
                          <Input
                            placeholder="Novo item..."
                            value={newItemInputs[category.id] || ''}
                            onChange={(e) => setNewItemInputs(prev => ({ ...prev, [category.id]: e.target.value }))}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddInventoryItem(category.id)}
                            className="flex-1 h-8 text-sm"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={() => handleAddInventoryItem(category.id)}
                            disabled={!newItemInputs[category.id]?.trim()}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {inventory.length === 0 && (
                  <Card className="bg-muted/30">
                    <CardContent className="py-8 text-center">
                      <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhum inventário cadastrado ainda.</p>
                      <p className="text-xs text-muted-foreground mt-1">Complete o onboarding para configurar o inventário.</p>
                    </CardContent>
                  </Card>
                )}

                {inventory.length > 0 && (
                  <div className="flex justify-end">
                    <Button onClick={handleSaveInventory} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Salvar Inventário
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Checklists Tab */}
              <TabsContent value="checklists" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Adicionar Nova Categoria</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nome da categoria (ex: Área Externa)"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddChecklistCategory()}
                      />
                      <Button onClick={handleAddChecklistCategory} disabled={!newCategoryName.trim()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  {checklists.map((category) => (
                    <Card key={category.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{category.name}</CardTitle>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveChecklistCategory(category.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {category.items.map((item, index) => (
                          <div key={index} className="flex items-center gap-2 group">
                            <div className="flex-1 px-3 py-2 bg-muted/50 rounded-lg text-sm">{item}</div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10"
                              onClick={() => handleRemoveChecklistItem(category.id, index)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        <AddChecklistItemInput onAdd={(item) => handleAddChecklistItem(category.id, item)} />
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {checklists.length === 0 && (
                  <Card className="bg-muted/30">
                    <CardContent className="py-8 text-center">
                      <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhum checklist cadastrado ainda.</p>
                    </CardContent>
                  </Card>
                )}

                {checklists.length > 0 && (
                  <div className="flex justify-end">
                    <Button onClick={handleSaveChecklists} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Salvar Checklists
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

function AddChecklistItemInput({ onAdd }: { onAdd: (item: string) => void }) {
  const [value, setValue] = useState('');

  const handleAdd = () => {
    if (value.trim()) {
      onAdd(value.trim());
      setValue('');
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        placeholder="Adicionar item..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
        className="flex-1"
      />
      <Button size="sm" variant="secondary" onClick={handleAdd} disabled={!value.trim()}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
