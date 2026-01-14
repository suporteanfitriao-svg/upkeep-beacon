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
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ClipboardCheck, Plus, Trash2, Loader2, Edit2, Calendar,
  Building2, User, Clock, Play, CheckCircle2, AlertCircle,
  ChevronRight, Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO, isToday, isPast, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Json } from '@/integrations/supabase/types';

interface Property {
  id: string;
  name: string;
}

interface TeamMember {
  id: string;
  name: string;
}

interface Checklist {
  id: string;
  name: string;
  items: any;
  property_id: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  [key: string]: string | boolean; // Index signature for Json compatibility
}

interface Inspection {
  id: string;
  user_id: string;
  property_id: string;
  property_name: string;
  title: string;
  description?: string;
  scheduled_date: string;
  scheduled_time?: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  assigned_to?: string;
  assigned_to_name?: string;
  checklist_id?: string;
  checklist_state: ChecklistItem[];
  notes?: string;
  completed_at?: string;
  completed_by?: string;
  completed_by_name?: string;
  created_at: string;
}

const statusConfig = {
  scheduled: { label: 'Agendado', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Calendar },
  in_progress: { label: 'Em Andamento', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Play },
  completed: { label: 'Finalizada', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
};

const Inspections = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInspection, setEditingInspection] = useState<Inspection | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Detail dialog
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  // Form state
  const [form, setForm] = useState({
    property_id: '',
    title: '',
    description: '',
    scheduled_date: '',
    scheduled_time: '',
    assigned_to: '',
    checklist_id: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [propertiesRes, teamRes, checklistsRes, inspectionsRes] = await Promise.all([
        supabase.from('properties').select('id, name').order('name'),
        supabase.from('team_members').select('id, name').eq('is_active', true).order('name'),
        supabase.from('property_checklists').select('id, name, items, property_id').eq('is_active', true),
        supabase.from('inspections').select('*').order('scheduled_date', { ascending: true }),
      ]);

      if (propertiesRes.error) throw propertiesRes.error;
      if (teamRes.error) throw teamRes.error;
      if (checklistsRes.error) throw checklistsRes.error;
      if (inspectionsRes.error) throw inspectionsRes.error;

      setProperties(propertiesRes.data || []);
      setTeamMembers(teamRes.data || []);
      setChecklists(checklistsRes.data || []);
      setInspections((inspectionsRes.data || []).map(i => ({
        ...i,
        status: i.status as 'scheduled' | 'in_progress' | 'completed',
        checklist_state: Array.isArray(i.checklist_state) 
          ? (i.checklist_state as unknown as ChecklistItem[]) 
          : [],
      })));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (inspection?: Inspection) => {
    if (inspection) {
      setEditingInspection(inspection);
      setForm({
        property_id: inspection.property_id,
        title: inspection.title,
        description: inspection.description || '',
        scheduled_date: inspection.scheduled_date,
        scheduled_time: inspection.scheduled_time || '',
        assigned_to: inspection.assigned_to || '',
        checklist_id: inspection.checklist_id || '',
        notes: inspection.notes || '',
      });
    } else {
      setEditingInspection(null);
      setForm({
        property_id: '',
        title: '',
        description: '',
        scheduled_date: '',
        scheduled_time: '',
        assigned_to: '',
        checklist_id: '',
        notes: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.property_id || !form.title || !form.scheduled_date) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      const property = properties.find(p => p.id === form.property_id);
      const assignedMember = teamMembers.find(m => m.id === form.assigned_to);
      
      // Get checklist items if a checklist is selected
      let checklistState: ChecklistItem[] = [];
      if (form.checklist_id) {
        const checklist = checklists.find(c => c.id === form.checklist_id);
        if (checklist?.items) {
          const items = Array.isArray(checklist.items) ? checklist.items : [];
          checklistState = items.map((item: any, idx: number) => ({
            id: item.id || `item-${idx}`,
            label: item.label || item.name || item,
            checked: false,
          }));
        }
      }

      const inspectionData = {
        property_id: form.property_id,
        property_name: property?.name || '',
        title: form.title.trim(),
        description: form.description.trim() || null,
        scheduled_date: form.scheduled_date,
        scheduled_time: form.scheduled_time || null,
        assigned_to: form.assigned_to || null,
        assigned_to_name: assignedMember?.name || null,
        checklist_id: form.checklist_id || null,
        checklist_state: JSON.parse(JSON.stringify(checklistState)) as Json,
        notes: form.notes.trim() || null,
      };

      if (editingInspection) {
        const { error } = await supabase
          .from('inspections')
          .update(inspectionData)
          .eq('id', editingInspection.id);

        if (error) throw error;
        toast.success('Inspeção atualizada!');
      } else {
        const { error } = await supabase
          .from('inspections')
          .insert([{
            ...inspectionData,
            user_id: user.id,
            status: 'scheduled',
          }]);

        if (error) throw error;
        toast.success('Inspeção criada!');
      }

      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving inspection:', error);
      toast.error('Erro ao salvar inspeção');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta inspeção?')) return;

    try {
      const { error } = await supabase.from('inspections').delete().eq('id', id);
      if (error) throw error;
      toast.success('Inspeção excluída!');
      fetchData();
    } catch (error) {
      console.error('Error deleting inspection:', error);
      toast.error('Erro ao excluir inspeção');
    }
  };

  const handleOpenDetail = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setDetailDialogOpen(true);
  };

  const handleStatusChange = async (newStatus: 'scheduled' | 'in_progress' | 'completed') => {
    if (!selectedInspection) return;

    setUpdatingStatus(true);
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'completed') {
        const { data: { user } } = await supabase.auth.getUser();
        updateData.completed_at = new Date().toISOString();
        
        // Try to get team member name
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, team_member_id')
            .eq('id', user.id)
            .maybeSingle();
          
          if (profile?.team_member_id) {
            updateData.completed_by = profile.team_member_id;
            updateData.completed_by_name = profile.name;
          }
        }
      }

      const { error } = await supabase
        .from('inspections')
        .update(updateData)
        .eq('id', selectedInspection.id);

      if (error) throw error;
      
      toast.success(`Status alterado para: ${statusConfig[newStatus].label}`);
      setSelectedInspection({ ...selectedInspection, ...updateData });
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleChecklistItemToggle = async (itemId: string) => {
    if (!selectedInspection) return;

    const updatedState = selectedInspection.checklist_state.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );

    try {
      const { error } = await supabase
        .from('inspections')
        .update({ checklist_state: JSON.parse(JSON.stringify(updatedState)) as Json })
        .eq('id', selectedInspection.id);

      if (error) throw error;
      setSelectedInspection({ ...selectedInspection, checklist_state: updatedState });
    } catch (error) {
      console.error('Error updating checklist:', error);
      toast.error('Erro ao atualizar checklist');
    }
  };

  // Get checklists for selected property
  const availableChecklists = checklists.filter(c => c.property_id === form.property_id);

  // Filter inspections by tab
  const filteredInspections = inspections.filter(i => {
    if (activeTab === 'all') return true;
    if (activeTab === 'today') return isToday(parseISO(i.scheduled_date));
    if (activeTab === 'upcoming') return isFuture(parseISO(i.scheduled_date));
    if (activeTab === 'past') return isPast(parseISO(i.scheduled_date)) && !isToday(parseISO(i.scheduled_date));
    return i.status === activeTab;
  });

  // Stats
  const stats = {
    total: inspections.length,
    scheduled: inspections.filter(i => i.status === 'scheduled').length,
    in_progress: inspections.filter(i => i.status === 'in_progress').length,
    completed: inspections.filter(i => i.status === 'completed').length,
  };

  if (loading) {
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
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <ClipboardCheck className="h-6 w-6" />
                Inspeções
              </h1>
              <p className="text-muted-foreground mt-1">
                Agende e gerencie inspeções das suas propriedades
              </p>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Inspeção
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <ClipboardCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.scheduled}</p>
                    <p className="text-xs text-muted-foreground">Agendadas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Play className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.in_progress}</p>
                    <p className="text-xs text-muted-foreground">Em Andamento</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.completed}</p>
                    <p className="text-xs text-muted-foreground">Finalizadas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs and Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="today">Hoje</TabsTrigger>
              <TabsTrigger value="scheduled">Agendadas</TabsTrigger>
              <TabsTrigger value="in_progress">Em Andamento</TabsTrigger>
              <TabsTrigger value="completed">Finalizadas</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {filteredInspections.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">Nenhuma inspeção encontrada</p>
                    <Button variant="outline" className="mt-4" onClick={() => handleOpenDialog()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar primeira inspeção
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredInspections.map(inspection => {
                    const StatusIcon = statusConfig[inspection.status].icon;
                    const completedItems = inspection.checklist_state.filter(i => i.checked).length;
                    const totalItems = inspection.checklist_state.length;
                    
                    return (
                      <Card 
                        key={inspection.id} 
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleOpenDetail(inspection)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className={statusConfig[inspection.status].color}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {statusConfig[inspection.status].label}
                                </Badge>
                                {totalItems > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {completedItems}/{totalItems} itens
                                  </Badge>
                                )}
                              </div>
                              
                              <h3 className="font-semibold text-lg">{inspection.title}</h3>
                              
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-4 w-4" />
                                  {inspection.property_name}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {format(parseISO(inspection.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
                                </span>
                                {inspection.scheduled_time && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {inspection.scheduled_time.slice(0, 5)}
                                  </span>
                                )}
                                {inspection.assigned_to_name && (
                                  <span className="flex items-center gap-1">
                                    <User className="h-4 w-4" />
                                    {inspection.assigned_to_name}
                                  </span>
                                )}
                              </div>
                              
                              {inspection.description && (
                                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                  {inspection.description}
                                </p>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDialog(inspection);
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(inspection.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </SidebarInset>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingInspection ? 'Editar Inspeção' : 'Nova Inspeção'}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes da inspeção
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Propriedade *</Label>
              <Select 
                value={form.property_id} 
                onValueChange={(value) => {
                  setForm(prev => ({ ...prev, property_id: value, checklist_id: '' }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a propriedade" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                placeholder="Ex: Inspeção de rotina, Vistoria pré-check-in"
                value={form.title}
                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Detalhes sobre a inspeção..."
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={form.scheduled_date}
                  onChange={(e) => setForm(prev => ({ ...prev, scheduled_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Horário</Label>
                <Input
                  type="time"
                  value={form.scheduled_time}
                  onChange={(e) => setForm(prev => ({ ...prev, scheduled_time: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select 
                value={form.assigned_to || "none"} 
                onValueChange={(value) => setForm(prev => ({ ...prev, assigned_to: value === "none" ? "" : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {teamMembers.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.property_id && availableChecklists.length > 0 && (
              <div className="space-y-2">
                <Label>Checklist</Label>
                <Select 
                  value={form.checklist_id || "none"} 
                  onValueChange={(value) => setForm(prev => ({ ...prev, checklist_id: value === "none" ? "" : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um checklist (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {availableChecklists.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Notas adicionais..."
                value={form.notes}
                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
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

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          {selectedInspection && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-xl">{selectedInspection.title}</DialogTitle>
                    <DialogDescription className="flex items-center gap-2 mt-1">
                      <Building2 className="h-4 w-4" />
                      {selectedInspection.property_name}
                    </DialogDescription>
                  </div>
                  <Badge variant="outline" className={statusConfig[selectedInspection.status].color}>
                    {statusConfig[selectedInspection.status].label}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(parseISO(selectedInspection.scheduled_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  {selectedInspection.scheduled_time && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{selectedInspection.scheduled_time.slice(0, 5)}</span>
                    </div>
                  )}
                  {selectedInspection.assigned_to_name && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{selectedInspection.assigned_to_name}</span>
                    </div>
                  )}
                </div>

                {selectedInspection.description && (
                  <div>
                    <p className="text-sm font-medium mb-1">Descrição</p>
                    <p className="text-sm text-muted-foreground">{selectedInspection.description}</p>
                  </div>
                )}

                {/* Status Actions */}
                <div className="flex gap-2 flex-wrap">
                  {selectedInspection.status === 'scheduled' && (
                    <Button 
                      onClick={() => handleStatusChange('in_progress')}
                      disabled={updatingStatus}
                      className="bg-yellow-600 hover:bg-yellow-700"
                    >
                      {updatingStatus ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                      Iniciar Inspeção
                    </Button>
                  )}
                  {selectedInspection.status === 'in_progress' && (
                    <Button 
                      onClick={() => handleStatusChange('completed')}
                      disabled={updatingStatus}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {updatingStatus ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                      Finalizar Inspeção
                    </Button>
                  )}
                  {selectedInspection.status !== 'scheduled' && (
                    <Button 
                      variant="outline"
                      onClick={() => handleStatusChange('scheduled')}
                      disabled={updatingStatus}
                    >
                      Voltar para Agendado
                    </Button>
                  )}
                </div>

                {/* Checklist */}
                {selectedInspection.checklist_state.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium">Checklist</p>
                      <Badge variant="secondary">
                        {selectedInspection.checklist_state.filter(i => i.checked).length}/
                        {selectedInspection.checklist_state.length}
                      </Badge>
                    </div>
                    <ScrollArea className="h-[200px] rounded-lg border p-3">
                      <div className="space-y-2">
                        {selectedInspection.checklist_state.map(item => (
                          <div 
                            key={item.id} 
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                            onClick={() => handleChecklistItemToggle(item.id)}
                          >
                            <Checkbox 
                              checked={item.checked}
                              onCheckedChange={() => handleChecklistItemToggle(item.id)}
                            />
                            <span className={item.checked ? 'line-through text-muted-foreground' : ''}>
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {selectedInspection.notes && (
                  <div>
                    <p className="text-sm font-medium mb-1">Observações</p>
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                      {selectedInspection.notes}
                    </p>
                  </div>
                )}

                {selectedInspection.completed_at && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-700">
                      <CheckCircle2 className="h-4 w-4 inline mr-2" />
                      Finalizada em {format(parseISO(selectedInspection.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      {selectedInspection.completed_by_name && ` por ${selectedInspection.completed_by_name}`}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default Inspections;
