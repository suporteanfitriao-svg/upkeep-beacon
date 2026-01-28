/**
 * Página de Checkout - Confirmar plano e redirecionar para Hotmart
 * REGRA: Apenas Proprietário pode contratar plano
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, CreditCard, Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionPlans } from '@/hooks/useSubscription';
import logo from '@/assets/logo.png';

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planSlug = searchParams.get('plan');
  const { user, loading: authLoading } = useAuth();
  const { plans, loading: plansLoading } = useSubscriptionPlans();
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedPlan = plans.find(p => p.slug === planSlug);

  useEffect(() => {
    // Redireciona para auth se não estiver logado
    if (!authLoading && !user) {
      navigate(`/auth?plan=${planSlug}&redirect=checkout`);
    }
  }, [user, authLoading, navigate, planSlug]);

  const handleProceedToPayment = async () => {
    if (!selectedPlan || !user) return;

    setIsProcessing(true);

    try {
      // TODO: Integrar com Hotmart
      // Por enquanto, mostra mensagem de que a integração está em desenvolvimento
      alert('Integração com Hotmart em desenvolvimento. Entre em contato para ativação manual.');
      
      // Futuro: Redirecionar para URL do Hotmart com parâmetros
      // window.location.href = `https://pay.hotmart.com/PRODUCT_ID?email=${user.email}&name=${user.name}`;
    } catch (error) {
      console.error('Error processing checkout:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (authLoading || plansLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!selectedPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">Plano não encontrado</p>
            <Button onClick={() => navigate('/pricing')}>
              Ver Planos Disponíveis
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100 dark:from-[#1a1d21] dark:to-[#22252a]">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/pricing')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
                <img src={logo} alt="Super Host Lab" className="w-6 h-6 object-contain" />
              </div>
              <span className="font-bold">Super Host Lab</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Pagamento Seguro</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <h1 className="text-2xl font-bold mb-8 text-center">Finalizar Contratação</h1>

        {/* Plan Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{selectedPlan.name}</span>
              <span className="text-primary">
                R$ {selectedPlan.price_monthly.toFixed(2).replace('.', ',')}/mês
              </span>
            </CardTitle>
            <CardDescription>{selectedPlan.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                {selectedPlan.max_properties === 1 
                  ? '1 propriedade incluída' 
                  : `Até ${selectedPlan.max_properties} propriedades`
                }
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                Sincronização com Airbnb (iCal)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                Gestão completa de limpezas
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                Checklists, inspeções e avarias
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* User Info */}
        {user && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Dados da Conta</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                E-mail: <span className="text-foreground">{user.email}</span>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Payment Notice */}
        <Alert className="mb-6">
          <CreditCard className="h-4 w-4" />
          <AlertDescription>
            Você será redirecionado para a Hotmart para concluir o pagamento com segurança.
            Aceitamos cartão de crédito, boleto e PIX.
          </AlertDescription>
        </Alert>

        {/* CTA */}
        <Button 
          className="w-full"
          size="lg"
          onClick={handleProceedToPayment}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Ir para Pagamento
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground mt-4">
          Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade.
        </p>
      </div>
    </div>
  );
}
