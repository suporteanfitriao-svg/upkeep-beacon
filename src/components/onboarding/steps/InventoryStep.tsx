import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ArrowLeft, ArrowRight, CheckCircle2, Plus, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InventoryStepProps {
  onNext: () => void;
  onBack: () => void;
}

interface InventoryCategory {
  id: string;
  name: string;
  items: InventoryItem[];
  isNew?: boolean;
}

interface InventoryItem {
  id: string;
  name: string;
  isNew?: boolean;
}

const defaultCategories: { name: string; items: string[] }[] = [
  { name: 'Roupas de Cama', items: ['Lençol', 'Fronhas', 'Edredom', 'Protetor de Colchão'] },
  { name: 'Roupas de Banho', items: ['Toalhas de Banho', 'Toalhas de Rosto', 'Tapete de Banheiro'] },
  { name: 'Cozinha', items: ['Pratos', 'Copos', 'Talheres', 'Panelas'] },
  { name: 'Limpeza', items: ['Vassoura', 'Rodo', 'Pano de Chão', 'Produtos de Limpeza'] },
];

export function InventoryStep({ onNext, onBack }: InventoryStepProps) {
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newItemInputs, setNewItemInputs] = useState<{ [categoryId: string]: string }>({});

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('inventory_categories')
        .select('id, name, sort_order')
        .eq('is_active', true)
        .order('sort_order');

      if (categoriesError) throw categoriesError;

      if (categoriesData && categoriesData.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('inventory_items')
          .select('id, name, category_id, sort_order')
          .eq('is_active', true)
          .order('sort_order');

        if (itemsError) throw itemsError;

        const mappedCategories: InventoryCategory[] = categoriesData.map(cat => ({
          id: cat.id,
          name: cat.name,
          items: (itemsData || [])
            .filter(item => item.category_id === cat.id)
            .map(item => ({ id: item.id, name: item.name })),
        }));

        setCategories(mappedCategories);
      } else {
        // Initialize with default categories locally
        const initialCategories: InventoryCategory[] = defaultCategories.map((cat, idx) => ({
          id: `temp-${idx}`,
          name: cat.name,
          isNew: true,
          items: cat.items.map((item, itemIdx) => ({
            id: `temp-item-${idx}-${itemIdx}`,
            name: item,
            isNew: true,
          })),
        }));
        setCategories(initialCategories);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Erro ao carregar inventário');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = (categoryId: string) => {
    const itemName = newItemInputs[categoryId]?.trim();
    if (!itemName) return;

    setCategories(prev => prev.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          items: [
            ...cat.items,
            { id: `temp-item-${Date.now()}`, name: itemName, isNew: true }
          ],
        };
      }
      return cat;
    }));

    setNewItemInputs(prev => ({ ...prev, [categoryId]: '' }));
  };

  const handleRemoveItem = (categoryId: string, itemId: string) => {
    setCategories(prev => prev.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          items: cat.items.filter(item => item.id !== itemId),
        };
      }
      return cat;
    }));
  };

  const handleSaveAndNext = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      // For each category, upsert to DB
      for (let idx = 0; idx < categories.length; idx++) {
        const cat = categories[idx];
        let categoryId = cat.id;

        // If it's a new category (temp id), insert it
        if (cat.isNew || cat.id.startsWith('temp-')) {
          const { data: catData, error: catError } = await supabase
            .from('inventory_categories')
            .insert({
              user_id: user.id,
              name: cat.name,
              sort_order: idx,
            })
            .select('id')
            .single();

          if (catError) throw catError;
          categoryId = catData.id;
        }

        // Insert items for this category
        for (let itemIdx = 0; itemIdx < cat.items.length; itemIdx++) {
          const item = cat.items[itemIdx];
          
          if (item.isNew || item.id.startsWith('temp-')) {
            const { error: itemError } = await supabase
              .from('inventory_items')
              .insert({
                category_id: categoryId,
                name: item.name,
                sort_order: itemIdx,
              });

            if (itemError) throw itemError;
          }
        }
      }

      toast.success('Inventário salvo com sucesso!');
      onNext();
    } catch (error) {
      console.error('Error saving inventory:', error);
      toast.error('Erro ao salvar inventário');
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
            <Package className="h-7 w-7" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Controle de Inventário</h2>
        <p className="text-muted-foreground">
          Configure o inventário padrão para suas propriedades. Você poderá personalizar por propriedade depois.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {categories.map((category) => (
          <Card key={category.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                {category.name}
                <span className="text-xs font-normal text-muted-foreground">
                  {category.items.length} itens
                </span>
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
                      onClick={() => handleRemoveItem(category.id, item.id)}
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
                  onKeyPress={(e) => e.key === 'Enter' && handleAddItem(category.id)}
                  className="flex-1 h-8 text-sm"
                />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8"
                  onClick={() => handleAddItem(category.id)}
                  disabled={!newItemInputs[category.id]?.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-8 bg-muted/30">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            💡 <strong>Dica:</strong> Você pode personalizar o inventário de cada propriedade individualmente na página de configurações da propriedade.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={handleSaveAndNext} disabled={saving || categories.length === 0}>
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
      {categories.length === 0 && (
        <p className="text-xs text-destructive text-center mt-2">
          Adicione pelo menos uma categoria de inventário para continuar.
        </p>
      )}
    </div>
  );
}