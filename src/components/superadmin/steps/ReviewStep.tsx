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
  PartyPopper
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
}

export function ReviewStep({ onBack }: ReviewStepProps) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary>({ properties: 0, teamMembers: 0, checklists: 0 });
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const [propertiesRes, teamRes, checklistsRes] = await Promise.all([
        supabase.from('properties').select('id', { count: 'exact', head: true }),
        supabase.from('team_members').select('id', { count: 'exact', head: true }),
        supabase.from('property_checklists').select('id', { count: 'exact', head: true }),
      ]);

      setSummary({
        properties: propertiesRes.count || 0,
        teamMembers: teamRes.count || 0,
        checklists: checklistsRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    setFinishing(true);
    
    // Simulate finishing setup
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success('Configuração concluída com sucesso!');
    navigate('/');
  };

  const summaryItems = [
    { icon: Building2, label: 'Propriedades', value: summary.properties, color: 'text-blue-500' },
    { icon: Users, label: 'Membros da Equipe', value: summary.teamMembers, color: 'text-emerald-500' },
    { icon: ClipboardList, label: 'Checklists', value: summary.checklists, color: 'text-amber-500' },
  ];

  const configuredItems = [
    { icon: Settings, label: 'Configurações gerais', done: true },
    { icon: Package, label: 'Inventário padrão', done: true },
    { icon: ScrollText, label: 'Regras da casa', done: true },
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
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{item.label}</span>
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
