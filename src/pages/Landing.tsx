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
        <div className="absolute top-0 left-1/4 w-48 sm:w-96 h-48 sm:h-96 bg-cyan-500/15 sm:bg-cyan-500/20 rounded-full blur-[80px] sm:blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-48 sm:w-96 h-48 sm:h-96 bg-purple-500/15 sm:bg-purple-500/20 rounded-full blur-[80px] sm:blur-[120px]" />
        <div className="hidden sm:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] lg:w-[600px] h-[400px] lg:h-[600px] bg-blue-500/10 rounded-full blur-[150px]" />
      </div>

      {/* Floating Badge */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 md:fixed md:top-6 md:left-6 md:translate-x-0 z-50 animate-pulse">
        <Badge className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white border-0 px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm font-bold shadow-lg shadow-cyan-500/30">
          <Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
          INÉDITO NO BRASIL
        </Badge>
      </div>

      {/* Hero Section */}
      <div className="relative container mx-auto px-4 pt-16 pb-8 sm:py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Left side - Content */}
          <div className="space-y-6 sm:space-y-8 text-center lg:text-left">
            <div className="space-y-4">
              <Badge variant="outline" className="border-cyan-500/50 text-cyan-400 px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm bg-cyan-500/10">
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                Lançamento em breve
              </Badge>
              
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black">
                <span className="bg-gradient-to-r from-white via-cyan-200 to-white bg-clip-text text-transparent">
                  Superhost
                </span>
                <br />
                <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Lab
                </span>
              </h1>
              
              <p className="text-xl sm:text-2xl lg:text-3xl font-light text-cyan-300">
                Gestão de Limpeza
              </p>
              
              <p className="text-base sm:text-lg text-gray-400 max-w-md mx-auto lg:mx-0 leading-relaxed">
                A plataforma completa para gestão de limpeza de imóveis de temporada. 
                Automatize sua operação e nunca mais perca um checkout.
              </p>
            </div>

            {/* Free Card */}
            <Card className="bg-gradient-to-r from-cyan-600 to-purple-700 border-0 max-w-md mx-auto lg:mx-0 shadow-2xl shadow-purple-500/30 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
              <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4 relative text-center sm:text-left">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white">Acesso Gratuito ao Beta</h3>
                    <Badge className="bg-white/20 text-white text-[10px] sm:text-xs font-medium border-0 backdrop-blur-sm">
                      Vagas Limitadas
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                    Seja um dos primeiros a testar. Candidatos selecionados terão acesso completo e gratuito durante o período beta.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2 sm:pt-4">
              {features.map((feature, index) => (
                <div 
                  key={index} 
                  className="flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-500/50 transition-colors"
                >
                  <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <h4 className="text-sm font-semibold text-white">{feature.title}</h4>
                    <p className="text-xs text-gray-400">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Form */}
          <div className="mt-4 lg:mt-0 lg:sticky lg:top-8">
            <Card className="bg-[#12121a]/90 border border-white/10 backdrop-blur-xl shadow-2xl shadow-cyan-500/10">
              <CardHeader className="text-center pb-4 px-4 sm:px-6">
                <CardTitle className="text-xl sm:text-2xl text-white">
                  {submitted ? "Obrigado pelo interesse!" : "Seja um dos primeiros"}
                </CardTitle>
                <CardDescription className="text-gray-400 text-sm">
                  {submitted 
                    ? "Entraremos em contato quando lançarmos." 
                    : "Garanta seu acesso antecipado e gratuito"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                {submitted ? (
                  <div className="text-center py-6 sm:py-8">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </div>
                    <p className="text-gray-400 text-sm sm:text-base">
                      Você receberá atualizações no email e WhatsApp cadastrados.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2 space-y-2">
                        <Label htmlFor="name" className="text-gray-300 text-sm">Nome *</Label>
                        <Input
                          id="name"
                          placeholder="Seu nome completo"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-cyan-500 h-11 sm:h-10"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-300 text-sm">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="seu@email.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-cyan-500 h-11 sm:h-10"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="whatsapp" className="text-gray-300 text-sm">WhatsApp *</Label>
                        <Input
                          id="whatsapp"
                          placeholder="(11) 99999-9999"
                          value={formData.whatsapp}
                          onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                          className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-cyan-500 h-11 sm:h-10"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="city" className="text-gray-300 text-sm">Cidade *</Label>
                        <Input
                          id="city"
                          placeholder="Sua cidade"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-cyan-500 h-11 sm:h-10"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="state" className="text-gray-300 text-sm">Estado *</Label>
                        <Select
                          value={formData.state}
                          onValueChange={(value) => setFormData({ ...formData, state: value })}
                        >
                          <SelectTrigger className="bg-white/5 border-white/20 text-white focus:border-cyan-500 h-11 sm:h-10">
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
                        <Label htmlFor="propertyCount" className="text-gray-300 text-sm">Qtd. de imóveis *</Label>
                        <Select
                          value={formData.propertyCount}
                          onValueChange={(value) => setFormData({ ...formData, propertyCount: value })}
                        >
                          <SelectTrigger className="bg-white/5 border-white/20 text-white focus:border-cyan-500 h-11 sm:h-10">
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
                        <Label htmlFor="propertyType" className="text-gray-300 text-sm">Tipo de imóvel *</Label>
                        <Select
                          value={formData.propertyType}
                          onValueChange={(value) => setFormData({ ...formData, propertyType: value, propertyTypeOther: "" })}
                        >
                          <SelectTrigger className="bg-white/5 border-white/20 text-white focus:border-cyan-500 h-11 sm:h-10">
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
                        <div className="sm:col-span-2 space-y-2">
                          <Label htmlFor="propertyTypeOther" className="text-gray-300 text-sm">Especifique o tipo *</Label>
                          <Input
                            id="propertyTypeOther"
                            placeholder="Descreva o tipo de imóvel"
                            value={formData.propertyTypeOther}
                            onChange={(e) => setFormData({ ...formData, propertyTypeOther: e.target.value })}
                            className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-cyan-500 h-11 sm:h-10"
                          />
                        </div>
                      )}

                      <div className="sm:col-span-2 space-y-2">
                        <Label htmlFor="propertyLink" className="text-gray-300 text-sm">Link do seu imóvel (Airbnb, Booking, etc.)</Label>
                        <Input
                          id="propertyLink"
                          placeholder="https://airbnb.com/rooms/..."
                          value={formData.propertyLink}
                          onChange={(e) => setFormData({ ...formData, propertyLink: e.target.value })}
                          className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-cyan-500 h-11 sm:h-10"
                        />
                      </div>

                      <div className="sm:col-span-2 space-y-2">
                        <Label htmlFor="challenges" className="text-gray-300 text-sm">
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
                      className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-bold py-4 sm:py-6 text-base sm:text-lg shadow-lg shadow-cyan-500/30 transition-all hover:shadow-cyan-500/50" 
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
      <footer className="relative border-t border-white/10 py-6 sm:py-8 mt-8 sm:mt-16">
        <div className="container mx-auto px-4 text-center text-gray-500 text-xs sm:text-sm">
          <p>© 2024 Superhost Lab. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
