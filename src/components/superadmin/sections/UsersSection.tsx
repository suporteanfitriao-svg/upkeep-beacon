import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  History,
  UserX,
  UserCheck,
  Plus,
  Loader2,
  Building2,
  Shield
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  cpf: string;
  role: 'superadmin' | 'admin' | 'manager' | 'cleaner';
  is_active: boolean;
  created_at: string;
  activated_at: string | null;
  has_all_properties: boolean;
}

interface Property {
  id: string;
  name: string;
  property_code: string | null;
}

interface TeamMemberProperty {
  id: string;
  team_member_id: string;
  property_id: string;
}

type FilterTab = 'all' | 'superadmin' | 'admin' | 'manager' | 'cleaner' | 'active' | 'inactive';

const ITEMS_PER_PAGE = 10;

// Avatar background colors based on role
const avatarColors: Record<string, string> = {
  superadmin: 'bg-red-100 dark:bg-red-900/30',
  admin: 'bg-teal-100 dark:bg-teal-900/30',
  manager: 'bg-green-100 dark:bg-green-900/30',
  cleaner: 'bg-amber-100 dark:bg-amber-900/30',
};

export function UsersSection() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Create user modal state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    cpf: '',
    whatsapp: '',
    role: 'cleaner' as 'superadmin' | 'admin' | 'manager' | 'cleaner',
  });

  // Permissions modal state
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [memberProperties, setMemberProperties] = useState<string[]>([]);
  const [hasAllProperties, setHasAllProperties] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Toggle status confirmation
  const [toggleStatusDialogOpen, setToggleStatusDialogOpen] = useState(false);
  const [memberToToggle, setMemberToToggle] = useState<TeamMember | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Reset password confirmation
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [memberToReset, setMemberToReset] = useState<TeamMember | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    fetchMembers();
    fetchProperties();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('name');

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name, property_code')
        .order('name');

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const fetchMemberProperties = async (memberId: string) => {
    try {
      const { data, error } = await supabase
        .from('team_member_properties')
        .select('property_id')
        .eq('team_member_id', memberId);

      if (error) throw error;
      return (data || []).map(p => p.property_id);
    } catch (error) {
      console.error('Error fetching member properties:', error);
      return [];
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.cpf.trim() || !newUser.whatsapp.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUser.email.trim())) {
      toast.error('E-mail inválido');
      return;
    }

    // Check for duplicate email
    const emailExists = members.some(m => m.email.toLowerCase() === newUser.email.trim().toLowerCase());
    if (emailExists) {
      toast.error('Este e-mail já está cadastrado');
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('team_members')
        .insert([{
          name: newUser.name.trim(),
          email: newUser.email.trim().toLowerCase(),
          cpf: newUser.cpf.trim(),
          whatsapp: newUser.whatsapp.trim(),
          role: newUser.role,
          is_active: true,
        }])
        .select()
        .single();

      if (error) throw error;

      setMembers(prev => [...prev, data]);
      setNewUser({ name: '', email: '', cpf: '', whatsapp: '', role: 'cleaner' });
      setCreateDialogOpen(false);
      toast.success('Usuário criado com sucesso!');
    } catch (error: any) {
      console.error('Error creating user:', error);
      if (error?.code === '23505') {
        toast.error('Este e-mail ou CPF já está cadastrado');
      } else {
        toast.error('Erro ao criar usuário');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleOpenPermissions = async (member: TeamMember) => {
    setSelectedMember(member);
    setHasAllProperties(member.has_all_properties);
    const props = await fetchMemberProperties(member.id);
    setMemberProperties(props);
    setPermissionsDialogOpen(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedMember) return;

    setSavingPermissions(true);
    try {
      // Update has_all_properties flag
      const { error: updateError } = await supabase
        .from('team_members')
        .update({ has_all_properties: hasAllProperties })
        .eq('id', selectedMember.id);

      if (updateError) throw updateError;

      // Update member properties
      // First delete all existing
      await supabase
        .from('team_member_properties')
        .delete()
        .eq('team_member_id', selectedMember.id);

      // Then insert new ones (only if not has_all_properties)
      if (!hasAllProperties && memberProperties.length > 0) {
        const { error: insertError } = await supabase
          .from('team_member_properties')
          .insert(memberProperties.map(propId => ({
            team_member_id: selectedMember.id,
            property_id: propId,
          })));

        if (insertError) throw insertError;
      }

      // Update local state
      setMembers(prev => prev.map(m => 
        m.id === selectedMember.id 
          ? { ...m, has_all_properties: hasAllProperties }
          : m
      ));

      setPermissionsDialogOpen(false);
      toast.success('Permissões atualizadas com sucesso!');
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Erro ao salvar permissões');
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleToggleProperty = (propertyId: string) => {
    setMemberProperties(prev => 
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const handleToggleStatus = async () => {
    if (!memberToToggle) return;

    setTogglingStatus(true);
    try {
      const newStatus = !memberToToggle.is_active;
      const { error } = await supabase
        .from('team_members')
        .update({ 
          is_active: newStatus,
          activated_at: newStatus ? new Date().toISOString() : null 
        })
        .eq('id', memberToToggle.id);

      if (error) throw error;

      // Log audit
      await supabase.from('team_member_audit_logs').insert({
        team_member_id: memberToToggle.id,
        action: newStatus ? 'ativou_conta' : 'desativou_conta',
        details: { previous_status: memberToToggle.is_active, new_status: newStatus },
      });

      setMembers(prev => prev.map(m => 
        m.id === memberToToggle.id 
          ? { ...m, is_active: newStatus, activated_at: newStatus ? new Date().toISOString() : null }
          : m
      ));

      setToggleStatusDialogOpen(false);
      setMemberToToggle(null);
      toast.success(newStatus ? 'Usuário ativado com sucesso!' : 'Usuário desativado com sucesso!');
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Erro ao alterar status do usuário');
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleResetPassword = async () => {
    if (!memberToReset) return;

    setResettingPassword(true);
    try {
      const { error } = await supabase.functions.invoke('send-password-reset', {
        body: {
          teamMemberId: memberToReset.id,
          teamMemberName: memberToReset.name,
          email: memberToReset.email,
          appUrl: window.location.origin,
        },
      });

      if (error) throw error;

      setResetPasswordDialogOpen(false);
      setMemberToReset(null);
      toast.success('E-mail de redefinição de senha enviado com sucesso!');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error(error?.message || 'Erro ao enviar e-mail de redefinição');
    } finally {
      setResettingPassword(false);
    }
  };

  const filteredMembers = members.filter(m => {
    switch (activeFilter) {
      case 'admin':
        return m.role === 'admin';
      case 'manager':
        return m.role === 'manager';
      case 'cleaner':
        return m.role === 'cleaner';
      case 'active':
        return m.is_active;
      case 'inactive':
        return !m.is_active;
      default:
        return true;
    }
  });

  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE);
  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getUserId = (index: number) => {
    return `#USR-${(9821 - index * 123).toString().padStart(4, '0')}`;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatLastLogin = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca';
    
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 24) {
      const isToday = date.toDateString() === now.toDateString();
      if (isToday) {
        return `Hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      }
      return `Ontem, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'Todos os Usuários' },
    { key: 'admin', label: 'Administrador' },
    { key: 'manager', label: 'Gerente' },
    { key: 'cleaner', label: 'Limpeza' },
    { key: 'active', label: 'Ativos' },
    { key: 'inactive', label: 'Inativos' },
  ];

  const getRoleBadgeStyles = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400';
      case 'manager':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'cleaner':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'manager':
        return 'Gerente';
      case 'cleaner':
        return 'Limpeza';
      default:
        return role;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveFilter(tab.key);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                activeFilter === tab.key
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-card text-muted-foreground border border-border hover:border-primary hover:text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <Button 
          onClick={() => setCreateDialogOpen(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      {/* Users Table */}
      <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 border-b border-border hover:bg-muted/30">
                <TableHead className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Usuário
                </TableHead>
                <TableHead className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Email
                </TableHead>
                <TableHead className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Nível de Acesso
                </TableHead>
                <TableHead className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Permissões
                </TableHead>
                <TableHead className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Status
                </TableHead>
                <TableHead className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Último Login
                </TableHead>
                <TableHead className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-right">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Carregando...
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                paginatedMembers.map((member, index) => {
                  const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + index;
                  
                  return (
                    <TableRow 
                      key={member.id} 
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {/* User */}
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl ${avatarColors[member.role]} flex items-center justify-center`}>
                            <span className="text-sm font-bold text-foreground/70">
                              {getInitials(member.name)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">{member.name}</p>
                            <p className="text-[10px] text-muted-foreground">ID: {getUserId(globalIndex)}</p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Email */}
                      <TableCell className="px-6 py-4">
                        <span className="text-sm text-muted-foreground">{member.email}</span>
                      </TableCell>

                      {/* Access Level */}
                      <TableCell className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeStyles(member.role)}`}>
                          {getRoleLabel(member.role)}
                        </span>
                      </TableCell>

                      {/* Permissions */}
                      <TableCell className="px-6 py-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2 text-xs"
                          onClick={() => handleOpenPermissions(member)}
                        >
                          <Shield className="h-3.5 w-3.5" />
                          {member.has_all_properties ? 'Todas' : 'Específicas'}
                        </Button>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${member.is_active ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                          <span className={`text-sm font-medium ${member.is_active ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {member.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Last Login */}
                      <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                        {formatLastLogin(member.activated_at)}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            title="Resetar Senha"
                            onClick={() => {
                              setMemberToReset(member);
                              setResetPasswordDialogOpen(true);
                            }}
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            title="Ver Atividades"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          {member.is_active ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              title="Desativar Conta"
                              onClick={() => {
                                setMemberToToggle(member);
                                setToggleStatusDialogOpen(true);
                              }}
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-green-500"
                              title="Ativar Conta"
                              onClick={() => {
                                setMemberToToggle(member);
                                setToggleStatusDialogOpen(true);
                              }}
                            >
                              <UserCheck className="h-4 w-4" />
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
        <div className="px-6 py-4 bg-muted/30 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Mostrando{' '}
            <span className="font-bold text-foreground">
              {filteredMembers.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}-
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredMembers.length)}
            </span>{' '}
            de{' '}
            <span className="font-bold text-foreground">{filteredMembers.length}</span>{' '}
            usuários
          </p>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            {Array.from({ length: Math.min(3, totalPages) }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'ghost'}
                size="sm"
                className={`px-3 py-1 h-7 text-xs font-bold ${
                  currentPage === page 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:bg-muted'
                }`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
            
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
            <DialogDescription>
              Preencha os dados para criar um novo usuário no sistema.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-user-name">Nome Completo *</Label>
              <Input
                id="new-user-name"
                placeholder="Nome do usuário"
                value={newUser.name}
                onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-user-email">E-mail *</Label>
              <Input
                id="new-user-email"
                type="email"
                placeholder="email@exemplo.com"
                value={newUser.email}
                onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-user-cpf">CPF *</Label>
                <Input
                  id="new-user-cpf"
                  placeholder="000.000.000-00"
                  value={newUser.cpf}
                  onChange={(e) => setNewUser(prev => ({ ...prev, cpf: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-user-whatsapp">WhatsApp *</Label>
                <Input
                  id="new-user-whatsapp"
                  placeholder="(00) 00000-0000"
                  value={newUser.whatsapp}
                  onChange={(e) => setNewUser(prev => ({ ...prev, whatsapp: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Nível de Acesso *</Label>
              <Select 
                value={newUser.role} 
                onValueChange={(value: 'admin' | 'manager' | 'cleaner') => setNewUser(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="manager">Gerente</SelectItem>
                  <SelectItem value="cleaner">Limpeza</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateUser} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Usuário
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Permissões de Propriedades
            </DialogTitle>
            <DialogDescription>
              Configure quais propriedades {selectedMember?.name} pode acessar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* All properties toggle */}
            <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-lg">
              <Checkbox
                id="has-all-properties"
                checked={hasAllProperties}
                onCheckedChange={(checked) => setHasAllProperties(checked === true)}
              />
              <Label htmlFor="has-all-properties" className="text-sm font-medium cursor-pointer">
                Acesso a todas as propriedades
              </Label>
            </div>

            {/* Property list */}
            {!hasAllProperties && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Selecione as propriedades específicas:
                </Label>
                <ScrollArea className="h-64 border rounded-lg p-2">
                  <div className="space-y-2">
                    {properties.map((property) => (
                      <div 
                        key={property.id}
                        className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-md"
                      >
                        <Checkbox
                          id={`property-${property.id}`}
                          checked={memberProperties.includes(property.id)}
                          onCheckedChange={() => handleToggleProperty(property.id)}
                        />
                        <Label 
                          htmlFor={`property-${property.id}`}
                          className="flex items-center gap-2 text-sm cursor-pointer flex-1"
                        >
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{property.name}</span>
                          {property.property_code && (
                            <span className="text-xs text-muted-foreground">
                              ({property.property_code})
                            </span>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <p className="text-xs text-muted-foreground">
                  {memberProperties.length} de {properties.length} propriedades selecionadas
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermissionsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePermissions} disabled={savingPermissions}>
              {savingPermissions ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Permissões'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Status Confirmation Dialog */}
      <AlertDialog open={toggleStatusDialogOpen} onOpenChange={setToggleStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {memberToToggle?.is_active ? 'Desativar Usuário' : 'Ativar Usuário'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {memberToToggle?.is_active 
                ? `Tem certeza que deseja desativar a conta de ${memberToToggle?.name}? O usuário não poderá mais acessar o sistema.`
                : `Tem certeza que deseja ativar a conta de ${memberToToggle?.name}? O usuário poderá acessar o sistema novamente.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMemberToToggle(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleToggleStatus}
              disabled={togglingStatus}
              className={memberToToggle?.is_active ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {togglingStatus ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : memberToToggle?.is_active ? (
                'Desativar'
              ) : (
                'Ativar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Confirmation Dialog */}
      <AlertDialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetar Senha</AlertDialogTitle>
            <AlertDialogDescription>
              Um e-mail será enviado para <strong>{memberToReset?.email}</strong> com instruções para criar uma nova senha.
              Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMemberToReset(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleResetPassword}
              disabled={resettingPassword}
            >
              {resettingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar E-mail'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
