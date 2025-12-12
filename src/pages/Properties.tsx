import { useState, useEffect } from 'react';
import { Plus, RefreshCw, Home, Pencil, Trash2, ExternalLink, Users, Calendar } from 'lucide-react';
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
import { useNavigate } from 'react-router-dom';

interface Property {
  id: string;
  name: string;
  address: string | null;
  airbnb_ical_url: string | null;
  created_at: string;
}

interface PropertyStats {
  propertyId: string;
  listingNames: string[];
  totalReservations: number;
  totalGuests: number;
}

export default function Properties() {
  const { role, loading: isLoadingRole } = useUserRole();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyStats, setPropertyStats] = useState<Record<string, PropertyStats>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    airbnb_ical_url: ''
  });

  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const canManage = isAdmin || isManager;

  useEffect(() => {
    if (!isLoadingRole && role) {
      fetchProperties();
      fetchPropertyStats();
    }
  }, [isLoadingRole, role]);

  const fetchProperties = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      toast.error('Erro ao carregar propriedades');
      console.error(error);
    } else {
      setProperties(data || []);
    }
    setIsLoading(false);
  };

  const fetchPropertyStats = async () => {
    const { data, error } = await supabase
      .from('reservations')
      .select('property_id, listing_name, number_of_guests');

    if (error) {
      console.error('Error fetching stats:', error);
      return;
    }

    const stats: Record<string, PropertyStats> = {};
    
    (data || []).forEach((reservation) => {
      if (!reservation.property_id) return;
      
      if (!stats[reservation.property_id]) {
        stats[reservation.property_id] = {
          propertyId: reservation.property_id,
          listingNames: [],
          totalReservations: 0,
          totalGuests: 0
        };
      }
      
      stats[reservation.property_id].totalReservations++;
      stats[reservation.property_id].totalGuests += reservation.number_of_guests || 1;
      
      if (reservation.listing_name && !stats[reservation.property_id].listingNames.includes(reservation.listing_name)) {
        stats[reservation.property_id].listingNames.push(reservation.listing_name);
      }
    });

    setPropertyStats(stats);
  };

  const resetForm = () => {
    setFormData({ name: '', address: '', airbnb_ical_url: '' });
    setEditingProperty(null);
  };

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    setFormData({
      name: property.name,
      address: property.address || '',
      airbnb_ical_url: property.airbnb_ical_url || ''
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
      airbnb_ical_url: formData.airbnb_ical_url.trim() || null
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
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-ical-reservations', {
        body: {}
      });

      if (error) throw error;

      toast.success(`Sincronização concluída: ${data.synced || 0} reservas processadas`);
      fetchPropertyStats();
      fetchProperties();
      fetchPropertyStats();
    } catch (error: any) {
      toast.error('Erro na sincronização: ' + (error.message || 'Erro desconhecido'));
      console.error(error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncProperty = async (propertyId: string) => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-ical-reservations', {
        body: { propertyId }
      });

      if (error) throw error;

      toast.success(`Sincronização concluída: ${data.synced || 0} reservas processadas`);
    } catch (error: any) {
      toast.error('Erro na sincronização: ' + (error.message || 'Erro desconhecido'));
      console.error(error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoadingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
                disabled={isSyncing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
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
                      <div className="space-y-2">
                        <Label htmlFor="ical_url">URL do iCal (Airbnb)</Label>
                        <Input
                          id="ical_url"
                          value={formData.airbnb_ical_url}
                          onChange={(e) => setFormData({ ...formData, airbnb_ical_url: e.target.value })}
                          placeholder="https://www.airbnb.com/calendar/ical/..."
                        />
                        <p className="text-xs text-muted-foreground">
                          Encontre em: Airbnb → Seu anúncio → Disponibilidade → Sincronização do calendário
                        </p>
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
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {properties.map((property) => (
                  <Card key={property.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span className="truncate">{property.name}</span>
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
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {property.address && (
                        <p className="text-sm text-muted-foreground">{property.address}</p>
                      )}
                      
                      {/* Listing names from Airbnb */}
                      {propertyStats[property.id]?.listingNames.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Anúncios encontrados:</p>
                          <div className="flex flex-wrap gap-1">
                            {propertyStats[property.id].listingNames.map((name, idx) => (
                              <span 
                                key={idx} 
                                className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Stats */}
                      {propertyStats[property.id] && (
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {propertyStats[property.id].totalReservations} reservas
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {propertyStats[property.id].totalGuests} hóspedes
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {property.airbnb_ical_url ? (
                          <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />
                            iCal configurado
                          </span>
                        ) : (
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                            Sem iCal
                          </span>
                        )}
                      </div>
                      {property.airbnb_ical_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handleSyncProperty(property.id)}
                          disabled={isSyncing}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                          Sincronizar
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
