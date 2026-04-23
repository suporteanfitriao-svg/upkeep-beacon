import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  CalendarCheck,
  Users,
  ClipboardList,
  Bell,
  BarChart3,
  CheckCircle2,
  Sparkles,
  Wrench,
  ArrowRight,
  ShieldCheck,
  Zap,
  Star,
} from "lucide-react";
import logo from "@/assets/cleanbnb-logo.png";

const propertyCountOptions = [
  { value: "1", label: "1 imóvel" },
  { value: "2", label: "2 imóveis" },
  { value: "3-5", label: "3 a 5 imóveis" },
  { value: "5-10", label: "5 a 10 imóveis" },
  { value: "10-20", label: "10 a 20 imóveis" },
  { value: "20-50", label: "20 a 50 imóveis" },
  { value: "50+", label: "Acima de 50 imóveis" },
];

const propertyTypeOptions = [
  { value: "chale", label: "Chalé" },
  { value: "apartamento", label: "Apartamento em Cidade" },
  { value: "quarto", label: "Quarto Compartilhado" },
  { value: "casa-campo", label: "Casa de Campo" },
  { value: "casa-praia", label: "Casa de Praia" },
  { value: "fazenda", label: "Fazenda" },
  { value: "outros", label: "Outros" },
];

const brazilianStates = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const features = [
  {
    icon: CalendarCheck,
    title: "Sincronização Automática",
    description: "Conecte Airbnb, Booking e iCal. Suas reservas viram tarefas de limpeza automaticamente.",
    span: "md:col-span-2",
  },
  {
    icon: Users,
    title: "Gestão de Equipe",
    description: "Atribua faxineiras, controle pagamentos e acompanhe performance.",
    span: "",
  },
  {
    icon: ClipboardList,
    title: "Checklists por Imóvel",
    description: "Padronize a operação com checklists personalizados.",
    span: "",
  },
  {
    icon: Wrench,
    title: "Avarias em Tempo Real",
    description: "Sua equipe reporta, você resolve. Tudo registrado com fotos.",
    span: "",
  },
  {
    icon: Bell,
    title: "Notificações Inteligentes",
    description: "Alertas automáticos via WhatsApp para nunca perder um checkout.",
    span: "md:col-span-2",
  },
  {
    icon: BarChart3,
    title: "Relatórios e Analytics",
    description: "Visualize métricas operacionais e tome decisões com dados.",
    span: "md:col-span-2",
  },
  {
    icon: ShieldCheck,
    title: "Segurança em Camadas",
    description: "Permissões por papel, auditoria completa e dados criptografados.",
    span: "",
  },
];

const stats = [
  { value: "100%", label: "Automatizado" },
  { value: "24/7", label: "Suporte" },
  { value: "+30", label: "Imóveis no beta" },
];

export default function Landing() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    whatsapp: "",
    city: "",
    state: "",
    propertyCount: "",
    propertyType: "",
    propertyTypeOther: "",
    propertyLink: "",
    challenges: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.whatsapp || !formData.propertyCount || !formData.city || !formData.state || !formData.propertyType) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (formData.propertyType === "outros" && !formData.propertyTypeOther) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, especifique o tipo de imóvel.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("waitlist" as any).insert({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        whatsapp: formData.whatsapp.trim(),
        city: formData.city.trim(),
        state: formData.state,
        property_count: formData.propertyCount,
        property_type: formData.propertyType,
        property_type_other: formData.propertyType === "outros" ? formData.propertyTypeOther.trim() : null,
        property_link: formData.propertyLink.trim() || null,
        challenges: formData.challenges.trim() || null,
      } as any);

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: "Cadastro realizado!",
        description: "Você será notificado quando lançarmos.",
      });
    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast({
        title: "Erro ao cadastrar",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/60">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5">
            <img src={logo} alt="Clean&bnb" className="h-9 w-9 object-contain" />
            <span className="font-display font-bold text-lg tracking-tight">
              Clean<span className="text-accent">&</span>bnb
            </span>
          </a>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Recursos</a>
            <a href="#workflow" className="hover:text-foreground transition-colors">Como funciona</a>
            <a href="#waitlist" className="hover:text-foreground transition-colors">Lista de espera</a>
          </nav>
          <Link to="/auth">
            <Button variant="ghost" size="sm" className="font-medium">
              Entrar
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-soft" aria-hidden />
        <div className="absolute top-20 -right-32 w-[500px] h-[500px] rounded-full bg-accent/10 blur-3xl" aria-hidden />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-primary/10 blur-3xl" aria-hidden />

        <div className="relative container mx-auto px-4 sm:px-6 pt-16 pb-20 lg:pt-24 lg:pb-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Badge className="bg-accent/10 text-primary border border-accent/30 px-4 py-1.5 text-xs uppercase tracking-widest font-semibold rounded-full hover:bg-accent/15">
              <Sparkles className="w-3.5 h-3.5 mr-2" />
              Beta exclusivo · Vagas limitadas
            </Badge>

            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]">
              A operação da sua{" "}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-brand bg-clip-text text-transparent">
                  hospedagem
                </span>
                <span className="absolute -bottom-1 left-0 right-0 h-3 bg-accent/30 -z-0 rounded" aria-hidden />
              </span>
              <br className="hidden sm:block" /> sob controle total.
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              <strong className="text-foreground font-semibold">Clean&bnb</strong> é a plataforma que automatiza limpeza, manutenção e equipe dos seus imóveis de temporada — sem planilhas, sem ruído, sem checkouts perdidos.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <a href="#waitlist">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary-dark shadow-brand h-12 px-8 text-base font-semibold w-full sm:w-auto group">
                  Garantir acesso ao beta
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </a>
              <a href="#features">
                <Button size="lg" variant="outline" className="h-12 px-8 text-base font-medium border-border w-full sm:w-auto">
                  Ver recursos
                </Button>
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-xl mx-auto pt-8">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="font-display text-2xl sm:text-3xl font-bold text-primary">{stat.value}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero brand showcase */}
          <div className="relative mt-16 lg:mt-20 max-w-5xl mx-auto">
            <div className="relative rounded-3xl overflow-hidden bg-gradient-brand shadow-brand p-8 sm:p-12 lg:p-16">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)]" aria-hidden />
              <div className="relative grid md:grid-cols-2 gap-8 items-center">
                <div className="text-primary-foreground space-y-4">
                  <Badge className="bg-accent/20 text-accent-foreground border-accent/40 backdrop-blur-sm">
                    <Zap className="w-3 h-3 mr-1" /> Inédito no Brasil
                  </Badge>
                  <h2 className="font-display text-3xl sm:text-4xl font-bold leading-tight">
                    Tudo que você precisa em uma só tela.
                  </h2>
                  <p className="text-primary-foreground/80 text-base leading-relaxed">
                    Calendário sincronizado, equipe alinhada, checklists executados, avarias resolvidas. Sua operação inteira, sem fricção.
                  </p>
                </div>
                <div className="flex justify-center md:justify-end">
                  <div className="bg-card/95 backdrop-blur rounded-2xl p-8 shadow-2xl">
                    <img src={logo} alt="Clean&bnb logo" className="w-44 h-44 sm:w-52 sm:h-52 object-contain" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Bento */}
      <section id="features" className="relative py-20 lg:py-28">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center mb-12 lg:mb-16">
            <Badge variant="outline" className="border-accent/40 text-primary mb-4">Recursos</Badge>
            <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Construído para anfitriões{" "}
              <span className="bg-gradient-brand bg-clip-text text-transparent">obsessivos por qualidade.</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Cada recurso pensado para eliminar tarefas manuais e dar visibilidade real da sua operação.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className={`${feature.span} group relative overflow-hidden border-border/60 hover:border-accent/40 hover:shadow-brand transition-all duration-300 bg-card`}
              >
                <CardContent className="p-6 sm:p-8 h-full flex flex-col">
                  <div className="w-11 h-11 rounded-xl bg-gradient-accent flex items-center justify-center mb-5 shadow-glow group-hover:scale-105 transition-transform">
                    <feature.icon className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <h3 className="font-display text-xl font-bold mb-2 text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow / How it works */}
      <section id="workflow" className="relative py-20 lg:py-28 bg-gradient-soft">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <Badge variant="outline" className="border-accent/40 text-primary mb-4">Como funciona</Badge>
            <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Em 3 passos sua operação roda sozinha.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { n: "01", t: "Conecte seu calendário", d: "Cole o link iCal do Airbnb, Booking ou da sua plataforma. As reservas chegam em tempo real." },
              { n: "02", t: "Configure seus imóveis", d: "Cadastre checklists, equipes e regras de cobrança. Personalize por unidade." },
              { n: "03", t: "Acompanhe e relaxe", d: "Sua equipe é notificada, executa, fotografa e finaliza. Você acompanha tudo pelo dashboard." },
            ].map((step) => (
              <div key={step.n} className="relative group">
                <div className="absolute -inset-px rounded-2xl bg-gradient-brand opacity-0 group-hover:opacity-10 transition-opacity" />
                <div className="relative bg-card border border-border/60 rounded-2xl p-8 h-full">
                  <div className="font-display text-5xl font-extrabold bg-gradient-brand bg-clip-text text-transparent mb-4">
                    {step.n}
                  </div>
                  <h3 className="font-display text-xl font-bold mb-2">{step.t}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Waitlist Form */}
      <section id="waitlist" className="relative py-20 lg:py-28">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-5 gap-12 max-w-6xl mx-auto items-start">
            {/* Left - Pitch */}
            <div className="lg:col-span-2 lg:sticky lg:top-24 space-y-6">
              <Badge className="bg-accent/10 text-primary border border-accent/30 rounded-full">
                <Star className="w-3 h-3 mr-1.5" /> Acesso gratuito ao beta
              </Badge>
              <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
                Seja um dos primeiros a operar com{" "}
                <span className="bg-gradient-brand bg-clip-text text-transparent">Clean&bnb.</span>
              </h2>
              <p className="text-muted-foreground text-base leading-relaxed">
                Os selecionados para o beta terão acesso completo e gratuito durante todo o período de testes — e influenciarão diretamente o roadmap.
              </p>
              <ul className="space-y-3 pt-2">
                {[
                  "Acesso completo sem cobrança no período beta",
                  "Onboarding personalizado por especialista",
                  "Canal direto com o time de produto",
                  "Condições especiais no lançamento oficial",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-foreground">
                    <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right - Form */}
            <div className="lg:col-span-3">
              <Card className="border-border/60 shadow-brand">
                <CardHeader className="pb-4">
                  <CardTitle className="font-display text-2xl">
                    {submitted ? "Obrigado pelo interesse!" : "Garantir minha vaga"}
                  </CardTitle>
                  <CardDescription>
                    {submitted ? "Entraremos em contato quando lançarmos." : "Preencha em menos de 1 minuto."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {submitted ? (
                    <div className="text-center py-10">
                      <div className="w-20 h-20 rounded-full bg-gradient-brand flex items-center justify-center mx-auto mb-4 shadow-brand">
                        <CheckCircle2 className="w-10 h-10 text-primary-foreground" />
                      </div>
                      <p className="text-muted-foreground">
                        Você receberá atualizações no email e WhatsApp cadastrados.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2 space-y-2">
                          <Label htmlFor="name">Nome *</Label>
                          <Input id="name" placeholder="Seu nome completo" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email *</Label>
                          <Input id="email" type="email" placeholder="seu@email.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="whatsapp">WhatsApp *</Label>
                          <Input id="whatsapp" placeholder="(11) 99999-9999" value={formData.whatsapp} onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="city">Cidade *</Label>
                          <Input id="city" placeholder="Sua cidade" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">Estado *</Label>
                          <Select value={formData.state} onValueChange={(value) => setFormData({ ...formData, state: value })}>
                            <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                            <SelectContent>
                              {brazilianStates.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="propertyCount">Qtd. de imóveis *</Label>
                          <Select value={formData.propertyCount} onValueChange={(value) => setFormData({ ...formData, propertyCount: value })}>
                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              {propertyCountOptions.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="propertyType">Tipo de imóvel *</Label>
                          <Select value={formData.propertyType} onValueChange={(value) => setFormData({ ...formData, propertyType: value, propertyTypeOther: "" })}>
                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              {propertyTypeOptions.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                        {formData.propertyType === "outros" && (
                          <div className="sm:col-span-2 space-y-2">
                            <Label htmlFor="propertyTypeOther">Especifique o tipo *</Label>
                            <Input id="propertyTypeOther" placeholder="Descreva o tipo de imóvel" value={formData.propertyTypeOther} onChange={(e) => setFormData({ ...formData, propertyTypeOther: e.target.value })} />
                          </div>
                        )}
                        <div className="sm:col-span-2 space-y-2">
                          <Label htmlFor="propertyLink">Link do seu imóvel (opcional)</Label>
                          <Input id="propertyLink" placeholder="https://airbnb.com/rooms/..." value={formData.propertyLink} onChange={(e) => setFormData({ ...formData, propertyLink: e.target.value })} />
                        </div>
                        <div className="sm:col-span-2 space-y-2">
                          <Label htmlFor="challenges">Maiores dificuldades com gestão de limpeza?</Label>
                          <Textarea id="challenges" placeholder="Conte-nos sobre seus desafios..." rows={3} value={formData.challenges} onChange={(e) => setFormData({ ...formData, challenges: e.target.value })} className="resize-none" />
                        </div>
                      </div>
                      <Button type="submit" size="lg" className="w-full bg-primary text-primary-foreground hover:bg-primary-dark shadow-brand h-12 text-base font-semibold" disabled={isSubmitting}>
                        {isSubmitting ? "Cadastrando..." : "Quero participar do beta"}
                        {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-10 bg-card">
        <div className="container mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="Clean&bnb" className="h-7 w-7 object-contain" />
            <span className="font-display font-bold text-sm">
              Clean<span className="text-accent">&</span>bnb
            </span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Clean&bnb. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
