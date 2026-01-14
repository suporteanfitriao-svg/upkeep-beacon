import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CheckCircle2, 
  ArrowLeft, 
  Building2, 
  Users, 
  ClipboardList, 
  Package, 
  ScrollText, 
  Settings,
  Loader2,
  PartyPopper,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface ReviewStepProps {
  onBack: () => void;
}

interface Summary {
  properties: number;
  teamMembers: number;
  checklists: number;
  houseRules: number;
  inventoryCategories: number;
  hasConfig: boolean;
  hasIcalSources: boolean;
}

export function ReviewStep({ onBack }: ReviewStepProps) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary>({ 
    properties: 0, 
    teamMembers: 0, 
    checklists: 0,
    houseRules: 0,
    inventoryCategories: 0,
    hasConfig: false,
    hasIcalSources: false,
  });
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const [
        propertiesRes, 
        teamRes, 
        checklistsRes, 
        rulesRes, 
        inventoryRes,
        configRes,
        icalRes,
      ] = await Promise.all([
        supabase.from('properties').select('id', { count: 'exact', head: true }),
        supabase.from('team_members').select('id', { count: 'exact', head: true }),
        supabase.from('default_checklists').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('house_rules').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('inventory_categories').select('id', { count: 'exact', head: true }).eq('is_active', true),
        user ? supabase.from('onboarding_settings').select('id').eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from('property_ical_sources').select('id', { count: 'exact', head: true }),
      ]);

      setSummary({
        properties: propertiesRes.count || 0,
        teamMembers: teamRes.count || 0,
        checklists: checklistsRes.count || 0,
        houseRules: rulesRes.count || 0,
        inventoryCategories: inventoryRes.count || 0,
        hasConfig: !!configRes.data,
        hasIcalSources: (icalRes.count || 0) > 0,
      });
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    setFinishing(true);
    
    try {
      // Mark onboarding as complete (could add a flag in profiles or settings)
      toast.success('Configuração concluída com sucesso!');
      navigate('/');
    } catch (error) {
      console.error('Error finishing:', error);
      toast.error('Erro ao finalizar');
    } finally {
      setFinishing(false);
    }
  };

  const summaryItems = [
    { icon: Building2, label: 'Propriedades', value: summary.properties, color: 'text-blue-500' },
    { icon: Users, label: 'Membros da Equipe', value: summary.teamMembers, color: 'text-emerald-500' },
    { icon: ClipboardList, label: 'Checklists', value: summary.checklists, color: 'text-amber-500' },
  ];

  const configuredItems = [
    { 
      icon: Settings, 
      label: 'Configurações gerais', 
      done: summary.hasConfig 
    },
    { 
      icon: RefreshCw, 
      label: 'Sincronização de calendários', 
      done: summary.hasIcalSources 
    },
    { 
      icon: Package, 
      label: 'Inventário padrão', 
      done: summary.inventoryCategories > 0,
      count: summary.inventoryCategories > 0 ? `${summary.inventoryCategories} categorias` : undefined,
    },
    { 
      icon: ScrollText, 
      label: 'Regras da casa', 
      done: summary.houseRules > 0,
      count: summary.houseRules > 0 ? `${summary.houseRules} regras` : undefined,
    },
  ];

  return (
    <div className="max-w-2xl w-full">
      <div className="text-center mb-8">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <PartyPopper className="h-8 w-8" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Tudo Pronto!</h2>
        <p className="text-muted-foreground">
          Revise as configurações e finalize a configuração da sua operação.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-8">
            {summaryItems.map((item) => (
              <Card key={item.label} className="text-center">
                <CardContent className="pt-6">
                  <item.icon className={`h-8 w-8 mx-auto mb-2 ${item.color}`} />
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Configurações Realizadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {configuredItems.map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    {item.done ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <span className={`text-sm ${!item.done ? 'text-muted-foreground' : ''}`}>
                      {item.label}
                    </span>
                    {item.count && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        {item.count}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8 bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <p className="text-sm text-center">
                🎉 Parabéns! Você está pronto para começar a usar o Super Host Lab.
                Você pode ajustar todas as configurações a qualquer momento na área de administração.
              </p>
            </CardContent>
          </Card>
        </>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button 
          onClick={handleFinish} 
          disabled={finishing}
          size="lg"
          className="px-8"
        >
          {finishing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Finalizando...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Concluir Configuração
            </>
          )}
        </Button>
      </div>
    </div>
  );
}