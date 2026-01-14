import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Link2, CheckCircle2, ArrowLeft, ArrowRight, Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SyncStepProps {
  onNext: () => void;
  onBack: () => void;
}

interface Property {
  id: string;
  name: string;
}

interface IcalSource {
  property_id: string;
  ical_url: string;
  last_sync_at: string | null;
}

export function SyncStep({ onNext, onBack }: SyncStepProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [icalSources, setIcalSources] = useState<IcalSource[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [icalUrl, setIcalUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [propertiesRes, sourcesRes] = await Promise.all([
        supabase.from('properties').select('id, name').order('name'),
        supabase.from('property_ical_sources').select('property_id, ical_url, last_sync_at'),
      ]);

      if (propertiesRes.error) throw propertiesRes.error;
      if (sourcesRes.error) throw sourcesRes.error;

      setProperties(propertiesRes.data || []);
      setIcalSources(sourcesRes.data || []);

      // Auto-select first property without ical
      const propertiesWithoutIcal = (propertiesRes.data || []).filter(
        p => !(sourcesRes.data || []).some(s => s.property_id === p.id)
      );
      if (propertiesWithoutIcal.length > 0) {
        setSelectedPropertyId(propertiesWithoutIcal[0].id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!icalUrl.trim()) {
      toast.error('Insira uma URL de calendário válida');
      return;
    }

    if (!selectedPropertyId) {
      toast.error('Selecione uma propriedade');
      return;
    }

    setIsSyncing(true);
    try {
      // Check if already exists
      const existing = icalSources.find(s => s.property_id === selectedPropertyId);

      if (existing) {
        const { error } = await supabase
          .from('property_ical_sources')
          .update({ 
            ical_url: icalUrl.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('property_id', selectedPropertyId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('property_ical_sources')
          .insert({
            property_id: selectedPropertyId,
            ical_url: icalUrl.trim(),
          });

        if (error) throw error;
      }

      // Refresh data
      await fetchData();
      setIcalUrl('');
      toast.success('Calendário sincronizado com sucesso!');
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error('Erro ao sincronizar calendário');
    } finally {
      setIsSyncing(false);
    }
  };

  const syncedProperties = properties.filter(p => 
    icalSources.some(s => s.property_id === p.id)
  );

  const unsyncedProperties = properties.filter(p => 
    !icalSources.some(s => s.property_id === p.id)
  );

  if (loading) {
    return (
      <div className="max-w-2xl w-full flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl w-full">
      <div className="text-center mb-8">
        <div className="mb-6 flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <RefreshCw className="h-7 w-7" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Sincronize seus Calendários</h2>
        <p className="text-muted-foreground">
          Conecte seus calendários do Airbnb, Booking ou outras plataformas para importar reservas automaticamente.
        </p>
      </div>

      {properties.length === 0 ? (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center py-4">
              ⚠️ Você ainda não cadastrou propriedades. Volte para a etapa de Propriedades primeiro.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Adicionar Calendário iCal
              </CardTitle>
              <CardDescription>
                Selecione uma propriedade e cole a URL do calendário iCal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Propriedade</Label>
                <Select 
                  value={selectedPropertyId} 
                  onValueChange={setSelectedPropertyId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma propriedade" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {property.name}
                          {icalSources.some(s => s.property_id === property.id) && (
                            <CheckCircle2 className="h-3 w-3 text-emerald-500 ml-1" />
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ical-url">URL do iCal</Label>
                <Input
                  id="ical-url"
                  placeholder="https://airbnb.com/calendar/ical/..."
                  value={icalUrl}
                  onChange={(e) => setIcalUrl(e.target.value)}
                />
              </div>
              
              <Button 
                onClick={handleSync} 
                disabled={isSyncing || !icalUrl.trim() || !selectedPropertyId}
                className="w-full"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sincronizar Calendário
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {syncedProperties.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  Calendários Conectados
                </CardTitle>
                <CardDescription>
                  {syncedProperties.length} propriedade{syncedProperties.length !== 1 ? 's' : ''} sincronizada{syncedProperties.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {syncedProperties.map((property) => (
                    <div 
                      key={property.id}
                      className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-medium">{property.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {unsyncedProperties.length > 0 && (
            <Card className="mb-8 bg-muted/30">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground text-center">
                  💡 <strong>Dica:</strong> Você pode pular esta etapa e configurar os calendários depois na página de cada propriedade.
                  {unsyncedProperties.length > 0 && (
                    <span className="block mt-1">
                      {unsyncedProperties.length} propriedade{unsyncedProperties.length !== 1 ? 's' : ''} ainda sem calendário.
                    </span>
                  )}
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
        <Button onClick={onNext}>
          Próximo
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}