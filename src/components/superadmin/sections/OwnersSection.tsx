import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Building2, Users, AlertCircle, Home, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface OwnerRow {
  user_id: string;
  legal_name: string;
  document_type: string;
  document_number: string;
  billing_email: string | null;
  created_at: string;
  email: string | null;
  name: string | null;
  property_count: number;
  team_count: number;
  plan_name: string | null;
  plan_status: string | null;
}

interface Plan {
  id: string;
  name: string;
  slug: string;
  max_properties: number;
}

const initialForm = {
  email: '',
  password: '',
  name: '',
  document_type: 'cpf' as 'cpf' | 'cnpj',
  document_number: '',
  legal_name: '',
  trade_name: '',
  billing_phone: '',
  billing_address: '',
  billing_city: '',
  billing_state: '',
  billing_cep: '',
  notes: '',
  plan_id: 'none',
  plan_expires_at: '',
};

// --- Validation helpers ---
const onlyDigits = (v: string) => v.replace(/\D/g, '');

const formatDocument = (v: string, type: 'cpf' | 'cnpj') => {
  const d = onlyDigits(v);
  if (type === 'cpf') {
    return d
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return d
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};

const isValidCPF = (cpf: string): boolean => {
  const d = onlyDigits(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  if (rev !== parseInt(d[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  return rev === parseInt(d[10]);
};

const isValidCNPJ = (cnpj: string): boolean => {
  const d = onlyDigits(cnpj);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (base: string, weights: number[]) => {
    const sum = weights.reduce((acc, w, i) => acc + parseInt(base[i]) * w, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, ...w1];
  return calc(d.slice(0, 12), w1) === parseInt(d[12]) && calc(d.slice(0, 13), w2) === parseInt(d[13]);
};

const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export function OwnersSection() {
  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState<string | null>(null);

  // Assisted property onboarding state
  const [propOpen, setPropOpen] = useState(false);
  const [propOwner, setPropOwner] = useState<{ user_id: string; legal_name: string } | null>(null);
  const [propSubmitting, setPropSubmitting] = useState(false);
  const [propError, setPropError] = useState<string | null>(null);
  const [propList, setPropList] = useState<{ id: string; name: string; property_code: string | null }[]>([]);
  const [propForm, setPropForm] = useState({
    name: '',
    address: '',
    default_check_in_time: '14:00',
    default_check_out_time: '11:00',
    max_guests: 10,
    airbnb_ical_url: '',
  });

  const openPropertyWizard = async (owner: { user_id: string; legal_name: string }) => {
    setPropOwner(owner);
    setPropError(null);
    setPropForm({
      name: '',
      address: '',
      default_check_in_time: '14:00',
      default_check_out_time: '11:00',
      max_guests: 10,
      airbnb_ical_url: '',
    });
    const { data } = await supabase
      .from('properties')
      .select('id, name, property_code')
      .eq('owner_user_id', owner.user_id)
      .order('created_at', { ascending: false });
    setPropList(data || []);
    setPropOpen(true);
  };

  const handleAddProperty = async () => {
    if (!propOwner) return;
    setPropError(null);
    if (!propForm.name.trim()) {
      setPropError('Informe o nome do imóvel.');
      return;
    }
    setPropSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('superadmin-create-property', {
        body: {
          owner_user_id: propOwner.user_id,
          name: propForm.name,
          address: propForm.address || undefined,
          default_check_in_time: propForm.default_check_in_time
            ? `${propForm.default_check_in_time}:00`
            : undefined,
          default_check_out_time: propForm.default_check_out_time
            ? `${propForm.default_check_out_time}:00`
            : undefined,
          max_guests: Number(propForm.max_guests) || 10,
          airbnb_ical_url: propForm.airbnb_ical_url || undefined,
        },
      });
      const fnError = (data as { error?: string } | null)?.error;
      if (fnError) throw new Error(fnError);
      if (error) throw error;

      toast.success(`Imóvel "${propForm.name}" cadastrado`);
      setPropForm({
        name: '',
        address: '',
        default_check_in_time: '14:00',
        default_check_out_time: '11:00',
        max_guests: 10,
        airbnb_ical_url: '',
      });
      // Refresh list
      const { data: refreshed } = await supabase
        .from('properties')
        .select('id, name, property_code')
        .eq('owner_user_id', propOwner.user_id)
        .order('created_at', { ascending: false });
      setPropList(refreshed || []);
      loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar imóvel';
      setPropError(msg);
      toast.error(msg);
    } finally {
      setPropSubmitting(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: ownerProfiles }, { data: plansData }] = await Promise.all([
        supabase
          .from('owner_profiles')
          .select('user_id, legal_name, document_type, document_number, billing_email, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('subscription_plans')
          .select('id, name, slug, max_properties')
          .eq('is_active', true)
          .order('price_monthly'),
      ]);

      setPlans(plansData || []);

      if (!ownerProfiles || ownerProfiles.length === 0) {
        setOwners([]);
        return;
      }

      const userIds = ownerProfiles.map((o) => o.user_id);

      const [profilesRes, propsRes, teamRes, subsRes] = await Promise.all([
        supabase.from('profiles').select('id, email, name').in('id', userIds),
        supabase.from('properties').select('owner_user_id').in('owner_user_id', userIds),
        supabase.from('team_members').select('owner_user_id').in('owner_user_id', userIds),
        supabase
          .from('subscriptions')
          .select('user_id, status, plan_id, subscription_plans(name)')
          .in('user_id', userIds),
      ]);

      const profileMap = new Map(profilesRes.data?.map((p) => [p.id, p]) || []);
      const propCount = new Map<string, number>();
      propsRes.data?.forEach((p) => {
        propCount.set(p.owner_user_id, (propCount.get(p.owner_user_id) || 0) + 1);
      });
      const teamCount = new Map<string, number>();
      teamRes.data?.forEach((t) => {
        teamCount.set(t.owner_user_id, (teamCount.get(t.owner_user_id) || 0) + 1);
      });
      const subMap = new Map(subsRes.data?.map((s) => [s.user_id, s]) || []);

      setOwners(
        ownerProfiles.map((o) => {
          const sub = subMap.get(o.user_id) as { status: string; subscription_plans: { name: string } | null } | undefined;
          const profile = profileMap.get(o.user_id);
          return {
            user_id: o.user_id,
            legal_name: o.legal_name,
            document_type: o.document_type,
            document_number: o.document_number,
            billing_email: o.billing_email,
            created_at: o.created_at,
            email: profile?.email ?? null,
            name: profile?.name ?? null,
            property_count: propCount.get(o.user_id) || 0,
            team_count: teamCount.get(o.user_id) || 0,
            plan_name: sub?.subscription_plans?.name ?? null,
            plan_status: sub?.status ?? null,
          };
        }),
      );
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar proprietários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async () => {
    setFormError(null);

    // 1. Required fields
    if (!form.email || !form.password || !form.name || !form.document_number || !form.legal_name) {
      setFormError('Preencha todos os campos obrigatórios (*).');
      return;
    }
    // 2. Email
    if (!isValidEmail(form.email)) {
      setFormError('Email inválido.');
      return;
    }
    // 3. Password
    if (form.password.length < 8) {
      setFormError('A senha temporária deve ter pelo menos 8 caracteres.');
      return;
    }
    // 4. Document validity (digits + checksum)
    const cleanedDoc = onlyDigits(form.document_number);
    if (form.document_type === 'cpf' && !isValidCPF(cleanedDoc)) {
      setFormError('CPF inválido. Verifique os dígitos.');
      return;
    }
    if (form.document_type === 'cnpj' && !isValidCNPJ(cleanedDoc)) {
      setFormError('CNPJ inválido. Verifique os dígitos.');
      return;
    }

    setSubmitting(true);
    try {
      // 5. Pre-check duplicate document on the database (avoids transactional rollback)
      const { data: dupDoc } = await supabase
        .from('owner_profiles')
        .select('user_id, legal_name')
        .eq('document_type', form.document_type)
        .eq('document_number', cleanedDoc)
        .maybeSingle();
      if (dupDoc) {
        setFormError(`Já existe um cliente com este ${form.document_type.toUpperCase()} (${dupDoc.legal_name}).`);
        setSubmitting(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('superadmin-create-owner', {
        body: {
          email: form.email,
          password: form.password,
          name: form.name,
          document_type: form.document_type,
          document_number: cleanedDoc,
          legal_name: form.legal_name,
          trade_name: form.trade_name || undefined,
          billing_phone: form.billing_phone || undefined,
          billing_address: form.billing_address || undefined,
          billing_city: form.billing_city || undefined,
          billing_state: form.billing_state || undefined,
          billing_cep: form.billing_cep || undefined,
          notes: form.notes || undefined,
          plan_id: form.plan_id !== 'none' ? form.plan_id : undefined,
          plan_expires_at: form.plan_expires_at || undefined,
        },
      });

      // Edge function returns structured error in body even on non-2xx
      const fnError = (data as { error?: string } | null)?.error;
      if (fnError) throw new Error(fnError);
      if (error) {
        // Try to surface the body error message
        const ctx = (error as { context?: { body?: string } }).context;
        if (ctx?.body) {
          try {
            const parsed = JSON.parse(ctx.body);
            if (parsed?.error) throw new Error(parsed.error);
          } catch {
            // fallthrough
          }
        }
        throw error;
      }

      toast.success('Proprietário cadastrado com sucesso');
      const createdOwner = {
        user_id: (data as { user_id?: string } | null)?.user_id || '',
        legal_name: form.legal_name,
      };
      setForm(initialForm);
      setFormError(null);
      setOpen(false);
      loadData();
      // Auto-open assisted property wizard
      if (createdOwner.user_id) {
        setTimeout(() => openPropertyWizard(createdOwner), 300);
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Erro desconhecido ao cadastrar';
      // Friendlier mapping of common backend errors
      let friendly = raw;
      if (/duplicate|já existe|already/i.test(raw)) {
        friendly = 'Já existe um cliente com este documento ou email.';
      } else if (/email/i.test(raw) && /registered|exists/i.test(raw)) {
        friendly = 'Este email já está cadastrado em outra conta.';
      } else if (/role|owner_profile|subscription/i.test(raw)) {
        friendly = `Falha ao configurar o cliente (${raw}). A conta foi revertida — tente novamente.`;
      }
      setFormError(friendly);
      toast.error(friendly);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Proprietários (Clientes)</h2>
          <p className="text-sm text-muted-foreground">
            Cadastre novos clientes e gerencie seus dados fiscais e planos
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Cadastrar cliente
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : owners.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Nenhum proprietário cadastrado ainda
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome / Razão Social</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead className="text-center">Imóveis</TableHead>
                <TableHead className="text-center">Equipe</TableHead>
                <TableHead>Cadastrado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {owners.map((o) => (
                <TableRow key={o.user_id}>
                  <TableCell>
                    <div className="font-medium">{o.legal_name}</div>
                    {o.name && o.name !== o.legal_name && (
                      <div className="text-xs text-muted-foreground">{o.name}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="uppercase text-muted-foreground mr-1">{o.document_type}</span>
                    {o.document_number}
                  </TableCell>
                  <TableCell className="text-sm">{o.email || o.billing_email}</TableCell>
                  <TableCell>
                    {o.plan_name ? (
                      <Badge variant={o.plan_status === 'active' ? 'default' : 'secondary'}>
                        {o.plan_name}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Sem plano</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="inline-flex items-center gap-1 text-sm">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      {o.property_count}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="inline-flex items-center gap-1 text-sm">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      {o.team_count}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openPropertyWizard({ user_id: o.user_id, legal_name: o.legal_name })}
                    >
                      <Home className="mr-1 h-3 w-3" />
                      Imóveis
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setFormError(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar novo cliente</DialogTitle>
            <DialogDescription>
              Conta de acesso, dados fiscais e plano (opcional)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {formError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Conta de acesso</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Nome *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Senha temporária *</Label>
                  <Input
                    type="text"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Dados fiscais</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Tipo *</Label>
                  <Select
                    value={form.document_type}
                    onValueChange={(v) => setForm({ ...form, document_type: v as 'cpf' | 'cnpj' })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpf">CPF</SelectItem>
                      <SelectItem value="cnpj">CNPJ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Número *</Label>
                  <Input
                    value={form.document_number}
                    onChange={(e) => setForm({ ...form, document_number: formatDocument(e.target.value, form.document_type) })}
                    placeholder={form.document_type === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Razão social / Nome completo *</Label>
                  <Input
                    value={form.legal_name}
                    onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Nome fantasia</Label>
                  <Input
                    value={form.trade_name}
                    onChange={(e) => setForm({ ...form, trade_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Telefone</Label>
                  <Input
                    value={form.billing_phone}
                    onChange={(e) => setForm({ ...form, billing_phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>CEP</Label>
                  <Input
                    value={form.billing_cep}
                    onChange={(e) => setForm({ ...form, billing_cep: e.target.value })}
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Endereço</Label>
                  <Input
                    value={form.billing_address}
                    onChange={(e) => setForm({ ...form, billing_address: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Cidade</Label>
                  <Input
                    value={form.billing_city}
                    onChange={(e) => setForm({ ...form, billing_city: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>UF</Label>
                  <Input
                    maxLength={2}
                    value={form.billing_state}
                    onChange={(e) => setForm({ ...form, billing_state: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Notas internas</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Plano (opcional)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Plano</Label>
                  <Select
                    value={form.plan_id}
                    onValueChange={(v) => setForm({ ...form, plan_id: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Sem plano" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem plano (definir depois)</SelectItem>
                      {plans.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — até {p.max_properties} imóvel(is)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Expira em</Label>
                  <Input
                    type="date"
                    value={form.plan_expires_at}
                    onChange={(e) => setForm({ ...form, plan_expires_at: e.target.value })}
                    disabled={form.plan_id === 'none'}
                  />
                </div>
              </div>
            </section>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cadastrar cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assisted property onboarding */}
      <Dialog open={propOpen} onOpenChange={(v) => { setPropOpen(v); if (!v) setPropError(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Imóveis de {propOwner?.legal_name}</DialogTitle>
            <DialogDescription>
              Cadastre imóveis em nome deste cliente. Eles aparecerão na conta dele automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {propError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{propError}</AlertDescription>
              </Alert>
            )}

            {propList.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Imóveis já cadastrados ({propList.length})</h3>
                <div className="rounded-md border divide-y">
                  {propList.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{p.name}</span>
                      </div>
                      {p.property_code && (
                        <Badge variant="outline" className="font-mono text-xs">{p.property_code}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Adicionar novo imóvel</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <Label>Nome do imóvel *</Label>
                  <Input
                    value={propForm.name}
                    onChange={(e) => setPropForm({ ...propForm, name: e.target.value })}
                    placeholder="Ex: Apto Copacabana 502"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Endereço completo</Label>
                  <Input
                    value={propForm.address}
                    onChange={(e) => setPropForm({ ...propForm, address: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Check-in padrão</Label>
                  <Input
                    type="time"
                    value={propForm.default_check_in_time}
                    onChange={(e) => setPropForm({ ...propForm, default_check_in_time: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Check-out padrão</Label>
                  <Input
                    type="time"
                    value={propForm.default_check_out_time}
                    onChange={(e) => setPropForm({ ...propForm, default_check_out_time: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Capacidade máxima</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={propForm.max_guests}
                    onChange={(e) => setPropForm({ ...propForm, max_guests: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>URL iCal (Airbnb / Booking) — opcional</Label>
                  <Input
                    value={propForm.airbnb_ical_url}
                    onChange={(e) => setPropForm({ ...propForm, airbnb_ical_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </section>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPropOpen(false)} disabled={propSubmitting}>
              Concluir
            </Button>
            <Button onClick={handleAddProperty} disabled={propSubmitting}>
              {propSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Plus className="mr-1 h-4 w-4" />
              Adicionar imóvel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}