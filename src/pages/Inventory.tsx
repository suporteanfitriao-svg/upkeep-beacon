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
  ChevronRight, Search, Box, Hash, Building2, Copy, ArrowRight, ListChecks, Sparkles
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

// Default global inventory template
const DEFAULT_INVENTORY_TEMPLATE = [
  {
    name: 'Sala de Estar',
    description: 'Móveis e itens da sala principal',
    items: [
      { name: 'Sofá', quantity: 1, unit: 'unidade', details: 'Verificar estado do estofado' },
      { name: 'Almofadas', quantity: 4, unit: 'unidades', details: 'Decorativas' },
      { name: 'Mesa de centro', quantity: 1, unit: 'unidade', details: '' },
      { name: 'TV', quantity: 1, unit: 'unidade', details: 'Smart TV - verificar controle remoto' },
      { name: 'Controle remoto', quantity: 2, unit: 'unidades', details: 'TV e ar condicionado' },
      { name: 'Tapete', quantity: 1, unit: 'unidade', details: '' },
      { name: 'Cortinas', quantity: 2, unit: 'unidades', details: '' },
      { name: 'Abajur', quantity: 1, unit: 'unidade', details: '' },
    ],
  },
  {
    name: 'Quarto Principal',
    description: 'Móveis e roupas de cama',
    items: [
      { name: 'Cama casal', quantity: 1, unit: 'unidade', details: 'Verificar colchão' },
      { name: 'Travesseiros', quantity: 4, unit: 'unidades', details: '' },
      { name: 'Lençol', quantity: 2, unit: 'jogos', details: 'Casal' },
      { name: 'Edredom', quantity: 1, unit: 'unidade', details: '' },
      { name: 'Cobertor extra', quantity: 1, unit: 'unidade', details: 'No armário' },
      { name: 'Cabides', quantity: 10, unit: 'unidades', details: '' },
      { name: 'Espelho', quantity: 1, unit: 'unidade', details: '' },
      { name: 'Criado-mudo', quantity: 2, unit: 'unidades', details: '' },
      { name: 'Luminária', quantity: 2, unit: 'unidades', details: 'Cabeceira' },
    ],
  },
  {
    name: 'Quarto de Hóspedes',
    description: 'Quarto secundário',
    items: [
      { name: 'Cama solteiro', quantity: 2, unit: 'unidades', details: '' },
      { name: 'Travesseiros', quantity: 2, unit: 'unidades', details: '' },
      { name: 'Lençol', quantity: 2, unit: 'jogos', details: 'Solteiro' },
      { name: 'Cobertor', quantity: 2, unit: 'unidades', details: '' },
      { name: 'Cabides', quantity: 6, unit: 'unidades', details: '' },
    ],
  },
  {
    name: 'Cozinha',
    description: 'Utensílios e eletrodomésticos',
    items: [
      { name: 'Pratos', quantity: 6, unit: 'unidades', details: 'Rasos' },
      { name: 'Pratos fundo', quantity: 6, unit: 'unidades', details: '' },
      { name: 'Copos', quantity: 8, unit: 'unidades', details: 'Vidro' },
      { name: 'Xícaras', quantity: 4, unit: 'unidades', details: 'Com pires' },
      { name: 'Talheres - Garfo', quantity: 6, unit: 'unidades', details: '' },
      { name: 'Talheres - Faca', quantity: 6, unit: 'unidades', details: '' },
      { name: 'Talheres - Colher', quantity: 6, unit: 'unidades', details: '' },
      { name: 'Panela grande', quantity: 1, unit: 'unidade', details: '' },
      { name: 'Panela média', quantity: 1, unit: 'unidade', details: '' },
      { name: 'Frigideira', quantity: 1, unit: 'unidade', details: '' },
      { name: 'Chaleira', quantity: 1, unit: 'unidade', details: '' },
      { name: 'Cafeteira', quantity: 1, unit: 'unidade', details: 'Verificar funcionamento' },
      { name: 'Liquidificador', quantity: 1, unit: 'unidade', details: '' },
      { name: 'Tábua de corte', quantity: 1, unit: 'unidade', details: '' },
      { name: 'Faca de cozinha', quantity: 2, unit: 'unidades', details: '' },
      { name: 'Abridor de garrafa', quantity: 1, unit: 'unidade', details: '' },
      { name: 'Saca-rolhas', quantity: 1, unit: 'unidade', details: '' },
      { name: 'Pano de prato', quantity: 3, unit: 'unidades', details: '' },
      { name: 'Lixeira', quantity: 1, unit: 'unidade', details: 'Com pedal' },
    ],
  },
  {
    name: 'Banheiro Social',
    description: 'Toalhas e acessórios',
    items: [
      { name: 'Toalha de banho', quantity: 4, unit: 'unidades', details: '' },
      { name: 'Toalha de rosto', quantity: 4, unit: 'unidades', details: '' },
      { name: 'Tapete de banheiro', quantity: 1, unit: 'unidade', details: '' },
      { name: 'Lixeira', quantity: 1, unit: 'unidade', details: '' },
      { name: 'Porta-papel higiênico', quantity: 1, unit: 'unidade', details: '' },
      { name: 'Espelho', quantity: 1, unit: 'unidade', details: '' },
      { name: 'Secador de cabelo', quantity: 1, unit: 'unidade', details: 'Verificar funcionamento' },
    ],
  },
  {
    name: 'Área de Serviço',
    description: 'Produtos e equipamentos de limpeza',
    items: [
      { name: 'Máquina de lavar', quantity: 1, unit: 'unidade', details: 'Verificar funcionamento' },
      { name: 'Ferro de passar', quantity: 1, unit: 'unidade', details: '' },
      { name: 'Tábua de passar', quantity: 1, unit: 'unidade', details: '' },
      { name: 'Vassoura', quantity: 1, unit: 'unidade', details: '' },
      { name: 'Rodo', quantity: 1, unit: 'unidade', details: '' },
      { name: 'Balde', quantity: 1, unit: 'unidade', details: '' },
      { name: 'Pá de lixo', quantity: 1, unit: 'unidade', details: '' },
    ],
  },
  {
    name: 'Área Externa',
    description: 'Varanda, piscina ou jardim',
    items: [
      { name: 'Cadeira de área', quantity: 4, unit: 'unidades', details: '' },
      { name: 'Mesa externa', quantity: 1, unit: 'unidade', details: '' },
      { name: 'Guarda-sol', quantity: 1, unit: 'unidade', details: '' },
      { name: 'Churrasqueira', quantity: 1, unit: 'unidade', details: 'Verificar gás' },
      { name: 'Utensílios de churrasco', quantity: 1, unit: 'kit', details: 'Espeto, garfo, faca' },
    ],
  },
];
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

  // Copy inventory dialog
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [sourcePropertyId, setSourcePropertyId] = useState<string>('');
  const [targetPropertyId, setTargetPropertyId] = useState<string>('');
  const [copying, setCopying] = useState(false);

  // Default template dialog
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateTargetPropertyId, setTemplateTargetPropertyId] = useState<string>('');
  const [applyingTemplate, setApplyingTemplate] = useState(false);

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

  // Copy inventory function
  const handleCopyInventory = async () => {
    if (!sourcePropertyId || !targetPropertyId) {
      toast.error('Selecione a propriedade de origem e destino');
      return;
    }

    if (sourcePropertyId === targetPropertyId) {
      toast.error('A propriedade de origem e destino devem ser diferentes');
      return;
    }

    setCopying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      // Fetch categories from source property
      const { data: sourceCategories, error: catError } = await supabase
        .from('inventory_categories')
        .select('*')
        .eq('property_id', sourcePropertyId);

      if (catError) throw catError;

      if (!sourceCategories || sourceCategories.length === 0) {
        toast.error('Nenhuma categoria encontrada na propriedade de origem');
        setCopying(false);
        return;
      }

      // Get all items from source categories
      const sourceCategoryIds = sourceCategories.map(c => c.id);
      const { data: sourceItems, error: itemsError } = await supabase
        .from('inventory_items')
        .select('*')
        .in('category_id', sourceCategoryIds);

      if (itemsError) throw itemsError;

      // Check how many categories already exist in target property
      const { data: existingTargetCategories } = await supabase
        .from('inventory_categories')
        .select('id')
        .eq('property_id', targetPropertyId);

      const startingSortOrder = existingTargetCategories?.length || 0;

      // Create new categories in target property
      const categoryIdMap: Record<string, string> = {};
      
      for (let i = 0; i < sourceCategories.length; i++) {
        const cat = sourceCategories[i];
        const { data: newCategory, error: newCatError } = await supabase
          .from('inventory_categories')
          .insert({
            user_id: user.id,
            name: cat.name,
            description: cat.description,
            property_id: targetPropertyId,
            sort_order: startingSortOrder + i,
            is_active: cat.is_active,
          })
          .select()
          .single();

        if (newCatError) throw newCatError;
        categoryIdMap[cat.id] = newCategory.id;
      }

      // Create items in new categories
      if (sourceItems && sourceItems.length > 0) {
        const newItems = sourceItems.map(item => ({
          category_id: categoryIdMap[item.category_id],
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          details: item.details,
          sort_order: item.sort_order,
          is_active: item.is_active,
        }));

        const { error: insertItemsError } = await supabase
          .from('inventory_items')
          .insert(newItems);

        if (insertItemsError) throw insertItemsError;
      }

      const targetProperty = properties.find(p => p.id === targetPropertyId);
      toast.success(`Inventário copiado para ${targetProperty?.name || 'propriedade'}!`);
      setCopyDialogOpen(false);
      setSourcePropertyId('');
      setTargetPropertyId('');
      
      // Refresh inventory if viewing target property
      if (selectedPropertyId === targetPropertyId || selectedPropertyId === 'all') {
        fetchInventory();
      }
    } catch (error) {
      console.error('Error copying inventory:', error);
      toast.error('Erro ao copiar inventário');
    } finally {
      setCopying(false);
    }
  };

  // Apply default template function
  const handleApplyDefaultTemplate = async () => {
    if (!templateTargetPropertyId) {
      toast.error('Selecione uma propriedade');
      return;
    }

    setApplyingTemplate(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      // Check how many categories already exist in target property
      const { data: existingCategories } = await supabase
        .from('inventory_categories')
        .select('id')
        .eq('property_id', templateTargetPropertyId);

      const startingSortOrder = existingCategories?.length || 0;

      // Create categories and items from template
      for (let i = 0; i < DEFAULT_INVENTORY_TEMPLATE.length; i++) {
        const templateCategory = DEFAULT_INVENTORY_TEMPLATE[i];
        
        // Create category
        const { data: newCategory, error: catError } = await supabase
          .from('inventory_categories')
          .insert({
            user_id: user.id,
            name: templateCategory.name,
            description: templateCategory.description,
            property_id: templateTargetPropertyId,
            sort_order: startingSortOrder + i,
            is_active: true,
          })
          .select()
          .single();

        if (catError) throw catError;

        // Create items for this category
        if (templateCategory.items.length > 0) {
          const itemsToInsert = templateCategory.items.map((item, index) => ({
            category_id: newCategory.id,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            details: item.details || null,
            sort_order: index,
            is_active: true,
          }));

          const { error: itemsError } = await supabase
            .from('inventory_items')
            .insert(itemsToInsert);

          if (itemsError) throw itemsError;
        }
      }

      const targetProperty = properties.find(p => p.id === templateTargetPropertyId);
      toast.success(`Lista padrão aplicada em ${targetProperty?.name || 'propriedade'}!`);
      setTemplateDialogOpen(false);
      setTemplateTargetPropertyId('');
      
      // Refresh inventory if viewing target property
      if (selectedPropertyId === templateTargetPropertyId || selectedPropertyId === 'all') {
        fetchInventory();
      }
    } catch (error) {
      console.error('Error applying template:', error);
      toast.error('Erro ao aplicar lista padrão');
    } finally {
      setApplyingTemplate(false);
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
              <Button 
                variant="outline" 
                onClick={() => setTemplateDialogOpen(true)}
                disabled={properties.length === 0}
                className="text-primary border-primary/30 hover:bg-primary/10"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Lista Padrão
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setCopyDialogOpen(true)}
                disabled={properties.length < 2}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar Inventário
              </Button>
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

      {/* Copy Inventory Dialog */}
      <AlertDialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Copiar Inventário
            </AlertDialogTitle>
            <AlertDialogDescription>
              Copie todas as categorias e itens de uma propriedade para outra. 
              Os itens serão adicionados ao inventário existente na propriedade de destino.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Propriedade de Origem</Label>
              <Select value={sourcePropertyId} onValueChange={setSourcePropertyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map(property => (
                    <SelectItem 
                      key={property.id} 
                      value={property.id}
                      disabled={property.id === targetPropertyId}
                    >
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>

            <div className="space-y-2">
              <Label>Propriedade de Destino</Label>
              <Select value={targetPropertyId} onValueChange={setTargetPropertyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o destino" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map(property => (
                    <SelectItem 
                      key={property.id} 
                      value={property.id}
                      disabled={property.id === sourcePropertyId}
                    >
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {sourcePropertyId && targetPropertyId && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {properties.find(p => p.id === sourcePropertyId)?.name}
                  </span>
                  {' → '}
                  <span className="font-medium text-foreground">
                    {properties.find(p => p.id === targetPropertyId)?.name}
                  </span>
                </p>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={copying}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleCopyInventory();
              }}
              disabled={copying || !sourcePropertyId || !targetPropertyId}
            >
              {copying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Copiando...
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Inventário
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Apply Default Template Dialog */}
      <AlertDialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Aplicar Lista Padrão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Adicione um inventário pré-configurado com categorias e itens típicos de imóveis de aluguel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Propriedade de Destino</Label>
              <Select value={templateTargetPropertyId} onValueChange={setTemplateTargetPropertyId}>
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

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <ListChecks className="h-4 w-4" />
                Categorias incluídas:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {DEFAULT_INVENTORY_TEMPLATE.map((cat, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>{cat.name}</span>
                    <Badge variant="secondary" className="text-xs ml-auto">
                      {cat.items.length}
                    </Badge>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                Total: {DEFAULT_INVENTORY_TEMPLATE.length} categorias, {DEFAULT_INVENTORY_TEMPLATE.reduce((acc, cat) => acc + cat.items.length, 0)} itens
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={applyingTemplate}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleApplyDefaultTemplate();
              }}
              disabled={applyingTemplate || !templateTargetPropertyId}
              className="bg-primary hover:bg-primary/90"
            >
              {applyingTemplate ? (
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
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
};

export default Inventory;
