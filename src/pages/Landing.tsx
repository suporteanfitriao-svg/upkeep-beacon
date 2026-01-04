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
  Wrench,
  Zap,
  Gift
} from "lucide-react";

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
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const features = [
  {
    icon: CalendarCheck,
    title: "Agendamento Automático",
    description: "Sincronização com Airbnb e outras plataformas"
  },
  {
    icon: Users,
    title: "Gestão de Equipe",
    description: "Controle completo da sua equipe de limpeza"
  },
  {
    icon: ClipboardList,
    title: "Checklists Personalizados",
    description: "Checklists específicos para cada imóvel"
  },
  {
    icon: Wrench,
    title: "Controle de Avarias",
    description: "Problemas de manutenção em tempo real"
  },
  {
    icon: Bell,
    title: "Notificações WhatsApp",
    description: "Alertas automáticos para sua equipe"
  },
  {
    icon: BarChart3,
    title: "Relatórios Detalhados",
    description: "Métricas e performance da operação"
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
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Neon background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px]" />
      </div>

      {/* Floating Badge */}
      <div className="fixed top-6 left-6 z-50 animate-pulse">
        <Badge className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white border-0 px-4 py-2 text-sm font-bold shadow-lg shadow-cyan-500/30">
          <Zap className="w-4 h-4 mr-2" />
          INÉDITO NO BRASIL
        </Badge>
      </div>

      {/* Hero Section */}
      <div className="relative container mx-auto px-4 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left side - Content */}
          <div className="space-y-8 pt-8 lg:pt-16">
            <div className="space-y-4">
              <Badge variant="outline" className="border-cyan-500/50 text-cyan-400 px-4 py-1.5 text-sm bg-cyan-500/10">
                <Sparkles className="w-4 h-4 mr-2" />
                Lançamento em breve
              </Badge>
              
              <h1 className="text-5xl lg:text-7xl font-black">
                <span className="bg-gradient-to-r from-white via-cyan-200 to-white bg-clip-text text-transparent">
                  Superhost
                </span>
                <br />
                <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Lab
                </span>
              </h1>
              
              <p className="text-2xl lg:text-3xl font-light text-cyan-300">
                Gestão de Limpeza
              </p>
              
              <p className="text-lg text-gray-400 max-w-md leading-relaxed">
                A plataforma completa para gestão de limpeza de imóveis de temporada. 
                Automatize sua operação e nunca mais perca um checkout.
              </p>
            </div>

            {/* Free Card */}
            <Card className="bg-gradient-to-r from-cyan-500 to-purple-600 border-0 max-w-md shadow-2xl shadow-cyan-500/40 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
              <CardContent className="p-6 flex items-start gap-4 relative">
                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 ring-2 ring-white/30">
                  <Gift className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-black text-white">USE GRÁTIS!</h3>
                    <Badge className="bg-yellow-400 text-yellow-900 text-xs font-bold border-0">
                      TEMPO LIMITADO
                    </Badge>
                  </div>
                  <p className="text-sm text-white/90 font-medium">
                    Cadastre-se agora e use <strong>gratuitamente por tempo limitado</strong> se você for selecionado para o programa beta exclusivo.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              {features.map((feature, index) => (
                <div 
                  key={index} 
                  className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-500/50 transition-colors"
                >
                  <feature.icon className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">{feature.title}</h4>
                    <p className="text-xs text-gray-400">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Form */}
          <div className="lg:sticky lg:top-8">
            <Card className="bg-[#12121a]/90 border border-white/10 backdrop-blur-xl shadow-2xl shadow-cyan-500/10">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl text-white">
                  {submitted ? "Obrigado pelo interesse!" : "Seja um dos primeiros"}
                </CardTitle>
                <CardDescription className="text-gray-400">
                  {submitted 
                    ? "Entraremos em contato quando lançarmos." 
                    : "Garanta seu acesso antecipado e gratuito"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {submitted ? (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-10 h-10 text-white" />
                    </div>
                    <p className="text-gray-400">
                      Você receberá atualizações no email e WhatsApp cadastrados.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="name" className="text-gray-300">Nome *</Label>
                        <Input
                          id="name"
                          placeholder="Seu nome completo"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-cyan-500"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-300">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="seu@email.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-cyan-500"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="whatsapp" className="text-gray-300">WhatsApp *</Label>
                        <Input
                          id="whatsapp"
                          placeholder="(11) 99999-9999"
                          value={formData.whatsapp}
                          onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                          className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-cyan-500"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="city" className="text-gray-300">Cidade *</Label>
                        <Input
                          id="city"
                          placeholder="Sua cidade"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-cyan-500"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="state" className="text-gray-300">Estado *</Label>
                        <Select
                          value={formData.state}
                          onValueChange={(value) => setFormData({ ...formData, state: value })}
                        >
                          <SelectTrigger className="bg-white/5 border-white/20 text-white focus:border-cyan-500">
                            <SelectValue placeholder="UF" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a24] border-white/20">
                            {brazilianStates.map((state) => (
                              <SelectItem key={state} value={state} className="text-white hover:bg-white/10">
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="propertyCount" className="text-gray-300">Qtd. de imóveis *</Label>
                        <Select
                          value={formData.propertyCount}
                          onValueChange={(value) => setFormData({ ...formData, propertyCount: value })}
                        >
                          <SelectTrigger className="bg-white/5 border-white/20 text-white focus:border-cyan-500">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a24] border-white/20">
                            {propertyCountOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value} className="text-white hover:bg-white/10">
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="propertyType" className="text-gray-300">Tipo de imóvel *</Label>
                        <Select
                          value={formData.propertyType}
                          onValueChange={(value) => setFormData({ ...formData, propertyType: value, propertyTypeOther: "" })}
                        >
                          <SelectTrigger className="bg-white/5 border-white/20 text-white focus:border-cyan-500">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a24] border-white/20">
                            {propertyTypeOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value} className="text-white hover:bg-white/10">
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.propertyType === "outros" && (
                        <div className="col-span-2 space-y-2">
                          <Label htmlFor="propertyTypeOther" className="text-gray-300">Especifique o tipo *</Label>
                          <Input
                            id="propertyTypeOther"
                            placeholder="Descreva o tipo de imóvel"
                            value={formData.propertyTypeOther}
                            onChange={(e) => setFormData({ ...formData, propertyTypeOther: e.target.value })}
                            className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-cyan-500"
                          />
                        </div>
                      )}

                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="propertyLink" className="text-gray-300">Link do seu imóvel (Airbnb, Booking, etc.)</Label>
                        <Input
                          id="propertyLink"
                          placeholder="https://airbnb.com/rooms/..."
                          value={formData.propertyLink}
                          onChange={(e) => setFormData({ ...formData, propertyLink: e.target.value })}
                          className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-cyan-500"
                        />
                      </div>

                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="challenges" className="text-gray-300">
                          Maiores dificuldades com gestão de limpeza?
                        </Label>
                        <Textarea
                          id="challenges"
                          placeholder="Conte-nos sobre seus desafios..."
                          rows={3}
                          value={formData.challenges}
                          onChange={(e) => setFormData({ ...formData, challenges: e.target.value })}
                          className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-cyan-500 resize-none"
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-bold py-6 text-lg shadow-lg shadow-cyan-500/30 transition-all hover:shadow-cyan-500/50" 
                      size="lg"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Cadastrando..." : "Quero participar do lançamento"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative border-t border-white/10 py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          <p>© 2024 Superhost Lab. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
