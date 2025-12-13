import { useState, useEffect } from 'react';
import { Plus, RefreshCw, Home, Pencil, Trash2, Clock, AlertCircle, CheckCircle2, Link2 } from 'lucide-react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/useUserRole';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Property {
  id: string;
  name: string;
  address: string | null;
  default_check_in_time: string | null;
  default_check_out_time: string | null;
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

export default function Properties() {
  const { role, loading: isLoadingRole } = useUserRole();
  const [properties, setProperties] = useState<Property[]>([]);
  const [icalSources, setIcalSources] = useState<Record<string, ICalSource[]>>({});
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
  
  // iCal source form
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
    }
  }, [isLoadingRole, role]);

  const fetchProperties = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('properties')
      .select('id, name, address, default_check_in_time, default_check_out_time, created_at')
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

  const resetForm = () => {
    setFormData({ 
      name: '', 
      address: '', 
      default_check_in_time: '14:00',
      default_check_out_time: '11:00'
    });
    setEditingProperty(null);
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
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    const propertyData = {
      name: formData.name.trim(),
      address: formData.address.trim() || null,
      default_check_in_time: formData.default_check_in_time || '14:00',
      default_check_out_time: formData.default_check_out_time || '11:00'
    };

    if (editingProperty) {
      const { error } = await supabase
        .from('properties')
        .update(propertyData)
        .eq('id', editingProperty.id);

      if (error) {
        toast.error('Erro ao atualizar propriedade');
        console.error(error);
        return;
      }
      toast.success('Propriedade atualizada com sucesso');
    } else {
      const { error } = await supabase
        .from('properties')
        .insert(propertyData);

      if (error) {
        toast.error('Erro ao criar propriedade');
        console.error(error);
        return;
      }
      toast.success('Propriedade criada com sucesso');
    }

    setDialogOpen(false);
    resetForm();
    fetchProperties();
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
      <div className="min-h-screen flex items-center justify-center">
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
          <header className="flex h-16 items-center justify-between border-b px-4 md:px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <h1 className="text-xl font-semibold">Propriedades</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncAll}
                disabled={isSyncing !== null}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing === 'all' ? 'animate-spin' : ''}`} />
                Sincronizar Todas
              </Button>
              {canManage && (
                <Dialog open={dialogOpen} onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (!open) resetForm();
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Propriedade
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingProperty ? 'Editar Propriedade' : 'Nova Propriedade'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Ex: Apartamento Centro"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address">Endereço</Label>
                        <Input
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder="Ex: Rua das Flores, 123"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="check_in_time">Horário Check-in</Label>
                          <Input
                            id="check_in_time"
                            type="time"
                            value={formData.default_check_in_time}
                            onChange={(e) => setFormData({ ...formData, default_check_in_time: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="check_out_time">Horário Check-out</Label>
                          <Input
                            id="check_out_time"
                            type="time"
                            value={formData.default_check_out_time}
                            onChange={(e) => setFormData({ ...formData, default_check_out_time: e.target.value })}
                          />
                        </div>
                      </div>
                      <Button onClick={handleSubmit} className="w-full">
                        {editingProperty ? 'Salvar Alterações' : 'Criar Propriedade'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </header>

          <main className="p-4 md:p-6">
            {/* Stats Banner */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Link2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{getTotalIcalSources()}</p>
                    <p className="text-xs text-muted-foreground">Anúncios Configurados</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-500/10">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {lastSync ? format(lastSync, "dd/MM HH:mm", { locale: ptBR }) : 'Nunca'}
                    </p>
                    <p className="text-xs text-muted-foreground">Última Sincronização</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2 rounded-full ${getErrorCount() > 0 ? 'bg-destructive/10' : 'bg-muted'}`}>
                    <AlertCircle className={`h-5 w-5 ${getErrorCount() > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{getErrorCount()}</p>
                    <p className="text-xs text-muted-foreground">Erros de Sincronização</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : properties.length === 0 ? (
              <div className="text-center py-12">
                <Home className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma propriedade cadastrada</h3>
                <p className="text-muted-foreground mb-4">
                  Adicione sua primeira propriedade para começar a sincronizar reservas.
                </p>
                {canManage && (
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Propriedade
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {properties.map((property) => (
                  <Card key={property.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{property.name}</CardTitle>
                          {property.address && (
                            <p className="text-sm text-muted-foreground">{property.address}</p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Check-in: {property.default_check_in_time?.slice(0, 5) || '14:00'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Check-out: {property.default_check_out_time?.slice(0, 5) || '11:00'}
                            </span>
                          </div>
                        </div>
                        {canManage && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(property)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
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
                    </CardHeader>
                    <CardContent className="pt-0">
                      {/* iCal Sources List */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">Anúncios ({icalSources[property.id]?.length || 0})</p>
                          {canManage && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddIcal(property.id)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Adicionar iCal
                            </Button>
                          )}
                        </div>
                        
                        {icalSources[property.id]?.length > 0 ? (
                          <div className="space-y-2">
                            {icalSources[property.id].map((source) => (
                              <div
                                key={source.id}
                                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium truncate">
                                      {source.custom_name || 'Anúncio sem nome'}
                                    </p>
                                    {source.last_error ? (
                                      <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                                        Erro
                                      </span>
                                    ) : source.last_sync_at ? (
                                      <span className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">
                                        Sincronizado
                                      </span>
                                    ) : (
                                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
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
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleSyncSource(source.id)}
                                    disabled={isSyncing !== null}
                                  >
                                    <RefreshCw className={`h-4 w-4 ${isSyncing === source.id ? 'animate-spin' : ''}`} />
                                  </Button>
                                  {canManage && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleEditIcal(source)}
                                      >
                                        <Pencil className="h-4 w-4" />
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
                          <p className="text-sm text-muted-foreground py-2">
                            Nenhum anúncio configurado. Adicione uma URL iCal para sincronizar reservas.
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
                <DialogTitle>
                  {editingIcal ? 'Editar Anúncio' : 'Adicionar Anúncio'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="custom_name">Nome do Anúncio</Label>
                  <Input
                    id="custom_name"
                    value={icalFormData.custom_name}
                    onChange={(e) => setIcalFormData({ ...icalFormData, custom_name: e.target.value })}
                    placeholder="Ex: Apartamento Airbnb"
                  />
                  <p className="text-xs text-muted-foreground">
                    Nome para identificar este anúncio no sistema
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ical_url">URL do iCal *</Label>
                  <Input
                    id="ical_url"
                    value={icalFormData.ical_url}
                    onChange={(e) => setIcalFormData({ ...icalFormData, ical_url: e.target.value })}
                    placeholder="https://www.airbnb.com/calendar/ical/..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Encontre em: Airbnb → Seu anúncio → Disponibilidade → Sincronização do calendário
                  </p>
                </div>
                <Button onClick={handleSubmitIcal} className="w-full">
                  {editingIcal ? 'Salvar Alterações' : 'Adicionar Anúncio'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
