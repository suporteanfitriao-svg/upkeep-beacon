import { useState, useEffect } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, MapPin, Shield, Camera, Check, Smartphone, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  cpf: string;
  whatsapp: string;
  role: 'admin' | 'manager' | 'cleaner';
  is_active: boolean;
  created_at: string;
  activated_at: string | null;
  address_cep: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_district: string | null;
  address_city: string | null;
  address_state: string | null;
}

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  cleaner: 'Auxiliar',
};

const roleDescriptions: Record<string, string> = {
  admin: 'Você tem acesso total às configurações do sistema, gestão de equipe e relatórios.',
  manager: 'Você pode gerenciar propriedades, agendar limpezas e supervisionar a equipe.',
  cleaner: 'Você pode visualizar e executar suas tarefas atribuídas.',
};

export default function Profile() {
  const { user } = useAuth();
  const { role, isAdmin, isManager, loading: roleLoading } = useUserRole();
  const [teamMember, setTeamMember] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    whatsapp: '',
    address_cep: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_district: '',
    address_city: '',
    address_state: '',
  });

  useEffect(() => {
    fetchTeamMember();
  }, [user]);

  const fetchTeamMember = async () => {
    if (!user) return;

    try {
      // First get team_member_id from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('team_member_id')
        .eq('id', user.id)
        .single();

      if (profile?.team_member_id) {
        const { data: member, error } = await supabase
          .from('team_members')
          .select('*')
          .eq('id', profile.team_member_id)
          .single();

        if (error) throw error;

        if (member) {
          setTeamMember(member as TeamMember);
          setFormData({
            whatsapp: member.whatsapp || '',
            address_cep: member.address_cep || '',
            address_street: member.address_street || '',
            address_number: member.address_number || '',
            address_complement: member.address_complement || '',
            address_district: member.address_district || '',
            address_city: member.address_city || '',
            address_state: member.address_state || '',
          });
        }
      } else {
        // Fallback: try to find by email
        const { data: member, error } = await supabase
          .from('team_members')
          .select('*')
          .eq('email', user.email)
          .single();

        if (!error && member) {
          setTeamMember(member as TeamMember);
          setFormData({
            whatsapp: member.whatsapp || '',
            address_cep: member.address_cep || '',
            address_street: member.address_street || '',
            address_number: member.address_number || '',
            address_complement: member.address_complement || '',
            address_district: member.address_district || '',
            address_city: member.address_city || '',
            address_state: member.address_state || '',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching team member:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePersonal = async () => {
    if (!teamMember) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('team_members')
        .update({ whatsapp: formData.whatsapp })
        .eq('id', teamMember.id);

      if (error) throw error;

      setTeamMember({ ...teamMember, whatsapp: formData.whatsapp });
      setEditingPersonal(false);
      toast.success('Informações atualizadas com sucesso');
    } catch (error) {
      console.error('Error updating personal info:', error);
      toast.error('Erro ao atualizar informações');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!teamMember) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('team_members')
        .update({
          address_cep: formData.address_cep || null,
          address_street: formData.address_street || null,
          address_number: formData.address_number || null,
          address_complement: formData.address_complement || null,
          address_district: formData.address_district || null,
          address_city: formData.address_city || null,
          address_state: formData.address_state || null,
        })
        .eq('id', teamMember.id);

      if (error) throw error;

      setTeamMember({
        ...teamMember,
        address_cep: formData.address_cep || null,
        address_street: formData.address_street || null,
        address_number: formData.address_number || null,
        address_complement: formData.address_complement || null,
        address_district: formData.address_district || null,
        address_city: formData.address_city || null,
        address_state: formData.address_state || null,
      });
      setEditingAddress(false);
      toast.success('Endereço atualizado com sucesso');
    } catch (error) {
      console.error('Error updating address:', error);
      toast.error('Erro ao atualizar endereço');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelPersonal = () => {
    setFormData(prev => ({
      ...prev,
      whatsapp: teamMember?.whatsapp || '',
    }));
    setEditingPersonal(false);
  };

  const handleCancelAddress = () => {
    setFormData(prev => ({
      ...prev,
      address_cep: teamMember?.address_cep || '',
      address_street: teamMember?.address_street || '',
      address_number: teamMember?.address_number || '',
      address_complement: teamMember?.address_complement || '',
      address_district: teamMember?.address_district || '',
      address_city: teamMember?.address_city || '',
      address_state: teamMember?.address_state || '',
    }));
    setEditingAddress(false);
  };

  const maskCPF = (cpf: string) => {
    if (!cpf || cpf.length < 11) return cpf;
    return `${cpf.slice(0, 3)}.***.***-${cpf.slice(-2)}`;
  };

  const formatMemberSince = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return 'Data não disponível';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  if (loading || roleLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex flex-col min-h-screen bg-background">
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-10 h-20 bg-card border-b border-border flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="md:hidden" />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Minha Conta</h1>
              <p className="text-sm text-muted-foreground hidden sm:block">Gerencie suas informações e segurança</p>
            </div>
          </div>
          <div className="flex items-center gap-3 pl-4 border-l border-border">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-foreground">{teamMember?.name || user?.email}</p>
              <p className="text-xs text-muted-foreground">{role ? roleLabels[role] : ''}</p>
            </div>
            <div className="relative">
              <Avatar className="w-10 h-10 border-2 border-border">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {teamMember?.name ? getInitials(teamMember.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-card rounded-full"></span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Left Column - Profile Summary */}
            <aside className="w-full lg:w-1/3 flex flex-col gap-6">
              {/* Profile Card */}
              <Card className="shadow-sm">
                <CardContent className="pt-8 pb-8 flex flex-col items-center text-center">
                  <div className="relative mb-6">
                    <Avatar className="w-32 h-32 border-4 border-muted">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-primary/10 text-primary text-3xl">
                        {teamMember?.name ? getInitials(teamMember.name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <button className="absolute bottom-1 right-1 bg-primary text-primary-foreground p-2 rounded-full shadow-lg hover:opacity-90 transition-opacity border-2 border-card">
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{teamMember?.name || 'Usuário'}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{teamMember?.email || user?.email}</p>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 uppercase tracking-wider">
                    {role ? roleLabels[role] : 'Usuário'}
                  </Badge>
                  <Separator className="my-8" />
                  <div className="w-full flex flex-col gap-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Membro desde</span>
                      <span className="text-foreground font-medium capitalize">
                        {teamMember?.created_at ? formatMemberSince(teamMember.created_at) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <span className="flex items-center gap-1.5 text-green-600 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        {teamMember?.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Permissions Card */}
              <Card className="shadow-sm">
                <CardContent className="pt-6 pb-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600">
                      <Check className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-foreground">Perfil e Permissões</h4>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mb-2">Tipo de Conta</p>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100">
                          {role ? roleLabels[role] : 'Usuário'}
                        </Badge>
                        {isAdmin && <Check className="w-4 h-4 text-indigo-600" />}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {role ? roleDescriptions[role] : 'Acesso básico ao sistema.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </aside>

            {/* Right Column - Details */}
            <div className="w-full lg:flex-1 flex flex-col gap-6">
              {/* Personal Info Section */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <User className="w-5 h-5" />
                      </div>
                      <CardTitle className="text-lg">Informações Pessoais</CardTitle>
                    </div>
                    {!editingPersonal ? (
                      <Button variant="ghost" size="sm" className="text-primary hover:text-primary" onClick={() => setEditingPersonal(true)}>
                        <Pencil className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={handleCancelPersonal} disabled={saving}>
                          <X className="w-4 h-4 mr-1" />
                          Cancelar
                        </Button>
                        <Button size="sm" onClick={handleSavePersonal} disabled={saving}>
                          {saving ? 'Salvando...' : 'Salvar'}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">E-mail Corporativo</Label>
                      <Input 
                        value={teamMember?.email || user?.email || ''} 
                        readOnly 
                        className="bg-muted/50 border-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Telefone</Label>
                      <Input 
                        value={formData.whatsapp}
                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                        readOnly={!editingPersonal}
                        className={editingPersonal ? '' : 'bg-muted/50 border-none'}
                        placeholder="+55 (00) 00000-0000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">CPF</Label>
                      <Input 
                        value={teamMember?.cpf ? maskCPF(teamMember.cpf) : ''} 
                        readOnly 
                        className="bg-muted/50 border-none"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Address Section */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <CardTitle className="text-lg">Endereço</CardTitle>
                    </div>
                    {!editingAddress ? (
                      <Button variant="ghost" size="sm" className="text-primary hover:text-primary" onClick={() => setEditingAddress(true)}>
                        <Pencil className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={handleCancelAddress} disabled={saving}>
                          <X className="w-4 h-4 mr-1" />
                          Cancelar
                        </Button>
                        <Button size="sm" onClick={handleSaveAddress} disabled={saving}>
                          {saving ? 'Salvando...' : 'Salvar'}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        CEP <span className="normal-case font-normal">(Opcional)</span>
                      </Label>
                      <Input 
                        value={formData.address_cep}
                        onChange={(e) => setFormData({ ...formData, address_cep: e.target.value })}
                        readOnly={!editingAddress}
                        className={editingAddress ? '' : 'bg-muted/50 border-none'}
                        placeholder="00000-000"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Logradouro <span className="normal-case font-normal">(Opcional)</span>
                      </Label>
                      <Input 
                        value={formData.address_street}
                        onChange={(e) => setFormData({ ...formData, address_street: e.target.value })}
                        readOnly={!editingAddress}
                        className={editingAddress ? '' : 'bg-muted/50 border-none'}
                        placeholder="Rua, Avenida, etc."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Número <span className="normal-case font-normal">(Opcional)</span>
                      </Label>
                      <Input 
                        value={formData.address_number}
                        onChange={(e) => setFormData({ ...formData, address_number: e.target.value })}
                        readOnly={!editingAddress}
                        className={editingAddress ? '' : 'bg-muted/50 border-none'}
                        placeholder="123"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Complemento <span className="normal-case font-normal">(Opcional)</span>
                      </Label>
                      <Input 
                        value={formData.address_complement}
                        onChange={(e) => setFormData({ ...formData, address_complement: e.target.value })}
                        readOnly={!editingAddress}
                        className={editingAddress ? '' : 'bg-muted/50 border-none'}
                        placeholder="Apto, Sala, etc."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Bairro <span className="normal-case font-normal">(Opcional)</span>
                      </Label>
                      <Input 
                        value={formData.address_district}
                        onChange={(e) => setFormData({ ...formData, address_district: e.target.value })}
                        readOnly={!editingAddress}
                        className={editingAddress ? '' : 'bg-muted/50 border-none'}
                        placeholder="Bairro"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Cidade <span className="normal-case font-normal">(Opcional)</span>
                      </Label>
                      <Input 
                        value={formData.address_city}
                        onChange={(e) => setFormData({ ...formData, address_city: e.target.value })}
                        readOnly={!editingAddress}
                        className={editingAddress ? '' : 'bg-muted/50 border-none'}
                        placeholder="Cidade"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Estado <span className="normal-case font-normal">(Opcional)</span>
                      </Label>
                      <Input 
                        value={formData.address_state}
                        onChange={(e) => setFormData({ ...formData, address_state: e.target.value })}
                        readOnly={!editingAddress}
                        className={editingAddress ? '' : 'bg-muted/50 border-none'}
                        placeholder="UF"
                        maxLength={2}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Security Section */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-destructive/10 text-destructive">
                      <Shield className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-lg">Segurança</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Password Reset */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-muted/50 rounded-2xl">
                    <div>
                      <h5 className="font-bold text-foreground text-sm">Senha de Acesso</h5>
                      <p className="text-xs text-muted-foreground">Altere sua senha de acesso ao sistema</p>
                    </div>
                    <Button className="shrink-0">
                      Redefinir Senha
                    </Button>
                  </div>

                  {/* 2FA Toggle */}
                  <div className="flex items-center justify-between p-2">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 flex items-center justify-center shrink-0">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="font-bold text-foreground text-sm">Autenticação em Duas Etapas (2FA)</h5>
                        <p className="text-xs text-muted-foreground">Adicione uma camada extra de segurança à sua conta.</p>
                      </div>
                    </div>
                    <Switch disabled />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Mobile Bottom Spacer */}
          <div className="h-20 md:hidden"></div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 px-6 py-3 flex justify-around items-center text-xs font-medium text-muted-foreground">
          <a href="/" className="flex flex-col items-center gap-1 hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-xl">home</span>
            <span>Início</span>
          </a>
          <a href="/propriedades" className="flex flex-col items-center gap-1 hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-xl">apartment</span>
            <span>Imóveis</span>
          </a>
          <a href="/minha-conta" className="flex flex-col items-center gap-1 text-primary">
            <span className="material-symbols-outlined text-xl">person</span>
            <span>Conta</span>
          </a>
          <a href="/ajuda" className="flex flex-col items-center gap-1 hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-xl">menu</span>
            <span>Menu</span>
          </a>
        </nav>
      </SidebarInset>
    </SidebarProvider>
  );
}
