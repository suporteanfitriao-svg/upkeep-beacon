import { useState, useEffect, useRef } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/useUserRole';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChecklistManager } from '@/components/properties/ChecklistManager';
import { PasswordModeConfig } from '@/components/properties/PasswordModeConfig';
import { AdvancedRulesConfig } from '@/components/properties/AdvancedRulesConfig';
import { cn } from '@/lib/utils';
import { useImageCompression } from '@/hooks/useImageCompression';

interface Property {
  id: string;
  name: string;
  address: string | null;
  default_check_in_time: string | null;
  default_check_out_time: string | null;
  image_url: string | null;
  created_at: string;
}

interface ICalSource {
  id: string;
  property_id: string;
  ical_url: string;
  custom_name: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  reservations_count: number;
  created_at: string;
}

interface PropertyChecklist {
  id: string;
  property_id: string;
  name: string;
  items: any[];
  is_default: boolean;
  created_at: string;
}

export default function Properties() {
  const { role, loading: isLoadingRole } = useUserRole();
  const [properties, setProperties] = useState<Property[]>([]);
  const [icalSources, setIcalSources] = useState<Record<string, ICalSource[]>>({});
  const [propertyChecklists, setPropertyChecklists] = useState<PropertyChecklist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    default_check_in_time: '14:00',
    default_check_out_time: '11:00'
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { compressImage, isCompressing } = useImageCompression();
  
  const [icalDialogOpen, setIcalDialogOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [editingIcal, setEditingIcal] = useState<ICalSource | null>(null);
  const [icalFormData, setIcalFormData] = useState({
    ical_url: '',
    custom_name: ''
  });

  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const canManage = isAdmin || isManager;

  useEffect(() => {
    if (!isLoadingRole && role) {
      fetchProperties();
      fetchIcalSources();
      fetchChecklists();
    }
  }, [isLoadingRole, role]);

  const fetchProperties = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('properties')
      .select('id, name, address, default_check_in_time, default_check_out_time, image_url, created_at')
      .order('name', { ascending: true });

    if (error) {
      toast.error('Erro ao carregar propriedades');
      console.error(error);
    } else {
      setProperties(data || []);
    }
    setIsLoading(false);
  };

  const fetchIcalSources = async () => {
    const { data, error } = await supabase
      .from('property_ical_sources')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching iCal sources:', error);
      return;
    }

    const grouped: Record<string, ICalSource[]> = {};
    (data || []).forEach((source) => {
      if (!grouped[source.property_id]) {
        grouped[source.property_id] = [];
      }
      grouped[source.property_id].push(source);
    });
    setIcalSources(grouped);
  };

  const fetchChecklists = async () => {
    const { data, error } = await supabase
      .from('property_checklists')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching checklists:', error);
      return;
    }

    setPropertyChecklists((data || []).map(item => ({
      ...item,
      items: Array.isArray(item.items) ? item.items : []
    })));
  };

  const resetForm = () => {
    setFormData({ 
      name: '', 
      address: '', 
      default_check_in_time: '14:00',
      default_check_out_time: '11:00'
    });
    setEditingProperty(null);
    setImageFile(null);
    setImagePreview(null);
  };

  const resetIcalForm = () => {
    setIcalFormData({ ical_url: '', custom_name: '' });
    setEditingIcal(null);
    setSelectedPropertyId(null);
  };

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    setFormData({
      name: property.name,
      address: property.address || '',
      default_check_in_time: property.default_check_in_time?.slice(0, 5) || '14:00',
      default_check_out_time: property.default_check_out_time?.slice(0, 5) || '11:00'
    });
    setImagePreview(property.image_url);
    setImageFile(null);
    setDialogOpen(true);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato não suportado. Use JPG, PNG ou WebP.');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 8MB.');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadImage = async (propertyId: string): Promise<string | null> => {
    if (!imageFile) return null;

    try {
      const compressedBlob = await compressImage(imageFile);
      const fileName = `${propertyId}/${Date.now()}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(fileName, compressedBlob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('property-images')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const validateTimes = (checkIn: string, checkOut: string): boolean => {
    if (!checkIn || !checkOut) {
      toast.error('Horários de check-in e check-out são obrigatórios');
      return false;
    }
    
    const [inHours, inMinutes] = checkIn.split(':').map(Number);
    const [outHours, outMinutes] = checkOut.split(':').map(Number);
    
    const checkInMins = inHours * 60 + inMinutes;
    const checkOutMins = outHours * 60 + outMinutes;
    
    if (checkOutMins >= checkInMins) {
      toast.error('Check-out deve ser anterior ao check-in (hóspede sai antes do próximo entrar)');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    // Image is required for new properties
    if (!editingProperty && !imageFile) {
      toast.error('Imagem da propriedade é obrigatória');
      return;
    }

    if (!formData.default_check_in_time || !formData.default_check_out_time) {
      toast.error('Horários padrão de check-in e check-out são obrigatórios');
      return;
    }

    if (!validateTimes(formData.default_check_in_time, formData.default_check_out_time)) {
      return;
    }

    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      let teamMemberId: string | null = null;
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('team_member_id')
          .eq('id', user.id)
          .single();
        teamMemberId = profile?.team_member_id || null;
      }

      if (editingProperty) {
        // Upload new image if selected
        let imageUrl = editingProperty.image_url;
        if (imageFile) {
          imageUrl = await uploadImage(editingProperty.id);
        }

        const propertyData = {
          name: formData.name.trim(),
          address: formData.address.trim() || null,
          default_check_in_time: formData.default_check_in_time,
          default_check_out_time: formData.default_check_out_time,
          image_url: imageUrl
        };

        const oldCheckIn = editingProperty.default_check_in_time?.slice(0, 5);
        const oldCheckOut = editingProperty.default_check_out_time?.slice(0, 5);
        const timesChanged = oldCheckIn !== formData.default_check_in_time || 
                            oldCheckOut !== formData.default_check_out_time;

        const { error } = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', editingProperty.id);

        if (error) {
          toast.error('Erro ao atualizar propriedade');
          console.error(error);
          return;
        }

        if (timesChanged && teamMemberId) {
          await supabase.from('password_audit_logs').insert({
            property_id: editingProperty.id,
            team_member_id: teamMemberId,
            action: `alteracao_horario_propriedade:checkin:${oldCheckIn}->${formData.default_check_in_time},checkout:${oldCheckOut}->${formData.default_check_out_time}`
          });
        }

        toast.success('Propriedade atualizada com sucesso');
      } else {
        // Create property first to get the ID
        const propertyData = {
          name: formData.name.trim(),
          address: formData.address.trim() || null,
          default_check_in_time: formData.default_check_in_time,
          default_check_out_time: formData.default_check_out_time
        };

        const { data: newProperty, error } = await supabase
          .from('properties')
          .insert(propertyData)
          .select('id')
          .single();

        if (error) {
          toast.error('Erro ao criar propriedade');
          console.error(error);
          return;
        }

        // Upload image and update property
        if (newProperty && imageFile) {
          const imageUrl = await uploadImage(newProperty.id);
          if (imageUrl) {
            await supabase
              .from('properties')
              .update({ image_url: imageUrl })
              .eq('id', newProperty.id);
          }
        }

        if (teamMemberId && newProperty) {
          await supabase.from('password_audit_logs').insert({
            property_id: newProperty.id,
            team_member_id: teamMemberId,
            action: `configuracao_horario_propriedade:checkin:${formData.default_check_in_time},checkout:${formData.default_check_out_time}`
          });
        }

        toast.success('Propriedade criada com sucesso');
      }

      setDialogOpen(false);
      resetForm();
      fetchProperties();
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Erro ao salvar propriedade');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir propriedade');
      console.error(error);
      return;
    }

    toast.success('Propriedade excluída com sucesso');
    fetchProperties();
    fetchIcalSources();
  };

  const handleAddIcal = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setIcalFormData({ ical_url: '', custom_name: '' });
    setEditingIcal(null);
    setIcalDialogOpen(true);
  };

  const handleEditIcal = (source: ICalSource) => {
    setSelectedPropertyId(source.property_id);
    setEditingIcal(source);
    setIcalFormData({
      ical_url: source.ical_url,
      custom_name: source.custom_name || ''
    });
    setIcalDialogOpen(true);
  };

  const handleSubmitIcal = async () => {
    if (!icalFormData.ical_url.trim()) {
      toast.error('URL do iCal é obrigatório');
      return;
    }

    const sourceData = {
      property_id: selectedPropertyId!,
      ical_url: icalFormData.ical_url.trim(),
      custom_name: icalFormData.custom_name.trim() || null
    };

    if (editingIcal) {
      const { error } = await supabase
        .from('property_ical_sources')
        .update(sourceData)
        .eq('id', editingIcal.id);

      if (error) {
        toast.error('Erro ao atualizar anúncio');
        console.error(error);
        return;
      }
      toast.success('Anúncio atualizado com sucesso');
    } else {
      const { error } = await supabase
        .from('property_ical_sources')
        .insert(sourceData);

      if (error) {
        toast.error('Erro ao adicionar anúncio');
        console.error(error);
        return;
      }
      toast.success('Anúncio adicionado com sucesso');
    }

    setIcalDialogOpen(false);
    resetIcalForm();
    fetchIcalSources();
  };

  const handleDeleteIcal = async (sourceId: string) => {
    const { error } = await supabase
      .from('property_ical_sources')
      .delete()
      .eq('id', sourceId);

    if (error) {
      toast.error('Erro ao excluir anúncio');
      console.error(error);
      return;
    }

    toast.success('Anúncio excluído com sucesso');
    fetchIcalSources();
  };

  const handleSyncAll = async () => {
    setIsSyncing('all');
    try {
      const { data, error } = await supabase.functions.invoke('sync-ical-reservations', {
        body: {}
      });

      if (error) throw error;

      toast.success(`Sincronização concluída: ${data.synced || 0} reservas processadas`);
      fetchIcalSources();
    } catch (error: any) {
      toast.error('Erro na sincronização: ' + (error.message || 'Erro desconhecido'));
      console.error(error);
    } finally {
      setIsSyncing(null);
    }
  };

  const handleSyncSource = async (sourceId: string) => {
    setIsSyncing(sourceId);
    try {
      const { data, error } = await supabase.functions.invoke('sync-ical-reservations', {
        body: { sourceId }
      });

      if (error) throw error;

      toast.success(`Sincronização concluída: ${data.synced || 0} reservas processadas`);
      fetchIcalSources();
    } catch (error: any) {
      toast.error('Erro na sincronização: ' + (error.message || 'Erro desconhecido'));
      console.error(error);
    } finally {
      setIsSyncing(null);
    }
  };

  const getTotalIcalSources = () => {
    return Object.values(icalSources).reduce((acc, sources) => acc + sources.length, 0);
  };

  const getLastSyncTime = () => {
    let lastSync: Date | null = null;
    Object.values(icalSources).flat().forEach(source => {
      if (source.last_sync_at) {
        const syncDate = new Date(source.last_sync_at);
        if (!lastSync || syncDate > lastSync) {
          lastSync = syncDate;
        }
      }
    });
    return lastSync;
  };

  const getErrorCount = () => {
    return Object.values(icalSources).flat().filter(s => s.last_error).length;
  };

  if (isLoadingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const lastSync = getLastSyncTime();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1">
          {/* Header */}
          <header className="sticky top-0 z-20 flex items-center justify-between bg-background/90 px-4 py-4 backdrop-blur-md border-b border-border md:px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="rounded-full p-2 hover:bg-muted transition-colors" />
              <div className="flex flex-col">
                <h1 className="text-lg font-bold tracking-tight text-foreground">Propriedades</h1>
                <span className="text-xs text-muted-foreground">{properties.length} imóveis cadastrados</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncAll}
                disabled={isSyncing !== null}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-muted active:scale-[0.98] disabled:opacity-50"
              >
                <span className={cn("material-symbols-outlined text-[18px]", isSyncing === 'all' && 'animate-spin')}>sync</span>
                <span className="hidden sm:inline">Sincronizar</span>
              </button>
              {canManage && (
                <Dialog open={dialogOpen} onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (!open) resetForm();
                }}>
                  <DialogTrigger asChild>
                    <button className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]">
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      <span className="hidden sm:inline">Nova Propriedade</span>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-lg font-bold">
                        {editingProperty ? 'Editar Propriedade' : 'Nova Propriedade'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {/* Image Upload */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Imagem da Propriedade {!editingProperty && '*'}
                        </Label>
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className={cn(
                            "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-colors overflow-hidden",
                            imagePreview 
                              ? "border-primary/50 bg-primary/5" 
                              : "border-border hover:border-primary/50 hover:bg-muted/50",
                            "h-40"
                          )}
                        >
                          {imagePreview ? (
                            <>
                              <img 
                                src={imagePreview} 
                                alt="Preview" 
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                <span className="material-symbols-outlined text-white text-[32px]">edit</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-muted-foreground text-[32px] mb-2">add_photo_alternate</span>
                              <p className="text-sm text-muted-foreground">Clique para adicionar imagem</p>
                              <p className="text-xs text-muted-foreground">JPG, PNG ou WebP (máx. 8MB)</p>
                            </>
                          )}
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium">Nome *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Ex: Apartamento Centro"
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address" className="text-sm font-medium">Endereço</Label>
                        <Input
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder="Ex: Rua das Flores, 123"
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <span className="material-symbols-outlined text-primary text-[18px]">schedule</span>
                          <span>Horários Padrão *</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Check-out deve ser antes do check-in.
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label htmlFor="check_out_time" className="text-xs">Check-out *</Label>
                            <Input
                              id="check_out_time"
                              type="time"
                              value={formData.default_check_out_time}
                              onChange={(e) => setFormData({ ...formData, default_check_out_time: e.target.value })}
                              required
                              className="rounded-xl"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="check_in_time" className="text-xs">Check-in *</Label>
                            <Input
                              id="check_in_time"
                              type="time"
                              value={formData.default_check_in_time}
                              onChange={(e) => setFormData({ ...formData, default_check_in_time: e.target.value })}
                              required
                              className="rounded-xl"
                            />
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={handleSubmit}
                        disabled={isUploading || isCompressing}
                        className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {(isUploading || isCompressing) && (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                        )}
                        {editingProperty ? 'Salvar Alterações' : 'Criar Propriedade'}
                      </button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </header>

          <main className="p-4 md:p-6 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <span className="material-symbols-outlined text-primary text-[20px]">link</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{getTotalIcalSources()}</p>
                    <p className="text-xs text-muted-foreground">Anúncios</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-status-completed/10">
                    <span className="material-symbols-outlined text-status-completed text-[20px]">check_circle</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {lastSync ? format(lastSync, "dd/MM HH:mm", { locale: ptBR }) : 'Nunca'}
                    </p>
                    <p className="text-xs text-muted-foreground">Última Sync</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    getErrorCount() > 0 ? "bg-destructive/10" : "bg-muted"
                  )}>
                    <span className={cn(
                      "material-symbols-outlined text-[20px]",
                      getErrorCount() > 0 ? "text-destructive" : "text-muted-foreground"
                    )}>error</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{getErrorCount()}</p>
                    <p className="text-xs text-muted-foreground">Erros</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Properties List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : properties.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                  <span className="material-symbols-outlined text-muted-foreground text-[32px]">home</span>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Nenhuma propriedade</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                  Adicione sua primeira propriedade para começar a sincronizar reservas.
                </p>
                {canManage && (
                  <button 
                    onClick={() => setDialogOpen(true)}
                    className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Nova Propriedade
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {properties.map((property) => {
                  const propertySources = icalSources[property.id] || [];
                  const propertyChecklistCount = propertyChecklists.filter(c => c.property_id === property.id).length;
                  
                  return (
                    <div 
                      key={property.id} 
                      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md"
                    >
                      {/* Property Header */}
                      <div className="flex items-start justify-between gap-4 p-4 border-b border-border bg-muted/30">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                            <span className="material-symbols-outlined text-primary text-[22px]">home</span>
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-foreground truncate">{property.name}</h3>
                            {property.address && (
                              <p className="text-sm text-muted-foreground truncate">{property.address}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">logout</span>
                                {property.default_check_out_time?.slice(0, 5) || '11:00'}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">login</span>
                                {property.default_check_in_time?.slice(0, 5) || '14:00'}
                              </span>
                            </div>
                          </div>
                        </div>
                        {canManage && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleEdit(property)}
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            >
                              <span className="material-symbols-outlined text-[20px]">edit</span>
                            </button>
                            {isAdmin && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button className="flex h-9 w-9 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir propriedade?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação não pode ser desfeita. Todas as reservas e schedules associados serão removidos.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(property.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Tabs Content */}
                      <div className="p-4">
                        <Tabs defaultValue="ical" className="w-full">
                          <TabsList className={cn(
                            "grid w-full mb-4 bg-muted/50 rounded-xl p-1",
                            canManage ? 'grid-cols-4' : 'grid-cols-2'
                          )}>
                            <TabsTrigger value="ical" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
                              <span className="material-symbols-outlined text-[14px] mr-1">link</span>
                              Anúncios ({propertySources.length})
                            </TabsTrigger>
                            <TabsTrigger value="checklist" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
                              <span className="material-symbols-outlined text-[14px] mr-1">checklist</span>
                              Checklists ({propertyChecklistCount})
                            </TabsTrigger>
                            {canManage && (
                              <TabsTrigger value="password" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
                                <span className="material-symbols-outlined text-[14px] mr-1">key</span>
                                Senha
                              </TabsTrigger>
                            )}
                            {canManage && (
                              <TabsTrigger value="rules" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
                                <span className="material-symbols-outlined text-[14px] mr-1">tune</span>
                                Regras
                              </TabsTrigger>
                            )}
                          </TabsList>
                          
                          <TabsContent value="ical" className="mt-0">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-foreground">Anúncios Vinculados</p>
                                {canManage && (
                                  <button
                                    onClick={() => handleAddIcal(property.id)}
                                    className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">add</span>
                                    Adicionar iCal
                                  </button>
                                )}
                              </div>
                              
                              {propertySources.length > 0 ? (
                                <div className="space-y-2">
                                  {propertySources.map((source) => (
                                    <div
                                      key={source.id}
                                      className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border/50"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <p className="text-sm font-medium text-foreground truncate">
                                            {source.custom_name || 'Anúncio sem nome'}
                                          </p>
                                          {source.last_error ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                                              <span className="material-symbols-outlined text-[12px]">error</span>
                                              Erro
                                            </span>
                                          ) : source.last_sync_at ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-status-completed/10 px-2 py-0.5 text-[10px] font-medium text-status-completed">
                                              <span className="material-symbols-outlined text-[12px]">check</span>
                                              Sincronizado
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                              Pendente
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                          <span>{source.reservations_count} reservas</span>
                                          {source.last_sync_at && (
                                            <span>
                                              Atualizado: {format(new Date(source.last_sync_at), "dd/MM HH:mm", { locale: ptBR })}
                                            </span>
                                          )}
                                        </div>
                                        {source.last_error && (
                                          <p className="text-xs text-destructive mt-1 truncate">
                                            {source.last_error}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1 ml-2">
                                        <button
                                          onClick={() => handleSyncSource(source.id)}
                                          disabled={isSyncing !== null}
                                          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                                        >
                                          <span className={cn(
                                            "material-symbols-outlined text-[18px]",
                                            isSyncing === source.id && 'animate-spin'
                                          )}>sync</span>
                                        </button>
                                        {canManage && (
                                          <>
                                            <button
                                              onClick={() => handleEditIcal(source)}
                                              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                            >
                                              <span className="material-symbols-outlined text-[18px]">edit</span>
                                            </button>
                                            <AlertDialog>
                                              <AlertDialogTrigger asChild>
                                                <button className="flex h-8 w-8 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                              </AlertDialogTrigger>
                                              <AlertDialogContent>
                                                <AlertDialogHeader>
                                                  <AlertDialogTitle>Excluir anúncio?</AlertDialogTitle>
                                                  <AlertDialogDescription>
                                                    Esta ação não pode ser desfeita. O anúncio será removido e não será mais sincronizado.
                                                  </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                  <AlertDialogAction
                                                    onClick={() => handleDeleteIcal(source.id)}
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                  >
                                                    Excluir
                                                  </AlertDialogAction>
                                                </AlertDialogFooter>
                                              </AlertDialogContent>
                                            </AlertDialog>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                                    <span className="material-symbols-outlined text-muted-foreground text-[24px]">link_off</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    Nenhum anúncio configurado.
                                  </p>
                                </div>
                              )}
                            </div>
                          </TabsContent>
                          
                          <TabsContent value="checklist" className="mt-0">
                            {canManage ? (
                              <ChecklistManager
                                propertyId={property.id}
                                propertyName={property.name}
                                allChecklists={propertyChecklists}
                                onChecklistsChange={fetchChecklists}
                              />
                            ) : (
                              <p className="text-sm text-muted-foreground py-4 text-center">
                                {propertyChecklistCount} checklist(s) configurado(s).
                              </p>
                            )}
                          </TabsContent>

                          {canManage && (
                            <TabsContent value="password" className="mt-0">
                              <PasswordModeConfig 
                                propertyId={property.id} 
                                propertyName={property.name} 
                              />
                            </TabsContent>
                          )}

                          {canManage && (
                            <TabsContent value="rules" className="mt-0">
                              <AdvancedRulesConfig 
                                propertyId={property.id} 
                                propertyName={property.name} 
                              />
                            </TabsContent>
                          )}
                        </Tabs>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>

          {/* iCal Source Dialog */}
          <Dialog open={icalDialogOpen} onOpenChange={(open) => {
            setIcalDialogOpen(open);
            if (!open) resetIcalForm();
          }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">
                  {editingIcal ? 'Editar Anúncio' : 'Adicionar Anúncio'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="custom_name" className="text-sm font-medium">Nome do Anúncio</Label>
                  <Input
                    id="custom_name"
                    value={icalFormData.custom_name}
                    onChange={(e) => setIcalFormData({ ...icalFormData, custom_name: e.target.value })}
                    placeholder="Ex: Apartamento Airbnb"
                    className="rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">
                    Nome para identificar este anúncio
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ical_url" className="text-sm font-medium">URL do iCal *</Label>
                  <Input
                    id="ical_url"
                    value={icalFormData.ical_url}
                    onChange={(e) => setIcalFormData({ ...icalFormData, ical_url: e.target.value })}
                    placeholder="https://www.airbnb.com/calendar/ical/..."
                    className="rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">
                    Encontre em: Airbnb → Seu anúncio → Disponibilidade → Sincronização
                  </p>
                </div>
                <button 
                  onClick={handleSubmitIcal} 
                  className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
                >
                  {editingIcal ? 'Salvar Alterações' : 'Adicionar Anúncio'}
                </button>
              </div>
            </DialogContent>
          </Dialog>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
