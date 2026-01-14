import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  ShieldCheck,
  ShieldAlert,
  Key,
  Lock,
  Eye,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const securityChecks = [
  {
    id: 'rls',
    name: 'Row Level Security (RLS)',
    description: 'Políticas de segurança em todas as tabelas',
    status: 'success',
    details: 'Todas as tabelas com RLS ativo',
  },
  {
    id: 'auth',
    name: 'Autenticação',
    description: 'Sistema de login e sessões',
    status: 'success',
    details: 'JWT tokens com expiração configurada',
  },
  {
    id: 'password',
    name: 'Política de Senhas',
    description: 'Requisitos mínimos de senha',
    status: 'warning',
    details: 'Considere aumentar requisitos de complexidade',
  },
  {
    id: 'api',
    name: 'API Keys',
    description: 'Chaves de acesso à API',
    status: 'success',
    details: 'Chaves anônimas com permissões limitadas',
  },
  {
    id: 'storage',
    name: 'Armazenamento',
    description: 'Políticas de storage',
    status: 'success',
    details: 'Buckets com políticas configuradas',
  },
  {
    id: 'audit',
    name: 'Auditoria',
    description: 'Logs de ações do sistema',
    status: 'success',
    details: 'Logs habilitados para ações críticas',
  },
];

const recentSecurityEvents = [
  {
    id: '1',
    type: 'login_success',
    message: 'Login bem-sucedido',
    user: 'admin@example.com',
    time: '2 min atrás',
    severity: 'info',
  },
  {
    id: '2',
    type: 'password_change',
    message: 'Senha alterada',
    user: 'gestor@example.com',
    time: '15 min atrás',
    severity: 'info',
  },
  {
    id: '3',
    type: 'failed_login',
    message: 'Tentativa de login falhou',
    user: 'unknown@test.com',
    time: '1 hora atrás',
    severity: 'warning',
  },
  {
    id: '4',
    type: 'permission_denied',
    message: 'Acesso negado a recurso',
    user: 'cleaner@example.com',
    time: '2 horas atrás',
    severity: 'warning',
  },
];

export function SecuritySection() {
  const successCount = securityChecks.filter(c => c.status === 'success').length;
  const warningCount = securityChecks.filter(c => c.status === 'warning').length;
  const errorCount = securityChecks.filter(c => c.status === 'error').length;
  const securityScore = Math.round((successCount / securityChecks.length) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">Segurança</h3>
          <p className="text-sm text-muted-foreground">
            Monitore a segurança da plataforma
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Shield className="h-4 w-4 mr-2" />
          Executar Verificação
        </Button>
      </div>

      {/* Security Score */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-8">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="hsl(var(--muted))"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="hsl(var(--primary))"
                  strokeWidth="8"
                  strokeDasharray={`${securityScore * 2.51} 251`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-bold">{securityScore}%</p>
                  <p className="text-xs text-muted-foreground">Seguro</p>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-sm">{successCount} verificações OK</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <span className="text-sm">{warningCount} alertas</span>
                </div>
                {errorCount > 0 && (
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-destructive" />
                    <span className="text-sm">{errorCount} críticos</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Sua plataforma está protegida com as principais medidas de segurança. 
                Revise os alertas para melhorar ainda mais a proteção.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Checks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {securityChecks.map((check) => (
          <Card key={check.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  check.status === 'success' ? 'bg-green-500/10' :
                  check.status === 'warning' ? 'bg-amber-500/10' :
                  'bg-destructive/10'
                }`}>
                  {check.status === 'success' ? (
                    <ShieldCheck className="h-5 w-5 text-green-500" />
                  ) : check.status === 'warning' ? (
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  ) : (
                    <ShieldAlert className="h-5 w-5 text-destructive" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-sm">{check.name}</h4>
                    <Badge 
                      variant={check.status === 'success' ? 'default' : 'secondary'}
                      className={
                        check.status === 'success' ? 'bg-green-500/10 text-green-600' :
                        check.status === 'warning' ? 'bg-amber-500/10 text-amber-600' :
                        'bg-destructive/10 text-destructive'
                      }
                    >
                      {check.status === 'success' ? 'OK' : 
                       check.status === 'warning' ? 'Alerta' : 'Crítico'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{check.description}</p>
                  <p className="text-xs">{check.details}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Security Events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Eventos Recentes de Segurança
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentSecurityEvents.map((event) => (
              <div 
                key={event.id} 
                className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  event.severity === 'info' ? 'bg-blue-500/10' :
                  event.severity === 'warning' ? 'bg-amber-500/10' :
                  'bg-destructive/10'
                }`}>
                  {event.severity === 'info' ? (
                    <Key className="h-5 w-5 text-blue-500" />
                  ) : (
                    <Lock className="h-5 w-5 text-amber-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{event.message}</p>
                  <p className="text-xs text-muted-foreground">{event.user}</p>
                </div>
                <span className="text-xs text-muted-foreground">{event.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
