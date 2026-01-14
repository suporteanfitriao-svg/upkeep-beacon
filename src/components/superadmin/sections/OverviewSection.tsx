import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, 
  Users, 
  Sparkles, 
  UserCheck, 
  RefreshCw, 
  CheckCircle2,
  AlertTriangle,
  FileWarning,
  Clock,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { toast } from 'sonner';

interface OverviewSectionProps {
  viewMode: 'global' | 'regional';
  onNavigateToSection?: (section: string) => void;
}

interface GlobalStats {
  totalProperties: number;
  activeProperties: number;
  inactiveProperties: number;
  activeUsers: number;
  cleaners: number;
  managers: number;
  syncedReservations: number;
  completedTasks: number;
}

interface AlertStats {
  syncErrors: number;
  noChecklist: number;
  lateCleanings: number;
}

export function OverviewSection({ viewMode, onNavigateToSection }: OverviewSectionProps) {
  const [stats, setStats] = useState<GlobalStats>({
    totalProperties: 0,
    activeProperties: 0,
    inactiveProperties: 0,
    activeUsers: 0,
    cleaners: 0,
    managers: 0,
    syncedReservations: 0,
    completedTasks: 0,
  });
  const [alerts, setAlerts] = useState<AlertStats>({
    syncErrors: 0,
    noChecklist: 0,
    lateCleanings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [viewMode]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch properties count with active/inactive breakdown
      const { count: totalPropertiesCount } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true });

      const { count: activePropertiesCount } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Fetch team members by role
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('role, is_active');

      const cleaners = teamMembers?.filter(m => m.role === 'cleaner' && m.is_active).length || 0;
      const managers = teamMembers?.filter(m => m.role === 'manager' && m.is_active).length || 0;
      const admins = teamMembers?.filter(m => m.role === 'admin' && m.is_active).length || 0;

      // Fetch reservations count
      const { count: reservationsCount } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true });

      // Fetch completed schedules
      const { count: completedCount } = await supabase
        .from('schedules')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      // Fetch alert stats
      const { data: icalSources } = await supabase
        .from('property_ical_sources')
        .select('last_error')
        .not('last_error', 'is', null);

      const { data: checklists } = await supabase
        .from('property_checklists')
        .select('property_id');

      const { data: allProperties } = await supabase
        .from('properties')
        .select('id');

      const propertiesWithChecklist = new Set(checklists?.map(c => c.property_id) || []);
      const propertiesWithoutChecklist = (allProperties || []).filter(
        p => !propertiesWithChecklist.has(p.id)
      ).length;

      // Late cleanings (released but not started after 2 hours)
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const { count: lateCount } = await supabase
        .from('schedules')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'released')
        .lt('updated_at', twoHoursAgo);

      setStats({
        totalProperties: totalPropertiesCount || 0,
        activeProperties: activePropertiesCount || 0,
        inactiveProperties: (totalPropertiesCount || 0) - (activePropertiesCount || 0),
        activeUsers: cleaners + managers + admins,
        cleaners,
        managers,
        syncedReservations: reservationsCount || 0,
        completedTasks: completedCount || 0,
      });

      setAlerts({
        syncErrors: icalSources?.length || 0,
        noChecklist: propertiesWithoutChecklist,
        lateCleanings: lateCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    { 
      label: 'Propriedades Ativas', 
      value: stats.activeProperties.toLocaleString(), 
      icon: Building2, 
      change: `${stats.inactiveProperties} inativas`, 
      changeType: stats.inactiveProperties > 0 ? 'neutral' : 'positive',
      bgColor: 'bg-green-500/10',
      iconColor: 'text-green-500'
    },
    { 
      label: 'Total Propriedades', 
      value: stats.totalProperties.toLocaleString(), 
      icon: Building2, 
      change: '100%', 
      changeType: 'info',
      bgColor: 'bg-primary/10',
      iconColor: 'text-primary'
    },
    { 
      label: 'Usuários Ativos', 
      value: stats.activeUsers.toLocaleString(), 
      icon: Users, 
      change: '+4%', 
      changeType: 'positive',
      bgColor: 'bg-indigo-500/10',
      iconColor: 'text-indigo-500'
    },
    { 
      label: 'Cleaners', 
      value: stats.cleaners.toLocaleString(), 
      icon: Sparkles, 
      change: 'Estável', 
      changeType: 'neutral',
      bgColor: 'bg-amber-500/10',
      iconColor: 'text-amber-500'
    },
    { 
      label: 'Gestores', 
      value: stats.managers.toLocaleString(), 
      icon: UserCheck, 
      change: '+2', 
      changeType: 'positive',
      bgColor: 'bg-blue-500/10',
      iconColor: 'text-blue-500'
    },
    { 
      label: 'Tarefas Finaliz.', 
      value: stats.completedTasks >= 1000 
        ? `${(stats.completedTasks / 1000).toFixed(1)}k` 
        : stats.completedTasks.toString(), 
      icon: CheckCircle2, 
      change: 'Meta', 
      changeType: 'info',
      bgColor: 'bg-purple-500/10',
      iconColor: 'text-purple-500'
    },
  ];

  const alertCards = [
    {
      label: 'Sincronizações com Erro',
      value: alerts.syncErrors.toString().padStart(2, '0'),
      icon: AlertTriangle,
      bgColor: 'bg-destructive',
      containerBg: 'bg-destructive/5 border-destructive/20',
      textColor: 'text-destructive',
      action: () => {
        onNavigateToSection?.('properties');
        toast.info('Navegando para propriedades com erros de sincronização');
      }
    },
    {
      label: 'Propriedades sem Checklist',
      value: alerts.noChecklist.toString().padStart(2, '0'),
      icon: FileWarning,
      bgColor: 'bg-amber-500',
      containerBg: 'bg-amber-500/5 border-amber-500/20',
      textColor: 'text-amber-600',
      action: () => {
        onNavigateToSection?.('properties');
        toast.info('Navegando para propriedades sem checklist');
      }
    },
    {
      label: 'Limpezas Atrasadas',
      value: alerts.lateCleanings.toString().padStart(2, '0'),
      icon: Clock,
      bgColor: 'bg-orange-500',
      containerBg: 'bg-orange-500/5 border-orange-500/20',
      textColor: 'text-orange-600',
      action: () => {
        toast.info('Abrindo lista de limpezas atrasadas...');
      }
    },
  ];

  // Sample data for charts
  const growthData = [
    { month: 'Jul', value: 40 },
    { month: 'Ago', value: 48 },
    { month: 'Set', value: 55 },
    { month: 'Out', value: 62 },
    { month: 'Nov', value: 78 },
    { month: 'Dez', value: 95 },
  ];

  const planDistribution = [
    { name: 'Enterprise', value: 45, color: 'hsl(var(--primary))' },
    { name: 'Profissional', value: 30, color: 'hsl(var(--secondary))' },
    { name: 'Básico', value: 25, color: 'hsl(40, 90%, 64%)' },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6">
        {statsCards.map((stat, index) => (
          <Card key={index} className="border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
                <span className={`text-xs font-bold ${
                  stat.changeType === 'positive' ? 'text-green-500' :
                  stat.changeType === 'info' ? 'text-purple-500' :
                  'text-muted-foreground'
                }`}>
                  {stat.change}
                </span>
              </div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </p>
              <p className="text-2xl font-bold text-foreground">
                {loading ? '...' : stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Health Status & Alerts */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <h3 className="font-bold text-foreground">Status de Saúde & Alertas Críticos</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {alertCards.map((alert, index) => (
            <button 
              key={index}
              onClick={alert.action}
              className={`flex items-center gap-5 ${alert.containerBg} border p-5 rounded-2xl cursor-pointer hover:shadow-md transition-all hover:scale-[1.01] w-full text-left`}
            >
              <div className={`w-12 h-12 ${alert.bgColor} rounded-xl flex items-center justify-center text-white shadow-lg shrink-0`}>
                <alert.icon className="h-5 w-5" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${alert.textColor}`}>
                  {loading ? '...' : alert.value}
                </p>
                <p className={`text-xs font-semibold ${alert.textColor}/60 uppercase tracking-wide`}>
                  {alert.label}
                </p>
              </div>
              <div className={`ml-auto ${alert.textColor}/40 hover:${alert.textColor}`}>
                <ChevronRight className="h-5 w-5" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Charts Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Growth Chart */}
        <Card className="lg:col-span-8 border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-bold">Crescimento de Propriedades</CardTitle>
              <p className="text-sm text-muted-foreground">Expansão da rede no último semestre</p>
            </div>
            <Select defaultValue="6months">
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6months">Últimos 6 meses</SelectItem>
                <SelectItem value="1year">Último ano</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growthData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 'bold', fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Bar 
                  dataKey="value" 
                  fill="hsl(var(--primary))" 
                  radius={[8, 8, 8, 8]}
                  maxBarSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Plan Distribution Chart */}
        <Card className="lg:col-span-4 border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold">Distribuição de Planos</CardTitle>
            <p className="text-sm text-muted-foreground">Mix de assinaturas ativas</p>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="relative w-48 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {planDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-bold text-foreground">100%</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Total</p>
                </div>
              </div>
            </div>
            <div className="mt-8 w-full space-y-3">
              {planDistribution.map((plan, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: plan.color }}
                    />
                    <span className="text-xs font-semibold text-muted-foreground">
                      {plan.name}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-foreground">{plan.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
