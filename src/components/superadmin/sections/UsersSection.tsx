import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  History,
  UserX,
  UserCheck,
  Plus,
  Loader2
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  cpf: string;
  role: 'admin' | 'manager' | 'cleaner';
  is_active: boolean;
  created_at: string;
  activated_at: string | null;
}

type FilterTab = 'all' | 'admin' | 'manager' | 'cleaner' | 'active' | 'inactive';

const ITEMS_PER_PAGE = 10;

// Avatar background colors based on role
const avatarColors: Record<string, string> = {
  admin: 'bg-teal-100 dark:bg-teal-900/30',
  manager: 'bg-green-100 dark:bg-green-900/30',
  cleaner: 'bg-amber-100 dark:bg-amber-900/30',
};

export function UsersSection() {
  const [members, setMembers] = useState<TeamMember[]>([]);
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
    role: 'cleaner' as 'admin' | 'manager' | 'cleaner',
  });

  useEffect(() => {
    fetchMembers();
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
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Carregando...
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-green-500"
                              title="Ativar Conta"
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
    </div>
  );
}
