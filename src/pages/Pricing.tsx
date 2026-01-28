/**
 * Página de Pricing - Planos comerciais
 * REGRA: Apenas Proprietário vê preços e faz upgrade
 */

import { useState } from 'react';
import { Check, Building2, Users, Calendar, ClipboardCheck, Wrench, Bell, Package, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSubscriptionPlans, useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';

const FEATURE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  limpezas: Calendar,
  checklists: ClipboardCheck,
  inspecoes: ClipboardCheck,
  avarias: Wrench,
  notificacoes: Bell,
  inventario: Package,
  multiplas_propriedades: Building2,
};

const FEATURE_LABELS: Record<string, string> = {
  limpezas: 'Gestão de Limpezas',
  checklists: 'Checklists Personalizados',
  inspecoes: 'Sistema de Inspeções',
  avarias: 'Registro de Avarias',
  notificacoes: 'Notificações em Tempo Real',
  inventario: 'Inventário do Imóvel',
  multiplas_propriedades: 'Múltiplas Propriedades',
};

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { plans, loading: plansLoading } = useSubscriptionPlans();
  const { subscription, hasActiveSubscription } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSelectPlan = (planSlug: string) => {
    setSelectedPlan(planSlug);
    
    if (!user) {
      // Redireciona para auth com o plano selecionado
      navigate(`/auth?plan=${planSlug}`);
    } else {
      // Redireciona para checkout (futuro: integração Hotmart)
      navigate(`/checkout?plan=${planSlug}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100 dark:from-[#1a1d21] dark:to-[#22252a]">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/landing')}>
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <img src={logo} alt="Super Host Lab" className="w-8 h-8 object-contain" />
            </div>
            <span className="font-bold text-lg">Super Host Lab</span>
          </div>
          
          {user ? (
            <Button variant="outline" onClick={() => navigate('/')}>
              Ir para Dashboard
            </Button>
          ) : (
            <Button variant="outline" onClick={() => navigate('/auth')}>
              Entrar
            </Button>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-16 text-center">
        <Badge variant="secondary" className="mb-4">
          Planos e Preços
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Escolha o plano ideal para você
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Gerencie suas propriedades de aluguel por temporada com eficiência. 
          Controle limpezas, inspeções e manutenções em um só lugar.
        </p>
      </section>

      {/* Plans Grid */}
      <section className="container mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plansLoading ? (
            // Loading skeleton
            Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </CardHeader>
                <CardContent>
                  <div className="h-10 bg-muted rounded w-1/2 mb-6" />
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <div key={j} className="h-4 bg-muted rounded" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            plans.map((plan, index) => {
              const isPopular = plan.slug === 'padrao';
              const isCurrentPlan = subscription?.plan_id === plan.id;
              const features = Array.isArray(plan.features) ? plan.features : [];
              
              return (
                <Card 
                  key={plan.id}
                  className={cn(
                    "relative transition-all duration-300 hover:shadow-xl",
                    isPopular && "border-primary shadow-lg scale-[1.02]",
                    isCurrentPlan && "ring-2 ring-primary"
                  )}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">
                        Mais Popular
                      </Badge>
                    </div>
                  )}
                  
                  {isCurrentPlan && (
                    <div className="absolute -top-3 right-4">
                      <Badge variant="secondary">
                        Plano Atual
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="text-center">
                    {/* Price */}
                    <div className="mb-6">
                      <span className="text-4xl font-bold">
                        R$ {plan.price_monthly.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>

                    {/* Properties limit */}
                    <div className="flex items-center justify-center gap-2 mb-6 text-sm">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span>
                        {plan.max_properties === 1 
                          ? '1 propriedade' 
                          : `Até ${plan.max_properties} propriedades`
                        }
                      </span>
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 text-left mb-8">
                      {features.map((feature: string) => {
                        const Icon = FEATURE_ICONS[feature] || Check;
                        const label = FEATURE_LABELS[feature] || feature;
                        
                        return (
                          <li key={feature} className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                              <Check className="h-3 w-3 text-primary" />
                            </div>
                            <span className="text-sm">{label}</span>
                          </li>
                        );
                      })}
                    </ul>

                    {/* CTA Button */}
                    <Button 
                      className="w-full"
                      variant={isPopular ? "default" : "outline"}
                      size="lg"
                      disabled={isCurrentPlan}
                      onClick={() => handleSelectPlan(plan.slug)}
                    >
                      {isCurrentPlan ? (
                        'Plano Atual'
                      ) : hasActiveSubscription ? (
                        <>Fazer Upgrade <ArrowRight className="ml-2 h-4 w-4" /></>
                      ) : (
                        <>Começar Agora <ArrowRight className="ml-2 h-4 w-4" /></>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Footer Note */}
        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p>Pagamento processado com segurança via Hotmart.</p>
          <p className="mt-1">Cancele a qualquer momento sem taxas adicionais.</p>
        </div>
      </section>
    </div>
  );
}
