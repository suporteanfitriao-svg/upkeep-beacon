import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  MapPin, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Plus,
  Shield,
  Ban,
  CheckCircle,
  Filter,
  AlertTriangle
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Property {
  id: string;
  name: string;
  address: string | null;
  airbnb_ical_url: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  schedulesCount?: number;
  checklistsCount?: number;
  lastSyncStatus?: 'success' | 'error' | 'pending';
  lastSyncAt?: string;
  lastSyncError?: string | null;
}

// Mock data for owner/manager - in a real app this would come from a relation
const mockOwners = [
  { name: 'Ricardo Mendes', initials: 'RM', plan: 'Enterprise' },
  { name: 'Fábio Lima', initials: 'FL', plan: 'Profissional' },
  { name: 'Aline Silva', initials: 'AS', plan: 'Enterprise' },
  { name: 'Gestão Horizonte', initials: 'GH', plan: 'Básico' },
];

const ITEMS_PER_PAGE = 10;

export function PropertiesSection() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('global');
  const [currentPage, setCurrentPage] = useState(1);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [propertyToSuspend, setPropertyToSuspend] = useState<Property | null>(null);
  const [propertyToActivate, setPropertyToActivate] = useState<Property | null>(null);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('name');

      if (error) throw error;

      // Fetch iCal sources for sync status
      const { data: icalSources } = await supabase
        .from('property_ical_sources')
        .select('property_id, last_sync_at, last_error');

      // Create a map for quick lookup
      const icalMap = new Map(
        (icalSources || []).map(s => [s.property_id, s])
      );

      // Fetch additional counts for each property
      const propertiesWithCounts = await Promise.all(
        (data || []).map(async (property) => {
          const [schedulesRes, checklistsRes] = await Promise.all([
            supabase
              .from('schedules')
              .select('id', { count: 'exact', head: true })
              .eq('property_id', property.id),
            supabase
              .from('property_checklists')
              .select('id', { count: 'exact', head: true })
              .eq('property_id', property.id),
          ]);

          // Get real sync data from property_ical_sources
          const icalSource = icalMap.get(property.id);
          let syncStatus: 'success' | 'error' | 'pending' = 'pending';
          
          if (icalSource) {
            syncStatus = icalSource.last_error ? 'error' : 'success';
          } else if (!property.airbnb_ical_url) {
            syncStatus = 'pending';
          }

          return {
            ...property,
            schedulesCount: schedulesRes.count || 0,
            checklistsCount: checklistsRes.count || 0,
            lastSyncStatus: syncStatus,
            lastSyncAt: icalSource?.last_sync_at || undefined,
            lastSyncError: icalSource?.last_error || undefined,
          };
        })
      );

      setProperties(propertiesWithCounts);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigate = useNavigate();

  const getPropertyId = (index: number) => {
    return `PM-${(24901 + index).toString().padStart(5, '0')}`;
  };

  const getOwner = (index: number) => {
    return mockOwners[index % mockOwners.length];
  };

  const getPropertyStatus = (property: Property): 'active' | 'trial' | 'inactive' => {
    // Use real is_active from database
    if (!property.is_active) return 'inactive';
    // If has sync error, show as trial (needs attention)
    if (property.lastSyncStatus === 'error') return 'trial';
    return 'active';
  };

  // Apply all filters
  const filteredProperties = properties.filter(p => {
    // Search filter
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.address?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Plan filter
    const owner = getOwner(properties.indexOf(p));
    const matchesPlan = planFilter === 'all' || 
      (planFilter === 'basic' && owner.plan === 'Básico') ||
      (planFilter === 'professional' && owner.plan === 'Profissional') ||
      (planFilter === 'enterprise' && owner.plan === 'Enterprise');
    
    // Status filter
    const status = getPropertyStatus(p);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    
    // Region filter (based on address)
    const matchesRegion = regionFilter === 'global' || 
      (regionFilter === 'sudeste' && (p.address?.toLowerCase().includes('são paulo') || p.address?.toLowerCase().includes('rio'))) ||
      (regionFilter === 'sul' && (p.address?.toLowerCase().includes('curitiba') || p.address?.toLowerCase().includes('porto alegre'))) ||
      (regionFilter === 'norte-ne' && (p.address?.toLowerCase().includes('salvador') || p.address?.toLowerCase().includes('recife')));
    
    return matchesSearch && matchesPlan && matchesStatus && matchesRegion;
  });

  const totalPages = Math.ceil(filteredProperties.length / ITEMS_PER_PAGE);
  const paginatedProperties = filteredProperties.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleAdminAccess = (property: Property) => {
    toast.info(`Acessando painel admin de "${property.name}"...`);
    // Navigate to the property admin page
    navigate(`/properties?id=${property.id}`);
  };

  const handleForceSync = async (property: Property) => {
    if (!property.airbnb_ical_url) {
      toast.error('Esta propriedade não possui URL iCal configurada');
      return;
    }
    
    toast.loading(`Sincronizando "${property.name}"...`, { id: `sync-${property.id}` });
    
    try {
      const { error } = await supabase.functions.invoke('sync-ical-reservations', {
        body: { propertyId: property.id }
      });
      
      if (error) throw error;
      
      toast.success(`"${property.name}" sincronizada com sucesso!`, { id: `sync-${property.id}` });
      fetchProperties();
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(`Erro ao sincronizar "${property.name}"`, { id: `sync-${property.id}` });
    }
  };

  const handleSuspendClick = (property: Property) => {
    const currentStatus = getPropertyStatus(property);
    if (currentStatus === 'inactive') {
      // Mostrar modal de confirmação para ativar
      setPropertyToActivate(property);
      setActivateDialogOpen(true);
    } else {
      // Mostrar modal de confirmação para suspender
      setPropertyToSuspend(property);
      setSuspendDialogOpen(true);
    }
  };

  const updatePropertyStatus = async (property: Property, newStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ is_active: newStatus })
        .eq('id', property.id);

      if (error) throw error;

      // Update local state
      setProperties(prev => prev.map(p => 
        p.id === property.id ? { ...p, is_active: newStatus } : p
      ));

      toast.success(`Propriedade "${property.name}" ${newStatus ? 'ativada' : 'suspensa'} com sucesso!`);
    } catch (error) {
      console.error('Error updating property status:', error);
      toast.error(`Erro ao ${newStatus ? 'ativar' : 'suspender'} propriedade`);
    }
  };

  const confirmSuspend = async () => {
    if (!propertyToSuspend) return;
    
    await updatePropertyStatus(propertyToSuspend, false);
    setSuspendDialogOpen(false);
    setPropertyToSuspend(null);
  };

  const confirmActivate = async () => {
    if (!propertyToActivate) return;
    
    await updatePropertyStatus(propertyToActivate, true);
    setActivateDialogOpen(false);
    setPropertyToActivate(null);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setPlanFilter('all');
    setStatusFilter('all');
    setRegionFilter('global');
    setCurrentPage(1);
    toast.info('Filtros limpos');
  };

  const formatSyncTime = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Agora';
    if (diffHours < 24) {
      if (diffHours === 1) return 'Há 1 hora';
      return `Há ${diffHours} horas`;
    }
    
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return `Hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Ontem';
    return `Há ${diffDays} dias`;
  };

  const renderPagination = () => {
    const pages: (number | string)[] = [];
    
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      
      if (currentPage < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    
    return pages;
  };

  return (
    <div className="space-y-6">
      {/* Filters Card */}
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Search */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, proprietário ou endereço..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-muted/50 border-border"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border border-border rounded-xl">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Plano</span>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="bg-transparent border-none text-xs font-semibold p-0 h-auto w-auto focus:ring-0 [&>svg]:hidden">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="basic">Básico</SelectItem>
                  <SelectItem value="professional">Profissional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border border-border rounded-xl">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Status</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-transparent border-none text-xs font-semibold p-0 h-auto w-auto focus:ring-0 [&>svg]:hidden">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="inactive">Inativa</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border border-border rounded-xl">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Região</span>
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="bg-transparent border-none text-xs font-semibold p-0 h-auto w-auto focus:ring-0 [&>svg]:hidden">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global</SelectItem>
                  <SelectItem value="sudeste">Sudeste</SelectItem>
                  <SelectItem value="sul">Sul</SelectItem>
                  <SelectItem value="norte-ne">Norte/NE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-primary"
              onClick={clearFilters}
              title="Limpar filtros"
            >
              <Filter className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-card border border-border rounded-2xl shadow-sm flex flex-col overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 border-b border-border hover:bg-muted/30">
                <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Nome do Imóvel
                </TableHead>
                <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Localização
                </TableHead>
                <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Proprietário/Gestor
                </TableHead>
                <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center">
                  Status
                </TableHead>
                <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center">
                  iCal
                </TableHead>
                <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Última Sinc.
                </TableHead>
                <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center">
                  Tarefas
                </TableHead>
                <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-right">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Carregando...
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedProperties.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma propriedade encontrada
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProperties.map((property, index) => {
                  const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + index;
                  const owner = getOwner(globalIndex);
                  const status = getPropertyStatus(property);
                  const syncTime = formatSyncTime(property.lastSyncAt);

                  return (
                    <TableRow 
                      key={property.id} 
                      className="hover:bg-primary/[0.02] transition-colors"
                    >
                      {/* Property Name */}
                      <TableCell className="py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-foreground">{property.name}</span>
                          <span className="text-[11px] text-muted-foreground">ID: {getPropertyId(globalIndex)}</span>
                        </div>
                      </TableCell>

                      {/* Location */}
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {property.address || 'Não informado'}
                        </div>
                      </TableCell>

                      {/* Owner/Manager */}
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold ${owner.plan === 'Enterprise' ? 'text-primary' : ''}`}>
                            {owner.initials}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-foreground">{owner.name}</span>
                            <span className={`text-[10px] font-medium ${owner.plan === 'Enterprise' ? 'text-primary' : 'text-muted-foreground'}`}>
                              {owner.plan}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-4 text-center">
                        {status === 'active' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 uppercase tracking-tight">
                            Ativa
                          </span>
                        )}
                        {status === 'trial' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 uppercase tracking-tight">
                            Trial
                          </span>
                        )}
                        {status === 'inactive' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-muted text-muted-foreground uppercase tracking-tight">
                            Inativa
                          </span>
                        )}
                      </TableCell>

                      {/* iCal Status */}
                      <TableCell className="py-4 text-center">
                        {property.airbnb_ical_url ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 uppercase tracking-tight">
                            Sim
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-muted text-muted-foreground uppercase tracking-tight">
                            Não
                          </span>
                        )}
                      </TableCell>

                      {/* Last Sync */}
                      <TableCell className="py-4">
                        {property.lastSyncStatus === 'error' ? (
                          <div className="flex items-center gap-2 text-xs text-destructive font-medium">
                            <AlertTriangle className="h-4 w-4" />
                            Erro (2 dias)
                          </div>
                        ) : syncTime ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <RefreshCw className="h-4 w-4 text-green-500" />
                            {syncTime}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      {/* Tasks */}
                      <TableCell className="py-4 text-center">
                        <span className={`text-xs font-bold ${property.schedulesCount === 0 ? 'text-muted-foreground' : 'text-foreground'}`}>
                          {String(property.schedulesCount || 0).padStart(2, '0')}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-primary"
                            title="Acessar modo admin"
                            onClick={() => handleAdminAccess(property)}
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-primary"
                            title="Forçar Sincronização"
                            onClick={() => handleForceSync(property)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          {status === 'inactive' ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                              title="Ativar"
                              onClick={() => handleSuspendClick(property)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 bg-muted hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                              title="Suspender"
                              onClick={() => handleSuspendClick(property)}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        <div className="mt-auto border-t border-border p-4 flex items-center justify-between bg-muted/20">
          <p className="text-[11px] font-medium text-muted-foreground">
            Exibindo{' '}
            <span className="text-foreground font-bold">
              {filteredProperties.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}-
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredProperties.length)}
            </span>{' '}
            de{' '}
            <span className="text-foreground font-bold">{filteredProperties.length}</span>{' '}
            propriedades
          </p>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex gap-1">
              {renderPagination().map((page, index) => (
                typeof page === 'number' ? (
                  <Button
                    key={index}
                    variant={currentPage === page ? 'default' : 'ghost'}
                    size="sm"
                    className={`w-8 h-8 p-0 text-[11px] font-bold ${
                      currentPage === page 
                        ? 'bg-primary text-primary-foreground' 
                        : 'text-muted-foreground hover:bg-card'
                    }`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ) : (
                  <span key={index} className="text-muted-foreground px-1 pt-2 text-sm">...</span>
                )
              ))}
            </div>
            
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Suspend Confirmation Modal */}
      <AlertDialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              Confirmar Suspensão
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você está prestes a suspender a propriedade{' '}
                <strong className="text-foreground">"{propertyToSuspend?.name}"</strong>.
              </p>
              <p className="text-destructive/80">
                Esta ação irá desativar temporariamente o acesso a esta propriedade no sistema.
                Os usuários vinculados não poderão acessar agendas ou checklists enquanto a propriedade estiver suspensa.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPropertyToSuspend(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSuspend}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, Suspender
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activate Confirmation Modal */}
      <AlertDialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Confirmar Ativação
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você está prestes a ativar a propriedade{' '}
                <strong className="text-foreground">"{propertyToActivate?.name}"</strong>.
              </p>
              <p className="text-muted-foreground">
                Esta ação irá restaurar o acesso a esta propriedade no sistema.
                Os usuários vinculados poderão acessar agendas e checklists normalmente.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPropertyToActivate(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmActivate}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              Sim, Ativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
