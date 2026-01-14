import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Check,
  Star,
  Zap,
  Building2
} from 'lucide-react';

const plans = [
  {
    id: 'basic',
    name: 'Básico',
    price: 'R$ 99',
    period: '/mês',
    description: 'Ideal para pequenos proprietários',
    icon: Building2,
    color: 'bg-amber-500',
    features: [
      'Até 5 propriedades',
      'Até 3 usuários',
      '1 sincronização iCal',
      'Suporte por email',
    ],
    subscribers: 25,
  },
  {
    id: 'professional',
    name: 'Profissional',
    price: 'R$ 249',
    period: '/mês',
    description: 'Para gestores de múltiplas propriedades',
    icon: Zap,
    color: 'bg-blue-500',
    popular: true,
    features: [
      'Até 25 propriedades',
      'Até 15 usuários',
      'Sincronização ilimitada',
      'Relatórios avançados',
      'Suporte prioritário',
    ],
    subscribers: 30,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'R$ 499',
    period: '/mês',
    description: 'Para grandes operações',
    icon: Star,
    color: 'bg-primary',
    features: [
      'Propriedades ilimitadas',
      'Usuários ilimitados',
      'API personalizada',
      'White-label',
      'Gerente de conta dedicado',
      'SLA garantido',
    ],
    subscribers: 45,
  },
];

export function PlansSection() {
  const totalSubscribers = plans.reduce((acc, plan) => acc + plan.subscribers, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">Planos & Assinaturas</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie os planos disponíveis e visualize assinaturas
          </p>
        </div>
        <Badge variant="secondary" className="text-base px-4 py-2">
          <CreditCard className="h-4 w-4 mr-2" />
          {totalSubscribers} assinantes ativos
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`relative overflow-hidden ${plan.popular ? 'ring-2 ring-primary' : ''}`}
          >
            {plan.popular && (
              <div className="absolute top-4 right-4">
                <Badge className="bg-primary text-primary-foreground">
                  Mais Popular
                </Badge>
              </div>
            )}
            <CardHeader className="pb-4">
              <div className={`w-12 h-12 ${plan.color} rounded-xl flex items-center justify-center text-white mb-4`}>
                <plan.icon className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>

              <div className="space-y-3">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-muted-foreground">Assinantes</span>
                  <span className="font-bold">{plan.subscribers}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className={`${plan.color} h-2 rounded-full transition-all`}
                    style={{ width: `${(plan.subscribers / totalSubscribers) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {Math.round((plan.subscribers / totalSubscribers) * 100)}% do total
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Receita Mensal Estimada</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const revenue = plan.subscribers * parseInt(plan.price.replace(/\D/g, ''));
              return (
                <div key={plan.id} className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">{plan.name}</p>
                  <p className="text-2xl font-bold">
                    R$ {revenue.toLocaleString('pt-BR')}
                  </p>
                </div>
              );
            })}
            <div className="text-center border-l pl-6">
              <p className="text-sm text-muted-foreground mb-1">Total</p>
              <p className="text-2xl font-bold text-primary">
                R$ {plans.reduce((acc, plan) => {
                  return acc + (plan.subscribers * parseInt(plan.price.replace(/\D/g, '')));
                }, 0).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
