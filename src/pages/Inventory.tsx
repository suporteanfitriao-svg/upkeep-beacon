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
  ChevronRight, Search, Box, Hash, Building2, Copy, ArrowRight, ListChecks, Sparkles,
  Camera, X, Image as ImageIcon, Clock, Images, FileText, History, GripVertical
} from 'lucide-react';
import { InventoryPhotoGallery } from '@/components/inventory/InventoryPhotoGallery';
import { InventoryPDFReport } from '@/components/inventory/InventoryPDFReport';
import { InventoryItemHistory } from '@/components/inventory/InventoryItemHistory';
import { InventoryTemplateEditor } from '@/components/inventory/InventoryTemplateEditor';
import { SortableCategory } from '@/components/inventory/SortableCategory';
import { SortableItem, SortableItemMobile } from '@/components/inventory/SortableItem';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useInventoryPhotoUpload } from '@/hooks/useInventoryPhotoUpload';
import { useInventoryItemHistory } from '@/hooks/useInventoryItemHistory';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

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

interface InventoryPhoto {
  url: string;
  taken_at?: string;
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
  photo_url?: string;
  photo_taken_at?: string;
  photos?: InventoryPhoto[];
}

const Inventory = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isAdmin, isManager, isCleaner } = useUserRole();
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
    details: '',
  });
  const [savingItem, setSavingItem] = useState(false);
  const [existingPhotos, setExistingPhotos] = useState<InventoryPhoto[]>([]);
  const [pendingPhotoFiles, setPendingPhotoFiles] = useState<{ file: File; preview: string }[]>([]);
  const [photosToDelete, setPhotosToDelete] = useState<string[]>([]);
  const MAX_PHOTOS = 5;

  // Photo upload hook
  const { compressAndUploadWithTimestamp, deletePhoto, isUploading } = useInventoryPhotoUpload();
  const { recordHistory } = useInventoryItemHistory();

  // Copy inventory dialog
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [sourcePropertyId, setSourcePropertyId] = useState<string>('');
  const [targetPropertyId, setTargetPropertyId] = useState<string>('');
  const [copying, setCopying] = useState(false);

  // Default template dialog
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);
  const [templateTargetPropertyId, setTemplateTargetPropertyId] = useState<string>('');
  
  // Photo gallery dialog
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);

  // PDF Report dialog
  const [pdfReportOpen, setPdfReportOpen] = useState(false);

  // Item history dialog
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItemId, setHistoryItemId] = useState<string | null>(null);
  const [historyItemName, setHistoryItemName] = useState('');


  // DnD sensors for touch and pointer
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
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
        } else if (selectedCategory) {
          // Update selectedCategory reference with fresh data
          const updatedCategory = mappedCategories.find(c => c.id === selectedCategory.id);
          if (updatedCategory) {
            setSelectedCategory(updatedCategory);
          }
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
        details: item.details || '',
      });
      // Load existing photos from photos array, fallback to legacy single photo
      const photos: InventoryPhoto[] = Array.isArray(item.photos) && item.photos.length > 0
        ? item.photos
        : item.photo_url 
          ? [{ url: item.photo_url, taken_at: item.photo_taken_at }]
          : [];
      setExistingPhotos(photos);
    } else {
      setEditingItem(null);
      setItemForm({ name: '', quantity: 1, unit: 'unidade', details: '' });
      setExistingPhotos([]);
    }
    setPendingPhotoFiles([]);
    setPhotosToDelete([]);
    setItemDialogOpen(true);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalPhotos = existingPhotos.length - photosToDelete.length + pendingPhotoFiles.length;
    const remaining = MAX_PHOTOS - totalPhotos;
    
    if (remaining <= 0) {
      toast.error(`Máximo de ${MAX_PHOTOS} fotos por item`);
      return;
    }

    const filesToAdd = files.slice(0, remaining);
    
    filesToAdd.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPendingPhotoFiles(prev => [...prev, { file, preview: event.target?.result as string }]);
      };
      reader.readAsDataURL(file);
    });
    
    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  const handleRemoveExistingPhoto = (url: string) => {
    setPhotosToDelete(prev => [...prev, url]);
  };

  const handleRemovePendingPhoto = (index: number) => {
    setPendingPhotoFiles(prev => prev.filter((_, i) => i !== index));
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
      // Build final photos array
      let finalPhotos: InventoryPhoto[] = existingPhotos.filter(p => !photosToDelete.includes(p.url));

      // Delete removed photos from storage
      for (const url of photosToDelete) {
        await deletePhoto(url);
      }

      const itemId = editingItem?.id;

      if (editingItem) {
        // Upload new photos
        for (const pending of pendingPhotoFiles) {
          const result = await compressAndUploadWithTimestamp(pending.file, editingItem.id);
          finalPhotos.push({ url: result.url, taken_at: result.takenAt.toISOString() });
        }

        const { error } = await supabase
          .from('inventory_items')
          .update({
            name: itemForm.name.trim(),
            quantity: itemForm.quantity,
            unit: itemForm.unit.trim() || null,
            details: itemForm.details.trim() || null,
            photo_url: finalPhotos[0]?.url || null,
            photo_taken_at: finalPhotos[0]?.taken_at || null,
            photos: finalPhotos as any,
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success('Item atualizado!');
      } else {
        // Create new item first
        const { data: newItem, error } = await supabase
          .from('inventory_items')
          .insert({
            category_id: selectedCategory.id,
            name: itemForm.name.trim(),
            quantity: itemForm.quantity,
            unit: itemForm.unit.trim() || null,
            details: itemForm.details.trim() || null,
            sort_order: selectedCategory.items.length,
          })
          .select()
          .single();

        if (error) throw error;

        // Upload photos for the new item
        if (pendingPhotoFiles.length > 0 && newItem) {
          for (const pending of pendingPhotoFiles) {
            const result = await compressAndUploadWithTimestamp(pending.file, newItem.id);
            finalPhotos.push({ url: result.url, taken_at: result.takenAt.toISOString() });
          }

          const { error: updateError } = await supabase
            .from('inventory_items')
            .update({
              photo_url: finalPhotos[0]?.url || null,
              photo_taken_at: finalPhotos[0]?.taken_at || null,
              photos: finalPhotos as any,
            })
            .eq('id', newItem.id);

          if (updateError) {
            console.error('Error updating photos:', updateError);
            toast.warning('Item criado, mas houve erro ao salvar as fotos');
          }
        }
        
        toast.success('Item criado!');
      }

      setItemDialogOpen(false);
      setPendingPhotoFiles([]);
      setPhotosToDelete([]);
      setExistingPhotos([]);
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

  // Handle category drag end
  const handleCategoryDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex(c => c.id === active.id);
    const newIndex = categories.findIndex(c => c.id === over.id);

    if (oldIndex !== newIndex) {
      const newCategories = arrayMove(categories, oldIndex, newIndex);
      setCategories(newCategories);

      // Update sort_order in database
      try {
        const updates = newCategories.map((cat, idx) => ({
          id: cat.id,
          sort_order: idx,
        }));

        for (const update of updates) {
          await supabase
            .from('inventory_categories')
            .update({ sort_order: update.sort_order })
            .eq('id', update.id);
        }
      } catch (error) {
        console.error('Error updating category order:', error);
        toast.error('Erro ao reordenar categorias');
        fetchInventory(); // Revert on error
      }
    }
  };

  // Handle item drag end
  const handleItemDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !selectedCategory) return;

    const oldIndex = selectedCategory.items.findIndex(i => i.id === active.id);
    const newIndex = selectedCategory.items.findIndex(i => i.id === over.id);

    if (oldIndex !== newIndex) {
      const newItems = arrayMove(selectedCategory.items, oldIndex, newIndex);
      
      // Update local state
      setCategories(prev => prev.map(cat =>
        cat.id === selectedCategory.id ? { ...cat, items: newItems } : cat
      ));
      setSelectedCategory({ ...selectedCategory, items: newItems });

      // Update sort_order in database
      try {
        const updates = newItems.map((item, idx) => ({
          id: item.id,
          sort_order: idx,
        }));

        for (const update of updates) {
          await supabase
            .from('inventory_items')
            .update({ sort_order: update.sort_order })
            .eq('id', update.id);
        }
      } catch (error) {
        console.error('Error updating item order:', error);
        toast.error('Erro ao reordenar itens');
        fetchInventory(); // Revert on error
      }
    }
  };

  // Handle opening history dialog
  const handleOpenHistory = (itemId: string, itemName: string) => {
    setHistoryItemId(itemId);
    setHistoryItemName(itemName);
    setHistoryOpen(true);
  };

  // Filter items based on search
  const filteredItems = selectedCategory?.items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.details?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Global search across all categories
  const globalSearchResults = searchTerm.trim() ? categories.flatMap(cat =>
    cat.items
      .filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.details?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .map(item => ({ ...item, categoryName: cat.name, categoryId: cat.id }))
  ) : [];

  if (loading && categories.length === 0) {
    return (
      <SidebarProvider>
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        <SidebarInset className="w-full">
          <DashboardHeader title="Inventário" subtitle="Gerencie itens e quantidades" />
          <main className="flex-1 p-6 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="hidden md:block">
        <AppSidebar />
      </div>
      <SidebarInset className="w-full">
        <DashboardHeader title="Inventário" subtitle="Gerencie itens e quantidades" />
        <main className={`flex-1 p-4 sm:p-6 ${isMobile ? 'pb-28' : ''}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
                <Package className="h-5 w-5 sm:h-6 sm:w-6" />
                Inventário
              </h1>
              <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
                Gerencie espaços, itens e quantidades do seu inventário
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Global Search Field */}
              <div className="relative w-full sm:w-auto order-first sm:order-none">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar item..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-[200px] lg:w-[250px]"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground hidden sm:block" />
                <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                  <SelectTrigger className="w-[160px] sm:w-[200px]">
                    <SelectValue placeholder="Filtrar" />
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
                size={isMobile ? "icon" : "default"}
                onClick={() => setGalleryOpen(true)}
                disabled={categories.length === 0}
              >
                <Images className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Galeria</span>
              </Button>
              <Button 
                variant="outline" 
                size={isMobile ? "icon" : "default"}
                onClick={() => setPdfReportOpen(true)}
                disabled={categories.length === 0}
              >
                <FileText className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
              <Button 
                variant="outline" 
                size={isMobile ? "icon" : "default"}
                onClick={() => setTemplateEditorOpen(true)}
                disabled={properties.length === 0}
                className="text-primary border-primary/30 hover:bg-primary/10"
              >
                <Sparkles className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Lista Padrão</span>
              </Button>
              <Button 
                variant="outline"
                size={isMobile ? "icon" : "default"} 
                onClick={() => setCopyDialogOpen(true)}
                disabled={properties.length < 2}
              >
                <Copy className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Copiar</span>
              </Button>
              <Button onClick={() => handleOpenCategoryDialog()} size={isMobile ? "icon" : "default"}>
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Nova Categoria</span>
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
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleCategoryDragEnd}
                >
                  <SortableContext
                    items={categories.map(c => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
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
                          <SortableCategory
                            key={category.id}
                            id={category.id}
                            name={category.name}
                            propertyName={getPropertyName(category.property_id)}
                            itemCount={category.items.length}
                            isSelected={selectedCategory?.id === category.id}
                            onSelect={() => setSelectedCategory(category)}
                            onEdit={() => handleOpenCategoryDialog(category)}
                            onDelete={() => handleDeleteCategory(category.id)}
                          />
                        ))
                      )}
                    </div>
                  </SortableContext>
                </DndContext>
              </CardContent>
            </Card>

            {/* Items main content */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Box className="h-5 w-5" />
                      {searchTerm.trim() 
                        ? `Resultados para "${searchTerm}"`
                        : selectedCategory 
                          ? selectedCategory.name 
                          : 'Selecione uma categoria'
                      }
                    </CardTitle>
                    {!searchTerm.trim() && selectedCategory && (
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
                    {searchTerm.trim() && (
                      <CardDescription className="mt-1">
                        {globalSearchResults.length} item(ns) encontrado(s) em todas as categorias
                      </CardDescription>
                    )}
                  </div>
                  {selectedCategory && !searchTerm.trim() && (
                    <Button onClick={() => handleOpenItemDialog()} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Item
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Global search results */}
                {searchTerm.trim() ? (
                  globalSearchResults.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum item encontrado para "{searchTerm}"</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setSearchTerm('')}
                      >
                        Limpar busca
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Group results by category */}
                      {Array.from(new Set(globalSearchResults.map(r => r.categoryId))).map(catId => {
                        const catResults = globalSearchResults.filter(r => r.categoryId === catId);
                        const catName = catResults[0]?.categoryName || 'Categoria';
                        return (
                          <div key={catId} className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                              <FolderOpen className="h-4 w-4" />
                              {catName}
                              <Badge variant="secondary" className="text-xs">
                                {catResults.length}
                              </Badge>
                            </div>
                            {isMobile ? (
                              <div className="space-y-2">
                                {catResults.map(item => (
                                  <SortableItemMobile
                                    key={item.id}
                                    id={item.id}
                                    name={item.name}
                                    quantity={item.quantity}
                                    unit={item.unit}
                                    details={item.details}
                                    photoUrl={item.photo_url}
                                    photoTakenAt={item.photo_taken_at}
                                    photoCount={Array.isArray(item.photos) ? item.photos.length : (item.photo_url ? 1 : 0)}
                                    onEdit={() => handleOpenItemDialog(item)}
                                    onDelete={() => handleDeleteItem(item.id)}
                                    onPhotoClick={() => item.photo_url && window.open(item.photo_url, '_blank')}
                                    onHistoryClick={() => handleOpenHistory(item.id, item.name)}
                                  />
                                ))}
                              </div>
                            ) : (
                              <Table>
                                <TableBody>
                                  {catResults.map(item => (
                                    <SortableItem
                                      key={item.id}
                                      id={item.id}
                                      name={item.name}
                                      quantity={item.quantity}
                                      unit={item.unit}
                                      details={item.details}
                                      photoUrl={item.photo_url}
                                      photoTakenAt={item.photo_taken_at}
                                      photoCount={Array.isArray(item.photos) ? item.photos.length : (item.photo_url ? 1 : 0)}
                                      onEdit={() => handleOpenItemDialog(item)}
                                      onDelete={() => handleDeleteItem(item.id)}
                                      onPhotoClick={() => item.photo_url && window.open(item.photo_url, '_blank')}
                                      onHistoryClick={() => handleOpenHistory(item.id, item.name)}
                                    />
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : !selectedCategory ? (
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
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleItemDragEnd}
                  >
                    <SortableContext
                      items={filteredItems.map(i => i.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {isMobile ? (
                        // Mobile: Cards with drag handles
                        <div className="space-y-2">
                          {filteredItems.map(item => (
                            <SortableItemMobile
                              key={item.id}
                              id={item.id}
                              name={item.name}
                              quantity={item.quantity}
                              unit={item.unit}
                              details={item.details}
                              photoUrl={item.photo_url}
                              photoTakenAt={item.photo_taken_at}
                              photoCount={Array.isArray(item.photos) ? item.photos.length : (item.photo_url ? 1 : 0)}
                              onEdit={() => handleOpenItemDialog(item)}
                              onDelete={() => handleDeleteItem(item.id)}
                              onPhotoClick={() => item.photo_url && window.open(item.photo_url, '_blank')}
                              onHistoryClick={() => handleOpenHistory(item.id, item.name)}
                            />
                          ))}
                        </div>
                      ) : (
                        // Desktop: Table with drag handles
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10"></TableHead>
                              <TableHead>Item</TableHead>
                              <TableHead className="w-[100px] text-center">Qtd</TableHead>
                              <TableHead className="w-[100px]">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredItems.map(item => (
                              <SortableItem
                                key={item.id}
                                id={item.id}
                                name={item.name}
                                quantity={item.quantity}
                                unit={item.unit}
                                details={item.details}
                                photoUrl={item.photo_url}
                                photoTakenAt={item.photo_taken_at}
                                photoCount={Array.isArray(item.photos) ? item.photos.length : (item.photo_url ? 1 : 0)}
                                onEdit={() => handleOpenItemDialog(item)}
                                onDelete={() => handleDeleteItem(item.id)}
                                onPhotoClick={() => item.photo_url && window.open(item.photo_url, '_blank')}
                                onHistoryClick={() => handleOpenHistory(item.id, item.name)}
                              />
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </SortableContext>
                  </DndContext>
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
                rows={2}
              />
            </div>

            {/* Photo upload section */}
            <div className="space-y-2">
              <Label>Fotos (opcional - máx. {MAX_PHOTOS})</Label>
              <p className="text-xs text-muted-foreground">
                As fotos serão compactadas e receberão carimbo de data/hora automaticamente.
              </p>
              
              {/* Existing + pending photos grid */}
              <div className="flex flex-wrap gap-2">
                {/* Existing photos (not marked for deletion) */}
                {existingPhotos
                  .filter(p => !photosToDelete.includes(p.url))
                  .map((photo, idx) => (
                    <div key={`existing-${idx}`} className="relative">
                      <img 
                        src={photo.url} 
                        alt={`Foto ${idx + 1}`} 
                        className="h-24 w-24 rounded-lg object-cover border"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={() => handleRemoveExistingPhoto(photo.url)}
                        type="button"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      {photo.taken_at && (
                        <div className="absolute bottom-1 left-1 bg-background/80 text-[9px] px-1 py-0.5 rounded flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {format(new Date(photo.taken_at), "dd/MM HH:mm", { locale: ptBR })}
                        </div>
                      )}
                    </div>
                  ))}

                {/* Pending (new) photos */}
                {pendingPhotoFiles.map((pending, idx) => (
                  <div key={`pending-${idx}`} className="relative">
                    <img 
                      src={pending.preview} 
                      alt={`Nova ${idx + 1}`} 
                      className="h-24 w-24 rounded-lg object-cover border"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={() => handleRemovePendingPhoto(idx)}
                      type="button"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <div className="absolute bottom-1 left-1 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                      Nova
                    </div>
                  </div>
                ))}

                {/* Add photo buttons (show when under max) */}
                {(existingPhotos.length - photosToDelete.length + pendingPhotoFiles.length) < MAX_PHOTOS && (
                  <>
                    <label className="flex flex-col items-center justify-center h-24 w-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors border-primary/30">
                      <Camera className="h-5 w-5 text-primary mb-0.5" />
                      <span className="text-[10px] text-primary font-medium">Câmera</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                    </label>
                    <label className="flex flex-col items-center justify-center h-24 w-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <ImageIcon className="h-5 w-5 text-muted-foreground mb-0.5" />
                      <span className="text-[10px] text-muted-foreground">Galeria</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        multiple
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                    </label>
                  </>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)} disabled={isUploading}>
              Cancelar
            </Button>
            <Button onClick={handleSaveItem} disabled={savingItem || isUploading}>
              {savingItem || isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isUploading ? 'Enviando foto...' : 'Salvando...'}
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

      {/* Photo Gallery */}
      <InventoryPhotoGallery
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        categories={categories}
        propertyName={selectedPropertyId !== 'all' ? properties.find(p => p.id === selectedPropertyId)?.name : undefined}
      />

      {/* PDF Report */}
      <InventoryPDFReport
        open={pdfReportOpen}
        onOpenChange={setPdfReportOpen}
        properties={properties}
        categories={categories}
        selectedPropertyId={selectedPropertyId}
      />

      {/* Item History */}
      <InventoryItemHistory
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        itemId={historyItemId}
        itemName={historyItemName}
      />

      {/* Template Editor */}
      <InventoryTemplateEditor
        open={templateEditorOpen}
        onOpenChange={setTemplateEditorOpen}
        properties={properties}
        defaultTemplate={DEFAULT_INVENTORY_TEMPLATE}
        onSuccess={fetchInventory}
      />

      {/* MENU INFERIOR: Gerenciado pelo MobileAdminLayout - não renderiza aqui */}
    </SidebarProvider>
  );
};

export default Inventory;
