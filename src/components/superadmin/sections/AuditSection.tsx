import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  RefreshCw,
  FileText,
  Clock,
  User,
  Building2
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuditLog {
  id: string;
  action: string;
  created_at: string;
  team_member_id: string | null;
  property_id: string | null;
  schedule_id: string | null;
  type?: string;
}

export function AuditSection() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Fetch password audit logs as main audit source
      const { data: passwordLogs } = await supabase
        .from('password_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // Fetch team member audit logs
      const { data: teamLogs } = await supabase
        .from('team_member_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // Fetch config audit logs
      const { data: configLogs } = await supabase
        .from('property_config_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      const allLogs: AuditLog[] = [
        ...(passwordLogs || []).map(log => ({
          id: log.id,
          action: log.action,
          created_at: log.created_at,
          team_member_id: log.team_member_id,
          property_id: log.property_id,
          schedule_id: log.schedule_id,
          type: 'password'
        })),
        ...(teamLogs || []).map(log => ({
          id: log.id,
          action: log.action,
          created_at: log.created_at,
          team_member_id: log.team_member_id,
          property_id: null,
          schedule_id: null,
          type: 'team'
        })),
        ...(configLogs || []).map(log => ({
          id: log.id,
          action: `${log.config_key}: ${log.new_value}`,
          created_at: log.created_at,
          team_member_id: log.team_member_id,
          property_id: log.property_id,
          schedule_id: null,
          type: 'config'
        })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 100);

      setLogs(allLogs);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log =>
    log.action.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getActionBadgeColor = (action: string) => {
    if (action.includes('view') || action.includes('read')) {
      return 'bg-blue-500/10 text-blue-600';
    }
    if (action.includes('create') || action.includes('add')) {
      return 'bg-green-500/10 text-green-600';
    }
    if (action.includes('update') || action.includes('edit')) {
      return 'bg-amber-500/10 text-amber-600';
    }
    if (action.includes('delete') || action.includes('remove')) {
      return 'bg-destructive/10 text-destructive';
    }
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">Logs de Auditoria</h3>
          <p className="text-sm text-muted-foreground">
            Histórico de ações realizadas no sistema
          </p>
        </div>
        <Button onClick={fetchLogs} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar ação..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Badge variant="secondary">
              {filteredLogs.length} registros
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Propriedade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhum registro encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getActionBadgeColor(log.action)}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.team_member_id ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm truncate max-w-[150px]">
                            {log.team_member_id.slice(0, 8)}...
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.property_id ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm truncate max-w-[150px]">
                            {log.property_id.slice(0, 8)}...
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
