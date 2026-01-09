import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  AlertTriangle, 
  Wrench, 
  CheckCircle2, 
  Clock,
  Search,
  Filter,
  User,
  Calendar,
  MapPin,
  ChevronDown,
  ChevronUp,
  X,
  MessageSquare,
  FileText
} from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMaintenanceIssues, MaintenanceIssue } from '@/hooks/useMaintenanceIssues';
import { useCompletedSchedules } from '@/hooks/useCompletedSchedules';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ReportFilters, SortField, SortOrder } from '@/components/reports/ReportFilters';
import { ReportStatsCards } from '@/components/reports/ReportStatsCards';
import { CompletedScheduleRow } from '@/components/reports/CompletedScheduleRow';
import { ScheduleDetailReadOnly } from '@/components/reports/ScheduleDetailReadOnly';
import { Schedule } from '@/types/scheduling';

function MaintenanceStatCard({ 
  title, 
  count, 
  icon: Icon, 
  variant 
}: { 
  title: string; 
  count: number; 
  icon: React.ElementType; 
  variant: 'warning' | 'info' | 'success' | 'danger';
}) {
  const variantStyles = {
    warning: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    info: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    success: 'bg-green-500/10 text-green-600 border-green-500/20',
    danger: 'bg-red-500/10 text-red-600 border-red-500/20',
  };

  const iconStyles = {
    warning: 'text-yellow-600',
    info: 'text-blue-600',
    success: 'text-green-600',
    danger: 'text-red-600',
  };

  return (
    <Card className={`border ${variantStyles[variant]}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{count}</p>
          </div>
          <Icon className={`w-8 h-8 ${iconStyles[variant]}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function IssueCard({ 
  issue, 
  onResolve, 
  onAssign,
  teamMembers
}: { 
  issue: MaintenanceIssue; 
  onResolve: (issue: MaintenanceIssue) => void;
  onAssign: (issue: MaintenanceIssue) => void;
  teamMembers: { id: string; name: string }[];
}) {
  const [expanded, setExpanded] = useState(false);

  const severityBadge = {
    low: { label: 'Baixa', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
    medium: { label: 'Média', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
    high: { label: 'Alta', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
  };

  const statusBadge = {
    open: { label: 'Aberta', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
    in_progress: { label: 'Em Andamento', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    resolved: { label: 'Resolvida', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header - Always visible */}
        <div 
          className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="font-semibold truncate">{issue.property_name}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{issue.category}</p>
              <p className="text-sm line-clamp-2">{issue.description}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-2">
                <Badge className={severityBadge[issue.severity].className}>
                  {severityBadge[issue.severity].label}
                </Badge>
                <Badge className={statusBadge[issue.status].className}>
                  {statusBadge[issue.status].label}
                </Badge>
              </div>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(issue.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
            {issue.reported_by_name && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                Reportado por: {issue.reported_by_name}
              </div>
            )}
            {issue.assigned_to_name && (
              <div className="flex items-center gap-1">
                <Wrench className="w-3 h-3" />
                Responsável: {issue.assigned_to_name}
              </div>
            )}
          </div>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="border-t bg-muted/30 p-4 space-y-4">
            {issue.photo_url && (
              <div>
                <p className="text-sm font-medium mb-2">Foto</p>
                <img 
                  src={issue.photo_url} 
                  alt="Foto da avaria" 
                  className="rounded-lg max-h-48 object-cover"
                />
              </div>
            )}

            {issue.status === 'resolved' && (
              <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                <p className="text-sm font-medium text-green-600 mb-1">Resolvida</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  {issue.resolved_at && (
                    <p>Data: {format(new Date(issue.resolved_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                  )}
                  {issue.resolved_by_name && <p>Por: {issue.resolved_by_name}</p>}
                  {issue.resolution_notes && <p>Notas: {issue.resolution_notes}</p>}
                </div>
              </div>
            )}

            {issue.status !== 'resolved' && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAssign(issue);
                  }}
                >
                  <User className="w-4 h-4 mr-1" />
                  {issue.assigned_to ? 'Alterar Responsável' : 'Atribuir Responsável'}
                </Button>
                <Button 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResolve(issue);
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Encerrar Avaria
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Manutencao() {
  const { issues, isLoading, stats, resolveIssue, assignIssue } = useMaintenanceIssues();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<MaintenanceIssue | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [selectedTeamMember, setSelectedTeamMember] = useState<string>('');
  const [activeTab, setActiveTab] = useState('avarias');

  // Report filters state
  const [reportStartDate, setReportStartDate] = useState<Date | undefined>();
  const [reportEndDate, setReportEndDate] = useState<Date | undefined>();
  const [reportPropertyFilter, setReportPropertyFilter] = useState('all');
  const [reportResponsibleFilter, setReportResponsibleFilter] = useState('all');
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [reportSortField, setReportSortField] = useState<SortField>('date');
  const [reportSortOrder, setReportSortOrder] = useState<SortOrder>('desc');
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

  // Fetch completed schedules for reports
  const { schedules: completedSchedules, loading: reportsLoading, stats: reportStats } = useCompletedSchedules({
    startDate: reportStartDate,
    endDate: reportEndDate,
    propertyId: reportPropertyFilter,
    responsibleId: reportResponsibleFilter,
    searchQuery: reportSearchQuery,
    sortField: reportSortField,
    sortOrder: reportSortOrder,
  });

  // Fetch team members for assignment
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members-simple'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      const matchesSearch = 
        issue.property_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || issue.status === statusFilter;
      const matchesSeverity = severityFilter === 'all' || issue.severity === severityFilter;

      return matchesSearch && matchesStatus && matchesSeverity;
    });
  }, [issues, searchQuery, statusFilter, severityFilter]);

  const handleResolve = (issue: MaintenanceIssue) => {
    setSelectedIssue(issue);
    setResolutionNotes('');
    setResolveDialogOpen(true);
  };

  const handleAssign = (issue: MaintenanceIssue) => {
    setSelectedIssue(issue);
    setSelectedTeamMember(issue.assigned_to || '');
    setAssignDialogOpen(true);
  };

  const confirmResolve = async () => {
    if (!selectedIssue) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user?.id)
      .single();

    resolveIssue({
      id: selectedIssue.id,
      resolution_notes: resolutionNotes,
      resolved_by_name: profile?.name || 'Usuário',
    });
    
    setResolveDialogOpen(false);
    setSelectedIssue(null);
  };

  const confirmAssign = () => {
    if (!selectedIssue || !selectedTeamMember) return;
    
    const member = teamMembers.find(m => m.id === selectedTeamMember);
    
    assignIssue({
      id: selectedIssue.id,
      assigned_to: selectedTeamMember,
      assigned_to_name: member?.name || '',
    });
    
    setAssignDialogOpen(false);
    setSelectedIssue(null);
  };

  // Show schedule detail read-only modal
  if (selectedSchedule) {
    return <ScheduleDetailReadOnly schedule={selectedSchedule} onClose={() => setSelectedSchedule(null)} />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
          <DashboardHeader />

          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-1">Gestão e Relatórios</h2>
            <p className="text-muted-foreground">Acompanhe avarias e visualize relatórios de atendimentos</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="avarias" className="gap-2">
                <Wrench className="w-4 h-4" />
                Avarias
              </TabsTrigger>
              <TabsTrigger value="relatorios" className="gap-2">
                <FileText className="w-4 h-4" />
                Relatórios
              </TabsTrigger>
            </TabsList>

            {/* Avarias Tab */}
            <TabsContent value="avarias" className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <MaintenanceStatCard 
                  title="Abertas" 
                  count={stats.open} 
                  icon={AlertTriangle} 
                  variant="warning" 
                />
                <MaintenanceStatCard 
                  title="Em Andamento" 
                  count={stats.in_progress} 
                  icon={Clock} 
                  variant="info" 
                />
                <MaintenanceStatCard 
                  title="Resolvidas" 
                  count={stats.resolved} 
                  icon={CheckCircle2} 
                  variant="success" 
                />
                <MaintenanceStatCard 
                  title="Alta Prioridade" 
                  count={stats.high_severity} 
                  icon={Wrench} 
                  variant="danger" 
                />
              </div>

              {/* Filters */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar por propriedade, descrição..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos Status</SelectItem>
                        <SelectItem value="open">Abertas</SelectItem>
                        <SelectItem value="in_progress">Em Andamento</SelectItem>
                        <SelectItem value="resolved">Resolvidas</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={severityFilter} onValueChange={setSeverityFilter}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Severidade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="low">Baixa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Issues List */}
              <div className="space-y-4">
                {isLoading ? (
                  <>
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                  </>
                ) : filteredIssues.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Wrench className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">Nenhuma avaria encontrada</p>
                      <p className="text-sm text-muted-foreground">
                        {searchQuery || statusFilter !== 'all' || severityFilter !== 'all' 
                          ? 'Tente ajustar os filtros de busca'
                          : 'Quando avarias forem reportadas, elas aparecerão aqui'}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredIssues.map(issue => (
                    <IssueCard 
                      key={issue.id} 
                      issue={issue}
                      onResolve={handleResolve}
                      onAssign={handleAssign}
                      teamMembers={teamMembers}
                    />
                  ))
                )}
              </div>
            </TabsContent>

            {/* Relatórios Tab */}
            <TabsContent value="relatorios" className="space-y-6">
              <ReportStatsCards stats={reportStats} />
              
              <ReportFilters
                startDate={reportStartDate}
                endDate={reportEndDate}
                propertyFilter={reportPropertyFilter}
                responsibleFilter={reportResponsibleFilter}
                searchQuery={reportSearchQuery}
                sortField={reportSortField}
                sortOrder={reportSortOrder}
                onStartDateChange={setReportStartDate}
                onEndDateChange={setReportEndDate}
                onPropertyFilterChange={setReportPropertyFilter}
                onResponsibleFilterChange={setReportResponsibleFilter}
                onSearchChange={setReportSearchQuery}
                onSortChange={(field, order) => {
                  setReportSortField(field);
                  setReportSortOrder(order);
                }}
              />

              {/* Completed Schedules List */}
              <div className="space-y-3">
                {reportsLoading ? (
                  <>
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </>
                ) : completedSchedules.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">Nenhum atendimento encontrado</p>
                      <p className="text-sm text-muted-foreground">
                        Ajuste os filtros ou aguarde atendimentos serem finalizados
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  completedSchedules.map(schedule => (
                    <CompletedScheduleRow
                      key={schedule.id}
                      schedule={schedule}
                      onClick={() => setSelectedSchedule(schedule)}
                    />
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encerrar Avaria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-medium">{selectedIssue?.property_name}</p>
              <p className="text-xs text-muted-foreground">{selectedIssue?.category}</p>
              <p className="text-sm mt-1">{selectedIssue?.description}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resolution-notes">Notas da Resolução</Label>
              <Textarea
                id="resolution-notes"
                placeholder="Descreva como o problema foi resolvido..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmResolve} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Confirmar Encerramento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir Responsável</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-medium">{selectedIssue?.property_name}</p>
              <p className="text-xs text-muted-foreground">{selectedIssue?.category}</p>
              <p className="text-sm mt-1">{selectedIssue?.description}</p>
            </div>
            <div className="space-y-2">
              <Label>Selecione o Responsável</Label>
              <Select value={selectedTeamMember} onValueChange={setSelectedTeamMember}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um membro da equipe" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmAssign} disabled={!selectedTeamMember}>
              <User className="w-4 h-4 mr-1" />
              Confirmar Atribuição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
