import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, ArrowLeft, ArrowRight, Plus, Trash2, GripVertical } from 'lucide-react';

interface ChecklistsStepProps {
  onNext: () => void;
  onBack: () => void;
}

interface ChecklistCategory {
  id: string;
  name: string;
  items: string[];
}

const defaultCategories: ChecklistCategory[] = [
  { id: '1', name: 'Quarto', items: ['Trocar roupas de cama', 'Arrumar cama', 'Limpar armários', 'Limpar espelho'] },
  { id: '2', name: 'Banheiro', items: ['Limpar vaso sanitário', 'Limpar box', 'Trocar toalhas', 'Repor sabonete'] },
  { id: '3', name: 'Cozinha', items: ['Limpar fogão', 'Limpar geladeira', 'Lavar louças', 'Verificar mantimentos'] },
  { id: '4', name: 'Sala', items: ['Aspirar sofá', 'Limpar mesa de centro', 'Organizar almofadas'] },
];

export function ChecklistsStep({ onNext, onBack }: ChecklistsStepProps) {
  const [categories, setCategories] = useState<ChecklistCategory[]>(defaultCategories);
  const [newCategoryName, setNewCategoryName] = useState('');

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    
    setCategories(prev => [
      ...prev,
      { id: Date.now().toString(), name: newCategoryName, items: [] }
    ]);
    setNewCategoryName('');
  };

  const handleRemoveCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const handleAddItem = (categoryId: string, item: string) => {
    if (!item.trim()) return;
    
    setCategories(prev => prev.map(c => 
      c.id === categoryId 
        ? { ...c, items: [...c.items, item] }
        : c
    ));
  };

  const handleRemoveItem = (categoryId: string, itemIndex: number) => {
    setCategories(prev => prev.map(c => 
      c.id === categoryId 
        ? { ...c, items: c.items.filter((_, i) => i !== itemIndex) }
        : c
    ));
  };

  return (
    <div className="max-w-3xl w-full">
      <div className="text-center mb-8">
        <div className="mb-6 flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <ClipboardList className="h-7 w-7" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Checklists de Limpeza</h2>
        <p className="text-muted-foreground">
          Defina os itens que sua equipe deve verificar em cada limpeza.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Adicionar Nova Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Nome da categoria (ex: Área Externa)"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4 mb-8">
        {categories.map((category) => (
          <Card key={category.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">{category.name}</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => handleRemoveCategory(category.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {category.items.map((item, index) => (
                <div key={index} className="flex items-center gap-2 group">
                  <div className="flex-1 px-3 py-2 bg-muted/50 rounded-lg text-sm">
                    {item}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemoveItem(category.id, index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <AddItemInput onAdd={(item) => handleAddItem(category.id, item)} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={onNext}>
          Próximo
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function AddItemInput({ onAdd }: { onAdd: (item: string) => void }) {
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
