import { CheckCircle2, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ReportStats {
  totalCompleted: number;
  averageDuration: number; // in minutes
  totalIssues: number;
}

interface ReportStatsCardsProps {
  stats: ReportStats;
}

function formatDuration(minutes: number): string {
  if (minutes === 0) return '--';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours > 0) {
    return `${hours}h ${mins}min`;
  }
  return `${mins}min`;
}

export function ReportStatsCards({ stats }: ReportStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <Card className="border bg-emerald-500/10 border-emerald-500/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Finalizados</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.totalCompleted}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
        </CardContent>
      </Card>

      <Card className="border bg-blue-500/10 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Tempo Médio</p>
              <p className="text-2xl font-bold text-blue-600">{formatDuration(stats.averageDuration)}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>

      <Card className="border bg-yellow-500/10 border-yellow-500/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avarias Registradas</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.totalIssues}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
