import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  CheckCircle2, 
  ArrowLeft, 
  Building2, 
  Users, 
  ClipboardList, 
  Package, 
  Settings,
  Loader2,
  PartyPopper,
  XCircle,
  RefreshCw,
  Clock,
  Camera,
  Bell,
  MapPin
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CleanerWorkflowPreview } from '@/components/onboarding/CleanerWorkflowPreview';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

interface ReviewStepProps {
  onBack: () => void;
}

interface PropertyDetail {
  id: string;
  name: string;
  address: string | null;
}

interface OnboardingConfig {
  default_check_in_time: string;
  default_check_out_time: string;
  enable_notifications: boolean;
  auto_release_schedules: boolean;
  auto_release_before_checkout_enabled: boolean;
  auto_release_before_checkout_minutes: number;
  require_checklist: boolean;
  require_photo_per_category: boolean;
  require_photo_for_issues: boolean;
  require_photo_for_inspections: boolean;
}

interface Summary {
  properties: PropertyDetail[];
  teamMembersCount: number;
  checklistsCount: number;
  inventoryCategoriesCount: number;
  hasIcalSources: boolean;
  config: OnboardingConfig | null;
}

const defaultConfig: OnboardingConfig = {
  default_check_in_time: '15:00',
  default_check_out_time: '11:00',
  enable_notifications: true,
  auto_release_schedules: true,
  auto_release_before_checkout_enabled: false,
  auto_release_before_checkout_minutes: 60,
  require_checklist: true,
  require_photo_per_category: false,
  require_photo_for_issues: true,
  require_photo_for_inspections: false,
};

export function ReviewStep({ onBack }: ReviewStepProps) {
  const navigate = useNavigate();
  const { markAsCompleted } = useOnboardingStatus();
  const [summary, setSummary] = useState<Summary>({ 
    properties: [],
    teamMembersCount: 0, 
    checklistsCount: 0,
    inventoryCategoriesCount: 0,
    hasIcalSources: false,
    config: null,
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
        inventoryRes,
        configRes,
        icalRes,
      ] = await Promise.all([
        supabase.from('properties').select('id, name, address'),
        supabase.from('team_members').select('id', { count: 'exact', head: true }),
        supabase.from('default_checklists').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('inventory_categories').select('id', { count: 'exact', head: true }).eq('is_active', true),
        user ? supabase.from('onboarding_settings').select('*').eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from('property_ical_sources').select('id', { count: 'exact', head: true }),
      ]);

      setSummary({
        properties: propertiesRes.data || [],
        teamMembersCount: teamRes.count || 0,
        checklistsCount: checklistsRes.count || 0,
        inventoryCategoriesCount: inventoryRes.count || 0,
        hasIcalSources: (icalRes.count || 0) > 0,
        config: configRes.data ? {
          default_check_in_time: configRes.data.default_check_in_time || defaultConfig.default_check_in_time,
          default_check_out_time: configRes.data.default_check_out_time || defaultConfig.default_check_out_time,
          enable_notifications: configRes.data.enable_notifications ?? defaultConfig.enable_notifications,
          auto_release_schedules: configRes.data.auto_release_schedules ?? defaultConfig.auto_release_schedules,
          auto_release_before_checkout_enabled: configRes.data.auto_release_before_checkout_enabled ?? defaultConfig.auto_release_before_checkout_enabled,
          auto_release_before_checkout_minutes: configRes.data.auto_release_before_checkout_minutes ?? defaultConfig.auto_release_before_checkout_minutes,
          require_checklist: configRes.data.require_checklist ?? defaultConfig.require_checklist,
          require_photo_per_category: configRes.data.require_photo_per_category ?? defaultConfig.require_photo_per_category,
          require_photo_for_issues: configRes.data.require_photo_for_issues ?? defaultConfig.require_photo_for_issues,
          require_photo_for_inspections: configRes.data.require_photo_for_inspections ?? defaultConfig.require_photo_for_inspections,
        } : defaultConfig,
      });
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    // Validate required configurations
    if (summary.properties.length === 0) {
      toast.error('Adicione pelo menos uma propriedade para continuar');
      return;
    }

    setFinishing(true);
    
    try {
      // Mark onboarding as completed in the database
      const success = await markAsCompleted();
      
      if (!success) {
        toast.error('Erro ao finalizar configuração');
        return;
      }
      
      toast.success('Configuração concluída com sucesso!');
      navigate('/');
    } catch (error) {
      console.error('Error finishing:', error);
      toast.error('Erro ao finalizar');
    } finally {
      setFinishing(false);
    }
  };

  const formatTime = (time: string) => {
    return time ? time.substring(0, 5) : '--:--';
  };

  const config = summary.config || defaultConfig;

  const configuredItems = [
    { 
      icon: Settings, 
      label: 'Configurações gerais', 
      done: !!summary.config 
    },
    { 
      icon: RefreshCw, 
      label: 'Sincronização de calendários', 
      done: summary.hasIcalSources 
    },
    { 
      icon: Package, 
      label: 'Inventário padrão', 
      done: summary.inventoryCategoriesCount > 0,
      count: summary.inventoryCategoriesCount > 0 ? `${summary.inventoryCategoriesCount} categorias` : undefined,
    },
  ];

  const canFinish = summary.properties.length > 0;

  return (
    <div className="max-w-3xl w-full">
      <div className="text-center mb-8">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <PartyPopper className="h-8 w-8" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Tudo Pronto!</h2>
        <p className="text-muted-foreground">
          Revise as configurações da sua operação antes de finalizar.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="text-center">
              <CardContent className="pt-6">
                <Building2 className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold">{summary.properties.length}</p>
                <p className="text-xs text-muted-foreground">Propriedades</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <Users className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                <p className="text-2xl font-bold">{summary.teamMembersCount}</p>
                <p className="text-xs text-muted-foreground">Membros da Equipe</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <ClipboardList className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                <p className="text-2xl font-bold">{summary.checklistsCount}</p>
                <p className="text-xs text-muted-foreground">Checklists</p>
              </CardContent>
            </Card>
          </div>

          {/* Properties Detail */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Propriedades Configuradas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summary.properties.length === 0 ? (
                <p className="text-sm text-destructive">Nenhuma propriedade cadastrada</p>
              ) : (
                <div className="space-y-2">
                  {summary.properties.map((property) => (
                    <div key={property.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">{property.name}</p>
                        {property.address && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {property.address}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Configuration Summary */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações Gerais
              </CardTitle>
              <CardDescription>Regras aplicadas às propriedades</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Times */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Check-in:</span>
                  <Badge variant="secondary">{formatTime(config.default_check_in_time)}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Check-out:</span>
                  <Badge variant="secondary">{formatTime(config.default_check_out_time)}</Badge>
                </div>
              </div>

              <Separator />

              {/* Release Flow */}
              <div>
                <p className="text-sm font-medium mb-2">Fluxo de Liberação</p>
                <div className="space-y-1">
                  {config.auto_release_schedules && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Liberação automática no horário do check-out
                    </div>
                  )}
                  {config.auto_release_before_checkout_enabled && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Liberação antecipada ({config.auto_release_before_checkout_minutes} min antes do check-out)
                    </div>
                  )}
                  {!config.auto_release_schedules && !config.auto_release_before_checkout_enabled && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                      Liberação manual
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Checklist */}
              <div>
                <p className="text-sm font-medium mb-2">Checklist de Limpeza</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {config.require_checklist ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Checklist obrigatório
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                      Checklist opcional
                    </>
                  )}
                </div>
              </div>

              <Separator />

              {/* Photos */}
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Requisitos de Fotos
                </p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {config.require_photo_per_category ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    Foto por categoria do checklist
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {config.require_photo_for_issues ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    Foto obrigatória em avarias
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {config.require_photo_for_inspections ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    Foto obrigatória em inspeções
                  </div>
                </div>
              </div>

              <Separator />

              {/* Notifications */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Bell className="h-4 w-4" />
                Notificações: 
                <Badge variant={config.enable_notifications ? "default" : "secondary"}>
                  {config.enable_notifications ? "Ativadas" : "Desativadas"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Workflow Preview */}
          <div className="mb-6">
            <CleanerWorkflowPreview config={config} />
          </div>

          {/* Status Items */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Itens Configurados</CardTitle>
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

          {canFinish && (
            <Card className="mb-8 bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <p className="text-sm text-center">
                  🎉 Parabéns! Você está pronto para começar a usar o Super Host Lab.
                  Você pode ajustar todas as configurações a qualquer momento na área de administração.
                </p>
              </CardContent>
            </Card>
          )}

          {!canFinish && (
            <Card className="mb-8 bg-destructive/5 border-destructive/20">
              <CardContent className="pt-6">
                <p className="text-sm text-center text-destructive">
                  ⚠️ Complete as configurações obrigatórias antes de finalizar.
                  É necessário cadastrar pelo menos uma propriedade.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button 
          onClick={handleFinish} 
          disabled={finishing || !canFinish}
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
