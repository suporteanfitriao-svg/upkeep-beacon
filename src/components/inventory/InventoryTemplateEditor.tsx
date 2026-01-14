import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Sparkles, Loader2, Plus, Trash2, ChevronDown, ChevronRight, 
  Edit2, Check, X, GripVertical
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface TemplateItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  details: string;
}

interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  items: TemplateItem[];
  isExpanded: boolean;
}

interface Property {
  id: string;
  name: string;
}

interface InventoryTemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: Property[];
  defaultTemplate: Array<{
    name: string;
    description: string;
    items: Array<{ name: string; quantity: number; unit: string; details: string }>;
  }>;
  onSuccess: () => void;
}

export const InventoryTemplateEditor = ({
  open,
  onOpenChange,
  properties,
  defaultTemplate,
  onSuccess,
}: InventoryTemplateEditorProps) => {
  const [targetPropertyId, setTargetPropertyId] = useState('');
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [applying, setApplying] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  // Initialize categories from template when dialog opens
  const initializeFromTemplate = () => {
    const initialized = defaultTemplate.map((cat, catIdx) => ({
      id: `cat-${catIdx}`,
      name: cat.name,
      description: cat.description,
      isExpanded: catIdx === 0,
      items: cat.items.map((item, itemIdx) => ({
        id: `cat-${catIdx}-item-${itemIdx}`,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        details: item.details,
      })),
    }));
    setCategories(initialized);
    setTargetPropertyId('');
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      initializeFromTemplate();
    }
    onOpenChange(isOpen);
  };

  const toggleCategoryExpanded = (categoryId: string) => {
    setCategories(prev => prev.map(cat =>
      cat.id === categoryId ? { ...cat, isExpanded: !cat.isExpanded } : cat
    ));
  };

  const updateCategoryName = (categoryId: string, name: string) => {
    setCategories(prev => prev.map(cat =>
      cat.id === categoryId ? { ...cat, name } : cat
    ));
  };

  const removeCategory = (categoryId: string) => {
    setCategories(prev => prev.filter(cat => cat.id !== categoryId));
  };

  const updateItem = (categoryId: string, itemId: string, field: keyof TemplateItem, value: string | number) => {
    setCategories(prev => prev.map(cat => {
      if (cat.id !== categoryId) return cat;
      return {
        ...cat,
        items: cat.items.map(item =>
          item.id === itemId ? { ...item, [field]: value } : item
        ),
      };
    }));
  };

  const removeItem = (categoryId: string, itemId: string) => {
    setCategories(prev => prev.map(cat => {
      if (cat.id !== categoryId) return cat;
      return {
        ...cat,
        items: cat.items.filter(item => item.id !== itemId),
      };
    }));
  };

  const addItem = (categoryId: string) => {
    setCategories(prev => prev.map(cat => {
      if (cat.id !== categoryId) return cat;
      const newItem: TemplateItem = {
        id: `${categoryId}-item-${Date.now()}`,
        name: 'Novo Item',
        quantity: 1,
        unit: 'unidade',
        details: '',
      };
      return {
        ...cat,
        items: [...cat.items, newItem],
      };
    }));
  };

  const addCategory = () => {
    const newCategory: TemplateCategory = {
      id: `cat-${Date.now()}`,
      name: 'Nova Categoria',
      description: '',
      isExpanded: true,
      items: [],
    };
    setCategories(prev => [...prev, newCategory]);
  };

  const handleApply = async () => {
    if (!targetPropertyId) {
      toast.error('Selecione uma propriedade');
      return;
    }

    const filteredCategories = categories.filter(cat => cat.items.length > 0);
    if (filteredCategories.length === 0) {
      toast.error('Adicione pelo menos um item');
      return;
    }

    setApplying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      // Get existing categories count for sort_order
      const { data: existingCategories } = await supabase
        .from('inventory_categories')
        .select('id')
        .eq('property_id', targetPropertyId);

      const startingSortOrder = existingCategories?.length || 0;

      // Create categories and items
      for (let i = 0; i < filteredCategories.length; i++) {
        const cat = filteredCategories[i];

        const { data: newCategory, error: catError } = await supabase
          .from('inventory_categories')
          .insert({
            user_id: user.id,
            name: cat.name,
            description: cat.description || null,
            property_id: targetPropertyId,
            sort_order: startingSortOrder + i,
            is_active: true,
          })
          .select()
          .single();

        if (catError) throw catError;

        if (cat.items.length > 0) {
          const itemsToInsert = cat.items.map((item, idx) => ({
            category_id: newCategory.id,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit || null,
            details: item.details || null,
            sort_order: idx,
            is_active: true,
          }));

          const { error: itemsError } = await supabase
            .from('inventory_items')
            .insert(itemsToInsert);

          if (itemsError) throw itemsError;
        }
      }

      const property = properties.find(p => p.id === targetPropertyId);
      toast.success(`Lista aplicada em ${property?.name || 'propriedade'}!`);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error applying template:', error);
      toast.error('Erro ao aplicar lista');
    } finally {
      setApplying(false);
    }
  };

  const totalItems = categories.reduce((acc, cat) => acc + cat.items.length, 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Personalizar Lista Padrão
          </DialogTitle>
          <DialogDescription>
            Edite categorias e itens antes de aplicar ao inventário da propriedade.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="space-y-2">
            <Label>Propriedade de Destino *</Label>
            <Select value={targetPropertyId} onValueChange={setTargetPropertyId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a propriedade" />
              </SelectTrigger>
              <SelectContent>
                {properties.map(property => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {categories.length} categorias • {totalItems} itens
            </p>
            <Button variant="outline" size="sm" onClick={addCategory}>
              <Plus className="h-3 w-3 mr-1" />
              Categoria
            </Button>
          </div>

          <ScrollArea className="flex-1 pr-4 -mr-4">
            <div className="space-y-2">
              {categories.map((category) => (
                <Collapsible
                  key={category.id}
                  open={category.isExpanded}
                  onOpenChange={() => toggleCategoryExpanded(category.id)}
                >
                  <div className="border rounded-lg">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          {category.isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          {editingCategoryId === category.id ? (
                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              <Input
                                value={category.name}
                                onChange={e => updateCategoryName(category.id, e.target.value)}
                                className="h-7 w-40"
                                autoFocus
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setEditingCategoryId(null)}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className="font-medium">{category.name}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={e => {
                                  e.stopPropagation();
                                  setEditingCategoryId(category.id);
                                }}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <Badge variant="secondary">{category.items.length} itens</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => removeCategory(category.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t p-3 space-y-2">
                        {category.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
                            <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />
                            <Input
                              value={item.name}
                              onChange={e => updateItem(category.id, item.id, 'name', e.target.value)}
                              className="h-8 flex-1"
                              placeholder="Nome do item"
                            />
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={e => updateItem(category.id, item.id, 'quantity', parseInt(e.target.value) || 1)}
                              className="h-8 w-16 text-center"
                              min={1}
                            />
                            <Input
                              value={item.unit}
                              onChange={e => updateItem(category.id, item.id, 'unit', e.target.value)}
                              className="h-8 w-20"
                              placeholder="un"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              onClick={() => removeItem(category.id, item.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-muted-foreground"
                          onClick={() => addItem(category.id)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Adicionar Item
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={applying}>
            Cancelar
          </Button>
          <Button onClick={handleApply} disabled={applying || !targetPropertyId || totalItems === 0}>
            {applying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Aplicando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Aplicar Lista
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
