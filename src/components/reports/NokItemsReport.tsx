import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Building2, Calendar, User, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NokItem {
  scheduleId: string;
  propertyId: string;
  propertyName: string;
  itemId: string;
  itemTitle: string;
  category: string;
  cleanerName: string;
  completedAt: string | null;
  observation?: string;
}

interface ScheduleNokGroup {
  scheduleId: string;
  propertyId: string;
  propertyName: string;
  cleanerName: string;
  completedAt: string | null;
  cleanerObservations: string | null;
  items: NokItem[];
}

interface NokItemsReportProps {
  className?: string;
}

export function NokItemsReport({ className }: NokItemsReportProps) {
  const [loading, setLoading] = useState(true);
  const [nokItems, setNokItems] = useState<NokItem[]>([]);
  const [scheduleGroups, setScheduleGroups] = useState<ScheduleNokGroup[]>([]);
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [expandedSchedules, setExpandedSchedules] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchNokItems();
  }, []);

  const fetchNokItems = async () => {
    try {
      setLoading(true);

      // Fetch properties for filter
      const { data: propsData } = await supabase
        .from('properties')
        .select('id, name')
        .order('name');

      setProperties(propsData || []);

      // Fetch completed schedules with checklist data
      const { data: schedules, error } = await supabase
        .from('schedules')
        .select('id, property_id, property_name, cleaner_name, end_at, checklist_state, cleaner_observations')
        .eq('status', 'completed')
        .not('checklist_state', 'is', null)
        .order('end_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const items: NokItem[] = [];
      const groups: ScheduleNokGroup[] = [];

      schedules?.forEach(schedule => {
        if (!schedule.checklist_state) return;
        
        const checklistState = schedule.checklist_state as any[];
        if (!Array.isArray(checklistState)) return;

        const scheduleNokItems: NokItem[] = [];

        checklistState.forEach((item: any) => {
          if (item.status === 'not_ok') {
            const nokItem: NokItem = {
              scheduleId: schedule.id,
              propertyId: schedule.property_id || '',
              propertyName: schedule.property_name,
              itemId: item.id,
              itemTitle: item.title,
              category: item.category,
              cleanerName: schedule.cleaner_name || 'Não informado',
              completedAt: schedule.end_at,
              observation: item.observation || item.notes || '',
            };
            items.push(nokItem);
            scheduleNokItems.push(nokItem);
          }
        });

        // Only add groups that have NOK items
        if (scheduleNokItems.length > 0) {
          groups.push({
            scheduleId: schedule.id,
            propertyId: schedule.property_id || '',
            propertyName: schedule.property_name,
            cleanerName: schedule.cleaner_name || 'Não informado',
            completedAt: schedule.end_at,
            cleanerObservations: schedule.cleaner_observations,
            items: scheduleNokItems,
          });
        }
      });

      setNokItems(items);
      setScheduleGroups(groups);
    } catch (error) {
      console.error('Error fetching NOK items:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter schedule groups by property
  const filteredGroups = useMemo(() => {
    if (selectedProperty === 'all') return scheduleGroups;
    return scheduleGroups.filter(group => group.propertyId === selectedProperty);
  }, [scheduleGroups, selectedProperty]);

  const filteredItems = useMemo(() => {
    if (selectedProperty === 'all') return nokItems;
    return nokItems.filter(item => item.propertyId === selectedProperty);
  }, [nokItems, selectedProperty]);

  // Stats
  const totalNok = filteredItems.length;
  const uniqueSchedules = filteredGroups.length;
  const uniqueProperties = useMemo(() => {
    const propertyIds = new Set(filteredGroups.map(g => g.propertyId));
    return propertyIds.size;
  }, [filteredGroups]);
  
  const topCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredItems.forEach(item => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [filteredItems]);

  const toggleSchedule = (scheduleId: string) => {
    setExpandedSchedules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(scheduleId)) {
        newSet.delete(scheduleId);
      } else {
        newSet.add(scheduleId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Relatório de Itens NOK
          </h2>
          <p className="text-sm text-muted-foreground">
            Itens marcados como "Não OK" nos checklists de limpeza
          </p>
        </div>
        <Select value={selectedProperty} onValueChange={setSelectedProperty}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por propriedade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as propriedades</SelectItem>
            {properties.map(prop => (
              <SelectItem key={prop.id} value={prop.id}>{prop.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Itens NOK</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{totalNok}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tarefas com NOK</p>
                <p className="text-2xl font-bold">{uniqueSchedules}</p>
              </div>
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Propriedades Afetadas</p>
                <p className="text-2xl font-bold">{uniqueProperties}</p>
              </div>
              <Building2 className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Top Categorias</p>
              <div className="flex flex-wrap gap-1">
                {topCategories.map(([category, count]) => (
                  <Badge key={category} variant="secondary" className="text-xs">
                    {category}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items List by Schedule */}
      {totalNok === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400">check_circle</span>
              </div>
              <p className="text-muted-foreground">Nenhum item NOK encontrado!</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map((group) => {
            const isExpanded = expandedSchedules.has(group.scheduleId);
            
            return (
              <Card key={group.scheduleId} className="overflow-hidden">
                <button
                  onClick={() => toggleSchedule(group.scheduleId)}
                  className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-foreground">{group.propertyName}</h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {group.cleanerName}
                        </span>
                        {group.completedAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(group.completedAt), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">{group.items.length} NOK</Badge>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t">
                    {/* Cleaner general observations */}
                    {group.cleanerObservations && (
                      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-b">
                        <div className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[18px] mt-0.5">comment</span>
                          <div>
                            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase mb-1">Observação Geral do Cleaner</p>
                            <p className="text-sm text-foreground">{group.cleanerObservations}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* NOK items list */}
                    <div className="divide-y">
                      {group.items.map((item, idx) => (
                        <div key={`${item.scheduleId}-${item.itemId}-${idx}`} className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                              <span className="material-symbols-outlined text-red-500 text-[16px]">close</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground">{item.itemTitle}</p>
                              <Badge variant="outline" className="text-[10px] mt-1">{item.category}</Badge>
                              
                              {/* Item-specific observation */}
                              {item.observation && (
                                <div className="mt-2 p-2 bg-muted/50 rounded-md">
                                  <div className="flex items-start gap-1.5">
                                    <span className="material-symbols-outlined text-muted-foreground text-[14px] mt-0.5">notes</span>
                                    <div>
                                      <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-0.5">Observação do Item</p>
                                      <p className="text-sm text-foreground">{item.observation}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
