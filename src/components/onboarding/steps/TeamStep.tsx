import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, ArrowLeft, ArrowRight, Loader2, Trash2, Shield, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TeamStepProps {
  onNext: () => void;
  onBack: () => void;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function TeamStep({ onNext, onBack }: TeamStepProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMember, setNewMember] = useState({ name: '', email: '', cpf: '', whatsapp: '', role: 'cleaner' });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('id, name, email, role')
        .order('name');

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast.error('Erro ao carregar equipe');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMember.name.trim() || !newMember.email.trim() || !newMember.cpf.trim() || !newMember.whatsapp.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newMember.email.trim())) {
      toast.error('E-mail inválido');
      return;
    }

    // Check for duplicate email in local state
    const emailExists = members.some(m => m.email.toLowerCase() === newMember.email.trim().toLowerCase());
    if (emailExists) {
      toast.error('Este e-mail já está cadastrado na equipe');
      return;
    }

    setAdding(true);
    try {
      // Check for duplicate email in database
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('email', newMember.email.trim().toLowerCase())
        .maybeSingle();

      if (existingMember) {
        toast.error('Este e-mail já está cadastrado no sistema');
        setAdding(false);
        return;
      }

      const { data, error } = await supabase
        .from('team_members')
        .insert([{
          name: newMember.name,
          email: newMember.email.trim().toLowerCase(),
          cpf: newMember.cpf,
          whatsapp: newMember.whatsapp,
          role: newMember.role as 'admin' | 'manager' | 'cleaner',
        }])
        .select()
        .single();

      if (error) throw error;

      setMembers(prev => [...prev, data]);
      setNewMember({ name: '', email: '', cpf: '', whatsapp: '', role: 'cleaner' });
      toast.success('Membro adicionado com sucesso!');
    } catch (error: any) {
      console.error('Error adding team member:', error);
      if (error?.code === '23505') {
        toast.error('Este e-mail já está cadastrado no sistema');
      } else {
        toast.error('Erro ao adicionar membro');
      }
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (id: string) => {
    try {
      const { error } = await supabase.from('team_members').delete().eq('id', id);
      if (error) throw error;
      setMembers(prev => prev.filter(m => m.id !== id));
      toast.success('Membro removido');
    } catch (error) {
      console.error('Error removing team member:', error);
      toast.error('Erro ao remover membro');
    }
  };

  const getRoleIcon = (role: string) => {
    if (role === 'admin' || role === 'manager') return <Shield className="h-4 w-4 text-primary" />;
    return <User className="h-4 w-4 text-muted-foreground" />;
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'manager': return 'Gerente';
      case 'cleaner': return 'Limpeza';
      default: return role;
    }
  };

  return (
    <div className="max-w-2xl w-full">
      <div className="text-center mb-8">
        <div className="mb-6 flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Users className="h-7 w-7" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Sua Equipe</h2>
        <p className="text-muted-foreground">
          Adicione os membros da sua equipe de limpeza e manutenção.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Adicionar Membro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="member-name">Nome *</Label>
              <Input
                id="member-name"
                placeholder="Nome completo"
                value={newMember.name}
                onChange={(e) => setNewMember(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-email">E-mail *</Label>
              <Input
                id="member-email"
                type="email"
                placeholder="email@exemplo.com"
                value={newMember.email}
                onChange={(e) => setNewMember(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-cpf">CPF *</Label>
              <Input
                id="member-cpf"
                placeholder="000.000.000-00"
                value={newMember.cpf}
                onChange={(e) => setNewMember(prev => ({ ...prev, cpf: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-whatsapp">WhatsApp *</Label>
              <Input
                id="member-whatsapp"
                placeholder="(00) 00000-0000"
                value={newMember.whatsapp}
                onChange={(e) => setNewMember(prev => ({ ...prev, whatsapp: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Função</Label>
            <Select value={newMember.role} onValueChange={(value) => setNewMember(prev => ({ ...prev, role: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cleaner">Limpeza</SelectItem>
                <SelectItem value="manager">Gerente</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAddMember} disabled={adding}>
            {adding ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Adicionar
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Membros da Equipe</CardTitle>
          <CardDescription>
            {members.length} membro{members.length !== 1 ? 's' : ''} cadastrado{members.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum membro cadastrado ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      {getRoleIcon(member.role)}
                      {getRoleLabel(member.role)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveMember(member.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={onNext} disabled={members.length === 0}>
          Próximo
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
      {members.length === 0 && (
        <p className="text-xs text-destructive text-center mt-2">
          Adicione pelo menos um membro da equipe para continuar.
        </p>
      )}
    </div>
  );
}
