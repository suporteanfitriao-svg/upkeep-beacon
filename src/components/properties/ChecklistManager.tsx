import { useState, useEffect } from 'react';
import { Plus, Trash2, Copy, Save, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ChecklistItem {
  id: string;
  title: string;
  category: string;
}

interface PropertyChecklist {
  id: string;
  property_id: string;
  name: string;
  items: ChecklistItem[];
  is_default: boolean;
  created_at: string;
}

interface ChecklistManagerProps {
  propertyId: string;
  propertyName: string;
  allChecklists: PropertyChecklist[];
  onChecklistsChange: () => void;
}

const DEFAULT_CHECKLIST_TEMPLATE: ChecklistItem[] = [
  { id: 'kitchen-1', title: 'Limpar geladeira', category: 'Cozinha' },
  { id: 'kitchen-2', title: 'Limpar fogão', category: 'Cozinha' },
  { id: 'kitchen-3', title: 'Limpar microondas', category: 'Cozinha' },
  { id: 'kitchen-4', title: 'Lavar louça', category: 'Cozinha' },
  { id: 'kitchen-5', title: 'Limpar armários por fora', category: 'Cozinha' },
  { id: 'kitchen-6', title: 'Limpar pia', category: 'Cozinha' },
  { id: 'living-1', title: 'Aspirar sofá', category: 'Sala' },
  { id: 'living-2', title: 'Limpar mesas', category: 'Sala' },
  { id: 'living-3', title: 'Limpar TV e eletrônicos', category: 'Sala' },
  { id: 'living-4', title: 'Organizar almofadas', category: 'Sala' },
  { id: 'bedroom-1', title: 'Trocar roupas de cama', category: 'Quarto' },
  { id: 'bedroom-2', title: 'Arrumar cama', category: 'Quarto' },
  { id: 'bedroom-3', title: 'Limpar criados-mudos', category: 'Quarto' },
  { id: 'bedroom-4', title: 'Organizar armário', category: 'Quarto' },
  { id: 'bathroom-1', title: 'Limpar vaso sanitário', category: 'Banheiro' },
  { id: 'bathroom-2', title: 'Limpar box/chuveiro', category: 'Banheiro' },
  { id: 'bathroom-3', title: 'Limpar pia e espelho', category: 'Banheiro' },
  { id: 'bathroom-4', title: 'Trocar toalhas', category: 'Banheiro' },
  { id: 'bathroom-5', title: 'Repor papel higiênico', category: 'Banheiro' },
  { id: 'general-1', title: 'Varrer/aspirar todos os cômodos', category: 'Geral' },
  { id: 'general-2', title: 'Passar pano no chão', category: 'Geral' },
  { id: 'general-3', title: 'Limpar janelas por dentro', category: 'Geral' },
  { id: 'general-4', title: 'Retirar lixo', category: 'Geral' },
  { id: 'general-5', title: 'Verificar luzes e tomadas', category: 'Geral' },
];

const CATEGORY_OPTIONS = ['Cozinha', 'Sala', 'Quarto', 'Banheiro', 'Varanda', 'Área de Serviço', 'Geral', 'Outro'];

export function ChecklistManager({ propertyId, propertyName, allChecklists, onChecklistsChange }: ChecklistManagerProps) {
  const [checklists, setChecklists] = useState<PropertyChecklist[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState<PropertyChecklist | null>(null);
  const [checklistName, setChecklistName] = useState('');
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Geral');
  const [migrateFromId, setMigrateFromId] = useState<string>('');

  useEffect(() => {
    const propertyChecklists = allChecklists.filter(c => c.property_id === propertyId);
    setChecklists(propertyChecklists);
  }, [allChecklists, propertyId]);

  const handleCreateNew = (useDefault: boolean = false) => {
    setEditingChecklist(null);
    setChecklistName('Checklist Padrão');
    setChecklistItems(useDefault ? [...DEFAULT_CHECKLIST_TEMPLATE] : []);
    setMigrateFromId('');
    setDialogOpen(true);
  };

  const handleEdit = (checklist: PropertyChecklist) => {
    setEditingChecklist(checklist);
    setChecklistName(checklist.name);
    setChecklistItems([...checklist.items]);
    setMigrateFromId('');
    setDialogOpen(true);
  };

  const handleMigrateFrom = (sourceId: string) => {
    const source = allChecklists.find(c => c.id === sourceId);
    if (source) {
      setChecklistItems(source.items.map(item => ({
        ...item,
        id: `${item.id}-${Date.now()}`
      })));
      setMigrateFromId(sourceId);
      toast.success(`Checklist "${source.name}" copiado para edição`);
    }
  };

  const handleAddItem = () => {
    if (!newItemTitle.trim()) return;
    const newItem: ChecklistItem = {
      id: `item-${Date.now()}`,
      title: newItemTitle.trim(),
      category: newItemCategory
    };
    setChecklistItems([...checklistItems, newItem]);
    setNewItemTitle('');
  };

  const handleRemoveItem = (itemId: string) => {
    setChecklistItems(checklistItems.filter(item => item.id !== itemId));
  };

  const handleSave = async () => {
    if (!checklistName.trim()) {
      toast.error('Nome do checklist é obrigatório');
      return;
    }

    // Convert items to JSON-compatible format
    const itemsJson = checklistItems.map(item => ({
      id: item.id,
      title: item.title,
      category: item.category
    }));

    const data = {
      property_id: propertyId,
      name: checklistName.trim(),
      items: itemsJson as unknown as any,
      is_default: checklists.length === 0
    };

    if (editingChecklist) {
      const { error } = await supabase
        .from('property_checklists')
        .update(data)
        .eq('id', editingChecklist.id);

      if (error) {
        toast.error('Erro ao atualizar checklist');
        console.error(error);
        return;
      }
      toast.success('Checklist atualizado!');
    } else {
      const { error } = await supabase
        .from('property_checklists')
        .insert([data]);

      if (error) {
        toast.error('Erro ao criar checklist');
        console.error(error);
        return;
      }
      toast.success('Checklist criado!');
    }

    setDialogOpen(false);
    onChecklistsChange();
  };

  const handleDelete = async (checklistId: string) => {
    const { error } = await supabase
      .from('property_checklists')
      .delete()
      .eq('id', checklistId);

    if (error) {
      toast.error('Erro ao excluir checklist');
      console.error(error);
      return;
    }
    toast.success('Checklist excluído!');
    onChecklistsChange();
  };

  const groupedItems = checklistItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  // Get checklists from other properties for migration
  const otherChecklists = allChecklists.filter(c => c.property_id !== propertyId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Checklists ({checklists.length})</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={() => handleCreateNew(true)}>
              <Plus className="h-3 w-3 mr-1" />
              Criar Checklist
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingChecklist ? 'Editar Checklist' : 'Novo Checklist'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Migrate from another checklist */}
              {!editingChecklist && otherChecklists.length > 0 && (
                <div className="p-3 bg-muted/50 rounded-lg border">
                  <Label className="text-xs text-muted-foreground">Copiar de outro checklist</Label>
                  <div className="flex gap-2 mt-2">
                    <Select value={migrateFromId} onValueChange={setMigrateFromId}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione um checklist existente" />
                      </SelectTrigger>
                      <SelectContent>
                        {otherChecklists.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {allChecklists.find(p => p.property_id === c.property_id) 
                              ? `${c.name}` 
                              : c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => handleMigrateFrom(migrateFromId)}
                      disabled={!migrateFromId}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copiar
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="checklistName">Nome do Checklist</Label>
                <Input
                  id="checklistName"
                  value={checklistName}
                  onChange={(e) => setChecklistName(e.target.value)}
                  placeholder="Ex: Checklist Apartamento 101"
                />
              </div>

              {/* Add new item */}
              <div className="space-y-2">
                <Label>Adicionar Item</Label>
                <div className="flex gap-2">
                  <Select value={newItemCategory} onValueChange={setNewItemCategory}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                    placeholder="Descrição do item"
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                  />
                  <Button variant="secondary" size="icon" onClick={handleAddItem}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Items by category */}
              <div className="space-y-2">
                <Label>Itens do Checklist ({checklistItems.length})</Label>
                {Object.keys(groupedItems).length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    Nenhum item adicionado. Use o checklist padrão ou adicione itens manualmente.
                  </div>
                ) : (
                  <Accordion type="multiple" defaultValue={Object.keys(groupedItems)} className="space-y-2">
                    {Object.entries(groupedItems).map(([category, items]) => (
                      <AccordionItem key={category} value={category} className="border rounded-lg">
                        <AccordionTrigger className="px-3 py-2 hover:no-underline">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{category}</span>
                            <Badge variant="secondary" className="text-xs">
                              {items.length}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 pb-2">
                          <div className="space-y-1">
                            {items.map(item => (
                              <div 
                                key={item.id}
                                className="flex items-center gap-2 p-2 bg-muted/30 rounded text-sm group"
                              >
                                <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                                <span className="flex-1">{item.title}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleRemoveItem(item.id)}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </div>

              {/* Use default template button */}
              {checklistItems.length === 0 && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setChecklistItems([...DEFAULT_CHECKLIST_TEMPLATE])}
                >
                  Usar Checklist Padrão Sugerido
                </Button>
              )}

              <Button onClick={handleSave} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {editingChecklist ? 'Salvar Alterações' : 'Criar Checklist'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {checklists.length > 0 ? (
        <div className="space-y-2">
          {checklists.map((checklist) => (
            <div
              key={checklist.id}
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{checklist.name}</p>
                  {checklist.is_default && (
                    <Badge variant="secondary" className="text-xs">Padrão</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {checklist.items.length} itens
                </p>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleEdit(checklist)}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir checklist?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(checklist.id)}
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
      ) : (
        <p className="text-sm text-muted-foreground py-2">
          Nenhum checklist configurado. Crie um checklist para ser usado nas limpezas.
        </p>
      )}
    </div>
  );
}