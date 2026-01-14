import { useState, useEffect } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Package, Plus, Trash2, Loader2, Edit2, FolderOpen, 
  ChevronRight, Search, Box, Hash, Building2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Property {
  id: string;
  name: string;
}

interface InventoryCategory {
  id: string;
  name: string;
  description?: string;
  property_id?: string;
  sort_order: number;
  is_active: boolean;
  items: InventoryItem[];
}

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  details?: string;
  category_id: string;
  sort_order: number;
  is_active: boolean;
}

const Inventory = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategory | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Category dialog
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<InventoryCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', property_id: '' });
  const [savingCategory, setSavingCategory] = useState(false);
  
  // Item dialog
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] = useState({ 
    name: '', 
    quantity: 1, 
    unit: 'unidade', 
    details: '' 
  });
  const [savingItem, setSavingItem] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [selectedPropertyId]);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      
      let categoriesQuery = supabase
        .from('inventory_categories')
        .select('*')
        .order('sort_order');

      // Filter by property if one is selected
      if (selectedPropertyId !== 'all') {
        categoriesQuery = categoriesQuery.eq('property_id', selectedPropertyId);
      }

      const { data: categoriesData, error: categoriesError } = await categoriesQuery;

      if (categoriesError) throw categoriesError;

      const categoryIds = (categoriesData || []).map(c => c.id);
      
      let itemsData: any[] = [];
      if (categoryIds.length > 0) {
        const { data, error: itemsError } = await supabase
          .from('inventory_items')
          .select('*')
          .in('category_id', categoryIds)
          .order('sort_order');

        if (itemsError) throw itemsError;
        itemsData = data || [];
      }

      const mappedCategories: InventoryCategory[] = (categoriesData || []).map(cat => ({
        ...cat,
        items: itemsData.filter(item => item.category_id === cat.id),
      }));

      setCategories(mappedCategories);
      
      // Auto-select first category if none selected or current not in list
      if (mappedCategories.length > 0) {
        const currentStillExists = selectedCategory && mappedCategories.some(c => c.id === selectedCategory.id);
        if (!currentStillExists) {
          setSelectedCategory(mappedCategories[0]);
        }
      } else {
        setSelectedCategory(null);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Erro ao carregar inventário');
    } finally {
      setLoading(false);
    }
  };

  // Category functions
  const handleOpenCategoryDialog = (category?: InventoryCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({ 
        name: category.name, 
        description: category.description || '',
        property_id: category.property_id || ''
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({ 
        name: '', 
        description: '',
        property_id: selectedPropertyId !== 'all' ? selectedPropertyId : ''
      });
    }
    setCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('Nome da categoria é obrigatório');
      return;
    }

    if (!categoryForm.property_id) {
      toast.error('Selecione uma propriedade');
      return;
    }

    setSavingCategory(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      if (editingCategory) {
        const { error } = await supabase
          .from('inventory_categories')
          .update({
            name: categoryForm.name.trim(),
            description: categoryForm.description.trim() || null,
            property_id: categoryForm.property_id,
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast.success('Categoria atualizada!');
      } else {
        const { error } = await supabase
          .from('inventory_categories')
          .insert({
            user_id: user.id,
            name: categoryForm.name.trim(),
            description: categoryForm.description.trim() || null,
            property_id: categoryForm.property_id,
            sort_order: categories.length,
          });

        if (error) throw error;
        toast.success('Categoria criada!');
      }

      setCategoryDialogOpen(false);
      fetchInventory();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Erro ao salvar categoria');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria e todos seus itens?')) return;

    try {
      // Delete items first
      await supabase.from('inventory_items').delete().eq('category_id', categoryId);
      
      const { error } = await supabase
        .from('inventory_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
      
      toast.success('Categoria excluída!');
      if (selectedCategory?.id === categoryId) {
        setSelectedCategory(null);
      }
      fetchInventory();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Erro ao excluir categoria');
    }
  };

  // Item functions
  const handleOpenItemDialog = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setItemForm({ 
        name: item.name, 
        quantity: item.quantity || 1, 
        unit: item.unit || 'unidade', 
        details: item.details || '' 
      });
    } else {
      setEditingItem(null);
      setItemForm({ name: '', quantity: 1, unit: 'unidade', details: '' });
    }
    setItemDialogOpen(true);
  };

  const handleSaveItem = async () => {
    if (!itemForm.name.trim()) {
      toast.error('Nome do item é obrigatório');
      return;
    }

    if (!selectedCategory) {
      toast.error('Selecione uma categoria primeiro');
      return;
    }

    setSavingItem(true);
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('inventory_items')
          .update({
            name: itemForm.name.trim(),
            quantity: itemForm.quantity,
            unit: itemForm.unit.trim() || null,
            details: itemForm.details.trim() || null,
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success('Item atualizado!');
      } else {
        const { error } = await supabase
          .from('inventory_items')
          .insert({
            category_id: selectedCategory.id,
            name: itemForm.name.trim(),
            quantity: itemForm.quantity,
            unit: itemForm.unit.trim() || null,
            details: itemForm.details.trim() || null,
            sort_order: selectedCategory.items.length,
          });

        if (error) throw error;
        toast.success('Item criado!');
      }

      setItemDialogOpen(false);
      fetchInventory();
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Erro ao salvar item');
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;

    try {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      toast.success('Item excluído!');
      fetchInventory();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Erro ao excluir item');
    }
  };

  // Get property name helper
  const getPropertyName = (propertyId?: string) => {
    if (!propertyId) return 'Sem propriedade';
    const property = properties.find(p => p.id === propertyId);
    return property?.name || 'Desconhecida';
  };

  // Filter items based on search
  const filteredItems = selectedCategory?.items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.details?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (loading && categories.length === 0) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <DashboardHeader />
          <main className="flex-1 p-6 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <main className="flex-1 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Package className="h-6 w-6" />
                Inventário
              </h1>
              <p className="text-muted-foreground mt-1">
                Gerencie espaços, itens e quantidades do seu inventário
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filtrar por propriedade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as propriedades</SelectItem>
                    {properties.map(property => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => handleOpenCategoryDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Categoria
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Categories sidebar */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Categorias
                </CardTitle>
                <CardDescription className="text-xs">
                  {categories.length} categorias
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                  {categories.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {selectedPropertyId !== 'all' 
                        ? 'Nenhuma categoria nesta propriedade'
                        : 'Nenhuma categoria criada'
                      }
                    </div>
                  ) : (
                    categories.map(category => (
                      <div
                        key={category.id}
                        className={`flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                          selectedCategory?.id === category.id ? 'bg-primary/5 border-l-2 border-primary' : ''
                        }`}
                        onClick={() => setSelectedCategory(category)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{category.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {getPropertyName(category.property_id)} • {category.items.length} itens
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCategoryDialog(category);
                            }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCategory(category.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Items main content */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Box className="h-5 w-5" />
                      {selectedCategory ? selectedCategory.name : 'Selecione uma categoria'}
                    </CardTitle>
                    {selectedCategory && (
                      <CardDescription className="mt-1 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          <Building2 className="h-3 w-3 mr-1" />
                          {getPropertyName(selectedCategory.property_id)}
                        </Badge>
                        {selectedCategory.description && (
                          <span className="text-muted-foreground">
                            {selectedCategory.description}
                          </span>
                        )}
                      </CardDescription>
                    )}
                  </div>
                  {selectedCategory && (
                    <Button onClick={() => handleOpenItemDialog()} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Item
                    </Button>
                  )}
                </div>
                {selectedCategory && (
                  <div className="relative mt-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar itens..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {!selectedCategory ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Selecione uma categoria para ver seus itens</p>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Box className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum item nesta categoria</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => handleOpenItemDialog()}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar primeiro item
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="w-[100px] text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Hash className="h-3 w-3" />
                            Qtd
                          </div>
                        </TableHead>
                        <TableHead className="w-[100px]">Unidade</TableHead>
                        <TableHead>Detalhes</TableHead>
                        <TableHead className="w-[80px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{item.quantity}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.unit || '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                            {item.details || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleOpenItemDialog(item)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteItem(item.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
            <DialogDescription>
              Categorias ajudam a organizar seu inventário por espaços ou tipos de itens.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cat-property">Propriedade *</Label>
              <Select 
                value={categoryForm.property_id} 
                onValueChange={(value) => setCategoryForm(prev => ({ ...prev, property_id: value }))}
              >
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
            <div className="space-y-2">
              <Label htmlFor="cat-name">Nome da Categoria *</Label>
              <Input
                id="cat-name"
                placeholder="Ex: Cozinha, Quarto Principal, Área Externa"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-desc">Descrição (opcional)</Label>
              <Textarea
                id="cat-desc"
                placeholder="Descreva esta categoria..."
                value={categoryForm.description}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCategory} disabled={savingCategory}>
              {savingCategory ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Editar Item' : 'Novo Item'}
            </DialogTitle>
            <DialogDescription>
              {selectedCategory && `Adicionando item em: ${selectedCategory.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="item-name">Nome do Item *</Label>
              <Input
                id="item-name"
                placeholder="Ex: Toalha de Banho, Travesseiro, Panela"
                value={itemForm.name}
                onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="item-qty">Quantidade</Label>
                <Input
                  id="item-qty"
                  type="number"
                  min="1"
                  value={itemForm.quantity}
                  onChange={(e) => setItemForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-unit">Unidade</Label>
                <Input
                  id="item-unit"
                  placeholder="Ex: unidade, pares, kg"
                  value={itemForm.unit}
                  onChange={(e) => setItemForm(prev => ({ ...prev, unit: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-details">Detalhes (opcional)</Label>
              <Textarea
                id="item-details"
                placeholder="Marca, cor, tamanho, observações..."
                value={itemForm.details}
                onChange={(e) => setItemForm(prev => ({ ...prev, details: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveItem} disabled={savingItem}>
              {savingItem ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default Inventory;
