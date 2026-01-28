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
  ChevronRight, Eye, RotateCcw, History, Camera
} from 'lucide-react';
import { PhotoGallery } from '@/components/shared/PhotoGallery';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO, isToday, isPast, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Json } from '@/integrations/supabase/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';

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

interface InspectionHistoryEvent {
  timestamp: string;
  action: string;
  user_name?: string;
}

interface InspectionPhoto {
  url: string;
  timestamp?: string;
  uploaded_by?: string;
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
  original_checklist_state?: ChecklistItem[];
  notes?: string;
  completed_at?: string;
  completed_by?: string;
  completed_by_name?: string;
  created_at: string;
  started_at?: string;
  history?: InspectionHistoryEvent[];
  verification_comment?: string;
  inspection_photos?: InspectionPhoto[];
}

const statusConfig = {
  scheduled: { label: 'Agendado', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Calendar },
  in_progress: { label: 'Em Andamento', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Play },
  completed: { label: 'Finalizada', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
};

interface TeamMemberWithAccess extends TeamMember {
  has_all_properties: boolean;
  property_ids: string[];
}

const Inspections = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isAdmin, isManager, isCleaner } = useUserRole();
  const [properties, setProperties] = useState<Property[]>([]);
  const [allTeamMembers, setAllTeamMembers] = useState<TeamMemberWithAccess[]>([]);
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

  // Filter team members based on selected property
  const availableTeamMembers = form.property_id
    ? allTeamMembers.filter(member => 
        member.has_all_properties || member.property_ids.includes(form.property_id)
      )
    : [];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [propertiesRes, teamRes, teamPropertiesRes, checklistsRes, inspectionsRes] = await Promise.all([
        supabase.from('properties').select('id, name').order('name'),
        supabase.from('team_members').select('id, name, has_all_properties').eq('is_active', true).order('name'),
        supabase.from('team_member_properties').select('team_member_id, property_id'),
        supabase.from('property_checklists').select('id, name, items, property_id').eq('is_active', true),
        supabase.from('inspections').select('*').order('scheduled_date', { ascending: true }),
      ]);

      if (propertiesRes.error) throw propertiesRes.error;
      if (teamRes.error) throw teamRes.error;
      if (teamPropertiesRes.error) throw teamPropertiesRes.error;
      if (checklistsRes.error) throw checklistsRes.error;
      if (inspectionsRes.error) throw inspectionsRes.error;

      setProperties(propertiesRes.data || []);
      
      // Map team members with their property access
      const teamMembersWithAccess: TeamMemberWithAccess[] = (teamRes.data || []).map(member => {
        const memberProperties = (teamPropertiesRes.data || [])
          .filter(tp => tp.team_member_id === member.id)
          .map(tp => tp.property_id);
        return {
          ...member,
          property_ids: memberProperties,
        };
      });
      setAllTeamMembers(teamMembersWithAccess);
      
      setChecklists(checklistsRes.data || []);
      setInspections((inspectionsRes.data || []).map(i => ({
        ...i,
        status: i.status as 'scheduled' | 'in_progress' | 'completed',
        checklist_state: Array.isArray(i.checklist_state) 
          ? (i.checklist_state as unknown as ChecklistItem[]) 
          : [],
        original_checklist_state: Array.isArray(i.original_checklist_state) 
          ? (i.original_checklist_state as unknown as ChecklistItem[]) 
          : undefined,
        history: Array.isArray(i.history)
          ? (i.history as unknown as InspectionHistoryEvent[])
          : [],
        inspection_photos: Array.isArray(i.inspection_photos)
          ? (i.inspection_photos as unknown as InspectionPhoto[])
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
      const assignedMember = allTeamMembers.find(m => m.id === form.assigned_to);
      
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

      const now = new Date().toISOString();
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
        // Get user name for history
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .maybeSingle();
        const userName = profile?.name || 'Usuário';

        const initialHistory = [
          { timestamp: now, action: 'created', user_name: userName }
        ];

        const { error } = await supabase
          .from('inspections')
          .insert([{
            ...inspectionData,
            user_id: user.id,
            status: 'scheduled',
            history: JSON.parse(JSON.stringify(initialHistory)) as Json,
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
      const now = new Date().toISOString();
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get user name for history
      let userName = 'Usuário';
      let teamMemberId: string | null = null;
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, team_member_id')
          .eq('id', user.id)
          .maybeSingle();
        userName = profile?.name || 'Usuário';
        teamMemberId = profile?.team_member_id || null;
      }

      const updateData: any = { status: newStatus };
      const currentHistory = selectedInspection.history || [];
      
      // When starting inspection, save original checklist state and started_at
      if (newStatus === 'in_progress' && selectedInspection.status === 'scheduled') {
        updateData.original_checklist_state = JSON.parse(JSON.stringify(selectedInspection.checklist_state));
        updateData.started_at = now;
        updateData.history = JSON.parse(JSON.stringify([
          ...currentHistory,
          { timestamp: now, action: 'started', user_name: userName }
        ]));
      }
      
      if (newStatus === 'completed') {
        updateData.completed_at = now;
        if (teamMemberId) {
          updateData.completed_by = teamMemberId;
          updateData.completed_by_name = userName;
        }
        updateData.history = JSON.parse(JSON.stringify([
          ...currentHistory,
          { timestamp: now, action: 'completed', user_name: userName }
        ]));
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

  const handleResetChecklist = async () => {
    if (!selectedInspection) return;
    
    // Get original state (either saved or reset all to unchecked)
    const originalState = selectedInspection.original_checklist_state 
      || selectedInspection.checklist_state.map(item => ({ ...item, checked: false }));

    if (!confirm('Tem certeza que deseja resetar o checklist? Todos os itens marcados serão desmarcados.')) return;

    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('inspections')
        .update({ 
          checklist_state: JSON.parse(JSON.stringify(originalState)) as Json,
          status: 'in_progress', // Reset to in_progress if was completed
          completed_at: null,
          completed_by: null,
          completed_by_name: null,
        })
        .eq('id', selectedInspection.id);

      if (error) throw error;
      
      toast.success('Checklist resetado!');
      setSelectedInspection({ 
        ...selectedInspection, 
        checklist_state: originalState,
        status: 'in_progress',
        completed_at: undefined,
        completed_by: undefined,
        completed_by_name: undefined,
      });
      fetchData();
    } catch (error) {
      console.error('Error resetting checklist:', error);
      toast.error('Erro ao resetar checklist');
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
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        <SidebarInset className="w-full">
          <DashboardHeader title="Inspeção" subtitle="Agende e gerencie inspeções" />
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
        <DashboardHeader title="Inspeção" subtitle="Agende e gerencie inspeções" />
        <main className={`flex-1 p-4 sm:p-6 ${isMobile ? 'pb-28' : ''}`}>
          {/* Header - Mobile optimized */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 sm:h-6 sm:w-6" />
                Inspeções
              </h1>
              <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
                Agende e gerencie inspeções das suas propriedades
              </p>
            </div>
            <Button onClick={() => handleOpenDialog()} className="h-11 px-4 text-base touch-manipulation">
              <Plus className="h-5 w-5 mr-2" />
              Nova Inspeção
            </Button>
          </div>

          {/* Stats Cards - Mobile optimized with smaller touch-friendly layout */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <Card className="touch-manipulation">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                    <ClipboardCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold">{stats.total}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="touch-manipulation">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold">{stats.scheduled}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Agendadas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="touch-manipulation">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg shrink-0">
                    <Play className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold">{stats.in_progress}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Andamento</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="touch-manipulation">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 bg-green-100 rounded-lg shrink-0">
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold">{stats.completed}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Finalizadas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs and Content - Mobile optimized */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 w-full flex overflow-x-auto no-scrollbar touch-manipulation">
              <TabsTrigger value="all" className="flex-1 min-w-fit px-3">Todas</TabsTrigger>
              <TabsTrigger value="today" className="flex-1 min-w-fit px-3">Hoje</TabsTrigger>
              <TabsTrigger value="scheduled" className="flex-1 min-w-fit px-3">Agendadas</TabsTrigger>
              <TabsTrigger value="in_progress" className="flex-1 min-w-fit px-3">Andamento</TabsTrigger>
              <TabsTrigger value="completed" className="flex-1 min-w-fit px-3">Finalizadas</TabsTrigger>
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
                <div className="grid gap-3 sm:gap-4">
                  {filteredInspections.map(inspection => {
                    const StatusIcon = statusConfig[inspection.status].icon;
                    const completedItems = inspection.checklist_state.filter(i => i.checked).length;
                    const totalItems = inspection.checklist_state.length;
                    
                    return (
                      <Card 
                        key={inspection.id} 
                        className="active:shadow-md transition-shadow cursor-pointer touch-manipulation"
                        onClick={() => handleOpenDetail(inspection)}
                      >
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Badge variant="outline" className={`${statusConfig[inspection.status].color} text-xs`}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {statusConfig[inspection.status].label}
                                </Badge>
                                {totalItems > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {completedItems}/{totalItems}
                                  </Badge>
                                )}
                              </div>
                              
                              <h3 className="font-semibold text-base sm:text-lg truncate">{inspection.title}</h3>
                              
                              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs sm:text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3.5 w-3.5" />
                                  <span className="truncate max-w-[100px] sm:max-w-none">{inspection.property_name}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {format(parseISO(inspection.scheduled_date), "dd/MM", { locale: ptBR })}
                                </span>
                                {inspection.scheduled_time && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    {inspection.scheduled_time.slice(0, 5)}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Actions - Hidden on mobile, shown on larger screens */}
                            <div className="hidden sm:flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9"
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
                                className="h-9 w-9 text-destructive hover:bg-destructive/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(inspection.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 sm:ml-2" />
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
                  // Reset assigned_to if the member doesn't have access to the new property
                  const currentAssignee = allTeamMembers.find(m => m.id === form.assigned_to);
                  const hasAccess = currentAssignee && (currentAssignee.has_all_properties || currentAssignee.property_ids.includes(value));
                  setForm(prev => ({ 
                    ...prev, 
                    property_id: value, 
                    checklist_id: '',
                    assigned_to: hasAccess ? prev.assigned_to : ''
                  }));
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
                  <SelectValue placeholder={form.property_id ? "Selecione o responsável" : "Selecione uma propriedade primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {availableTeamMembers.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                      {m.has_all_properties && (
                        <span className="ml-2 text-xs text-muted-foreground">(Acesso total)</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.property_id && availableTeamMembers.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum membro da equipe tem acesso a esta propriedade
                </p>
              )}
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

      {/* Detail Dialog - Mobile optimized */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

                {/* Status Actions - Mobile optimized with larger touch targets */}
                <div className="flex gap-2 flex-wrap">
                  {selectedInspection.status === 'scheduled' && (
                    <Button 
                      onClick={() => handleStatusChange('in_progress')}
                      disabled={updatingStatus}
                      className="bg-yellow-600 hover:bg-yellow-700 h-12 px-6 text-base font-semibold flex-1 sm:flex-none touch-manipulation"
                    >
                      {updatingStatus ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Play className="h-5 w-5 mr-2" />}
                      Iniciar Inspeção
                    </Button>
                  )}
                  {selectedInspection.status === 'in_progress' && (
                    <Button 
                      onClick={() => handleStatusChange('completed')}
                      disabled={updatingStatus}
                      className="bg-green-600 hover:bg-green-700 h-12 px-6 text-base font-semibold flex-1 sm:flex-none touch-manipulation"
                    >
                      {updatingStatus ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
                      Finalizar Inspeção
                    </Button>
                  )}
                  {selectedInspection.status !== 'scheduled' && (
                    <Button 
                      variant="outline"
                      onClick={() => handleStatusChange('scheduled')}
                      disabled={updatingStatus}
                      className="h-12 px-4 touch-manipulation"
                    >
                      Voltar para Agendado
                    </Button>
                  )}
                </div>

                {/* Checklist - Mobile optimized */}
                {selectedInspection.checklist_state.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium">Checklist</p>
                      <div className="flex items-center gap-2">
                        {selectedInspection.checklist_state.some(i => i.checked) && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={handleResetChecklist}
                            disabled={updatingStatus}
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 h-9 px-3"
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Resetar
                          </Button>
                        )}
                        <Badge variant="secondary" className="text-sm px-2 py-1">
                          {selectedInspection.checklist_state.filter(i => i.checked).length}/
                          {selectedInspection.checklist_state.length}
                        </Badge>
                      </div>
                    </div>
                    <ScrollArea className="h-[280px] sm:h-[200px] rounded-xl border">
                      <div className="divide-y divide-border">
                        {selectedInspection.checklist_state.map(item => (
                          <div 
                            key={item.id} 
                            className="flex items-center gap-4 p-4 active:bg-muted/70 cursor-pointer touch-manipulation transition-colors"
                            onClick={() => handleChecklistItemToggle(item.id)}
                          >
                            <Checkbox 
                              checked={item.checked}
                              onCheckedChange={() => handleChecklistItemToggle(item.id)}
                              className="h-6 w-6 rounded-md border-2"
                            />
                            <span className={`text-base flex-1 ${item.checked ? 'line-through text-muted-foreground' : 'font-medium'}`}>
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

                {/* Verification Comment */}
                {selectedInspection.verification_comment && (
                  <div>
                    <p className="text-sm font-medium mb-1">Comentário de Verificação</p>
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                      {selectedInspection.verification_comment}
                    </p>
                  </div>
                )}

                {/* Inspection Photos Gallery */}
                {selectedInspection.inspection_photos && selectedInspection.inspection_photos.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Fotos da Inspeção ({selectedInspection.inspection_photos.length})
                    </p>
                    <PhotoGallery 
                      photos={selectedInspection.inspection_photos}
                      title=""
                      emptyMessage="Nenhuma foto disponível"
                    />
                  </div>
                )}

                {/* History Section */}
                {selectedInspection.history && selectedInspection.history.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Histórico
                    </p>
                    <div className="space-y-2 bg-muted/30 rounded-lg p-3">
                      {selectedInspection.history.map((event, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                          <div>
                            <span className="font-medium">
                              {event.action === 'created' && 'Inspeção criada'}
                              {event.action === 'started' && 'Inspeção iniciada'}
                              {event.action === 'completed' && 'Inspeção finalizada'}
                            </span>
                            <span className="text-muted-foreground">
                              {' • '}{format(parseISO(event.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              {event.user_name && ` • ${event.user_name}`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
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

      {/* MENU INFERIOR: Gerenciado pelo MobileAdminLayout - não renderiza aqui */}
    </SidebarProvider>
  );
};

export default Inspections;
