import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Phone, Mail, UserCheck, UserX, Building2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate } from 'react-router-dom';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  cpf: string;
  whatsapp: string;
  role: 'admin' | 'manager' | 'cleaner';
  is_active: boolean;
  has_all_properties: boolean;
  created_at: string;
}

interface Property {
  id: string;
  name: string;
}

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  cleaner: 'Limpeza',
};

const roleColors: Record<string, string> = {
  admin: 'bg-primary text-primary-foreground',
  manager: 'bg-secondary text-secondary-foreground',
  cleaner: 'bg-muted text-muted-foreground',
};

function formatCPF(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  return numbers
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function formatWhatsApp(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
}

export default function Team() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    whatsapp: '',
    role: 'cleaner' as 'admin' | 'manager' | 'cleaner',
    hasAllProperties: true,
    selectedProperties: [] as string[],
  });

  useEffect(() => {
    if (isAdmin) {
      fetchMembers();
      fetchProperties();
    }
  }, [isAdmin]);

  async function fetchMembers() {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Erro ao carregar membros da equipe');
    } finally {
      setLoading(false);
    }
  }

  async function fetchProperties() {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  }

  async function fetchMemberProperties(memberId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('team_member_properties')
        .select('property_id')
        .eq('team_member_id', memberId);

      if (error) throw error;
      return data?.map(p => p.property_id) || [];
    } catch (error) {
      console.error('Error fetching member properties:', error);
      return [];
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      email: '',
      cpf: '',
      whatsapp: '',
      role: 'cleaner',
      hasAllProperties: true,
      selectedProperties: [],
    });
    setEditingMember(null);
  }

  async function handleEdit(member: TeamMember) {
    const memberProperties = await fetchMemberProperties(member.id);
    setEditingMember(member);
    setFormData({
      name: member.name,
      email: member.email,
      cpf: formatCPF(member.cpf),
      whatsapp: formatWhatsApp(member.whatsapp),
      role: member.role,
      hasAllProperties: member.has_all_properties,
      selectedProperties: memberProperties,
    });
    setDialogOpen(true);
  }

  async function sendInviteEmail(name: string, email: string, role: string) {
    try {
      const appUrl = window.location.origin;
      const { data, error } = await supabase.functions.invoke('send-team-invite', {
        body: { name, email, role, appUrl },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      console.log('Invite email sent successfully');
    } catch (error) {
      console.error('Error sending invite email:', error);
      toast.error('Membro cadastrado, mas houve erro ao enviar email');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const cleanCPF = formData.cpf.replace(/\D/g, '');
    const cleanWhatsApp = formData.whatsapp.replace(/\D/g, '');

    if (cleanCPF.length !== 11) {
      toast.error('CPF deve ter 11 dígitos');
      setSubmitting(false);
      return;
    }

    if (cleanWhatsApp.length < 10) {
      toast.error('WhatsApp inválido');
      setSubmitting(false);
      return;
    }

    if (!formData.hasAllProperties && formData.selectedProperties.length === 0) {
      toast.error('Selecione ao menos uma propriedade');
      setSubmitting(false);
      return;
    }

    try {
      if (editingMember) {
        const { error } = await supabase
          .from('team_members')
          .update({
            name: formData.name,
            email: formData.email,
            cpf: cleanCPF,
            whatsapp: cleanWhatsApp,
            role: formData.role,
            has_all_properties: formData.hasAllProperties,
          })
          .eq('id', editingMember.id);

        if (error) throw error;

        // Update property access
        await supabase
          .from('team_member_properties')
          .delete()
          .eq('team_member_id', editingMember.id);

        if (!formData.hasAllProperties && formData.selectedProperties.length > 0) {
          const propertyInserts = formData.selectedProperties.map(propertyId => ({
            team_member_id: editingMember.id,
            property_id: propertyId,
          }));

          const { error: propError } = await supabase
            .from('team_member_properties')
            .insert(propertyInserts);

          if (propError) throw propError;
        }

        toast.success('Membro atualizado com sucesso');
      } else {
        const { data: newMember, error } = await supabase
          .from('team_members')
          .insert({
            name: formData.name,
            email: formData.email,
            cpf: cleanCPF,
            whatsapp: cleanWhatsApp,
            role: formData.role,
            has_all_properties: formData.hasAllProperties,
          })
          .select()
          .single();

        if (error) throw error;

        // Insert property access for new member
        if (!formData.hasAllProperties && formData.selectedProperties.length > 0) {
          const propertyInserts = formData.selectedProperties.map(propertyId => ({
            team_member_id: newMember.id,
            property_id: propertyId,
          }));

          await supabase
            .from('team_member_properties')
            .insert(propertyInserts);
        }

        // Send invite email
        await sendInviteEmail(formData.name, formData.email, formData.role);
        toast.success('Membro cadastrado e email enviado!');
      }

      resetForm();
      setDialogOpen(false);
      fetchMembers();
    } catch (error: any) {
      console.error('Error saving member:', error);
      if (error.message?.includes('duplicate')) {
        toast.error('CPF ou email já cadastrado');
      } else {
        toast.error('Erro ao salvar membro');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(member: TeamMember) {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ is_active: !member.is_active })
        .eq('id', member.id);

      if (error) throw error;
      toast.success(member.is_active ? 'Membro desativado' : 'Membro ativado');
      fetchMembers();
    } catch (error) {
      console.error('Error toggling member:', error);
      toast.error('Erro ao atualizar membro');
    }
  }

  async function handleDelete(member: TeamMember) {
    if (!confirm(`Deseja excluir ${member.name}?`)) return;

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', member.id);

      if (error) throw error;
      toast.success('Membro excluído');
      fetchMembers();
    } catch (error) {
      console.error('Error deleting member:', error);
      toast.error('Erro ao excluir membro');
    }
  }

  function toggleProperty(propertyId: string) {
    setFormData(prev => ({
      ...prev,
      selectedProperties: prev.selectedProperties.includes(propertyId)
        ? prev.selectedProperties.filter(id => id !== propertyId)
        : [...prev.selectedProperties, propertyId],
    }));
  }

  function selectAllProperties() {
    setFormData(prev => ({
      ...prev,
      selectedProperties: properties.map(p => p.id),
    }));
  }

  function deselectAllProperties() {
    setFormData(prev => ({
      ...prev,
      selectedProperties: [],
    }));
  }

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Equipe</h1>
                <p className="text-muted-foreground">Gerencie os membros da sua equipe</p>
              </div>

              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Membro
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingMember ? 'Editar Membro' : 'Novo Membro'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome completo</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cpf">CPF</Label>
                        <Input
                          id="cpf"
                          value={formData.cpf}
                          onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                          placeholder="000.000.000-00"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="whatsapp">WhatsApp</Label>
                        <Input
                          id="whatsapp"
                          value={formData.whatsapp}
                          onChange={(e) => setFormData({ ...formData, whatsapp: formatWhatsApp(e.target.value) })}
                          placeholder="(00) 00000-0000"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">Função</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(value: 'admin' | 'manager' | 'cleaner') =>
                          setFormData({ ...formData, role: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="manager">Gerente (visualiza sem modificar)</SelectItem>
                          <SelectItem value="cleaner">Limpeza (visualiza mobile)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-4 pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Acesso às Propriedades
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {formData.hasAllProperties ? 'Acesso a todas as propriedades' : 'Acesso restrito'}
                          </p>
                        </div>
                        <Switch
                          checked={formData.hasAllProperties}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, hasAllProperties: checked, selectedProperties: [] })
                          }
                        />
                      </div>

                      {!formData.hasAllProperties && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {formData.selectedProperties.length} de {properties.length} selecionadas
                            </span>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={selectAllProperties}
                              >
                                Todas
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={deselectAllProperties}
                              >
                                Nenhuma
                              </Button>
                            </div>
                          </div>

                          <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                            {properties.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                Nenhuma propriedade cadastrada
                              </p>
                            ) : (
                              properties.map((property) => (
                                <label
                                  key={property.id}
                                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                                >
                                  <Checkbox
                                    checked={formData.selectedProperties.includes(property.id)}
                                    onCheckedChange={() => toggleProperty(property.id)}
                                  />
                                  <span className="text-sm">{property.name}</span>
                                </label>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={submitting}>
                        {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {editingMember ? 'Salvar' : 'Cadastrar'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : members.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Nenhum membro cadastrado</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {members.map((member) => (
                  <Card key={member.id} className={!member.is_active ? 'opacity-60' : ''}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {member.name}
                            {!member.is_active && (
                              <Badge variant="outline" className="text-xs">Inativo</Badge>
                            )}
                          </CardTitle>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            <Badge className={roleColors[member.role]}>
                              {roleLabels[member.role]}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <Building2 className="h-3 w-3 mr-1" />
                              {member.has_all_properties ? 'Todas' : 'Restrito'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleActive(member)}
                            title={member.is_active ? 'Desativar' : 'Ativar'}
                          >
                            {member.is_active ? (
                              <UserX className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <UserCheck className="h-4 w-4 text-primary" />
                            )}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(member)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(member)}
                            className="hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{member.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{formatWhatsApp(member.whatsapp)}</span>
                      </div>
                      <div className="text-muted-foreground">
                        CPF: {formatCPF(member.cpf)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
