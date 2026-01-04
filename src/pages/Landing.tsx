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
import { 
  CalendarCheck, 
  Users, 
  ClipboardList, 
  Bell, 
  BarChart3, 
  Smartphone,
  CheckCircle2,
  Sparkles,
  Home,
  Wrench
} from "lucide-react";

const propertyOptions = [
  { value: "1", label: "1 imóvel" },
  { value: "2", label: "2 imóveis" },
  { value: "3-5", label: "3 a 5 imóveis" },
  { value: "5-10", label: "5 a 10 imóveis" },
  { value: "10-20", label: "10 a 20 imóveis" },
  { value: "20-50", label: "20 a 50 imóveis" },
  { value: "50+", label: "Acima de 50 imóveis" },
];

const features = [
  {
    icon: CalendarCheck,
    title: "Agendamento Automático",
    description: "Sincronização automática com calendários do Airbnb e outras plataformas"
  },
  {
    icon: Users,
    title: "Gestão de Equipe",
    description: "Controle completo da sua equipe de limpeza com atribuição de tarefas"
  },
  {
    icon: ClipboardList,
    title: "Checklists Personalizados",
    description: "Crie checklists específicos para cada imóvel garantindo qualidade"
  },
  {
    icon: Wrench,
    title: "Controle de Avarias",
    description: "Registre e acompanhe problemas de manutenção em tempo real"
  },
  {
    icon: Bell,
    title: "Notificações em Tempo Real",
    description: "Alertas automáticos para sua equipe via WhatsApp"
  },
  {
    icon: BarChart3,
    title: "Relatórios e Métricas",
    description: "Acompanhe a performance da sua operação com dados detalhados"
  },
  {
    icon: Smartphone,
    title: "Acesso Mobile",
    description: "Aplicativo otimizado para uso em campo pela equipe de limpeza"
  },
  {
    icon: Home,
    title: "Multi-propriedades",
    description: "Gerencie todos os seus imóveis em um único lugar"
  },
];

export default function Landing() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    whatsapp: "",
    propertyCount: "",
    challenges: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.whatsapp || !formData.propertyCount) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
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
        property_count: formData.propertyCount,
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/5" />
        <div className="container mx-auto px-4 py-16 md:py-24 relative">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm">
              <Sparkles className="w-4 h-4 mr-2" />
              Em breve
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
              Superhost Lab
            </h1>
            <p className="text-2xl md:text-3xl text-primary font-semibold mb-6">
              Gestão de Limpeza
            </p>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              A plataforma completa para gestão de limpeza de imóveis de temporada. 
              Automatize sua operação e nunca mais perca um checkout.
            </p>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
          Funcionalidades que vão transformar sua operação
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Form Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-lg mx-auto">
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">
                {submitted ? "Obrigado pelo interesse!" : "Seja um dos primeiros"}
              </CardTitle>
              <CardDescription className="text-base">
                {submitted 
                  ? "Entraremos em contato quando lançarmos." 
                  : "Cadastre-se para receber novidades e acesso antecipado"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-muted-foreground">
                    Você receberá atualizações no email e WhatsApp cadastrados.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      placeholder="Seu nome completo"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp *</Label>
                    <Input
                      id="whatsapp"
                      placeholder="(11) 99999-9999"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="propertyCount">Quantos imóveis você administra? *</Label>
                    <Select
                      value={formData.propertyCount}
                      onValueChange={(value) => setFormData({ ...formData, propertyCount: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma opção" />
                      </SelectTrigger>
                      <SelectContent>
                        {propertyOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="challenges">
                      Quais as maiores dificuldades atualmente com a gestão de limpeza?
                    </Label>
                    <Textarea
                      id="challenges"
                      placeholder="Conte-nos sobre seus desafios..."
                      rows={4}
                      value={formData.challenges}
                      onChange={(e) => setFormData({ ...formData, challenges: e.target.value })}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Cadastrando..." : "Quero ser avisado do lançamento"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>© 2024 Superhost Lab. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
