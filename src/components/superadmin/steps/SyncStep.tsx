import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Link2, CheckCircle2, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SyncStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function SyncStep({ onNext, onBack }: SyncStepProps) {
  const [icalUrl, setIcalUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [synced, setSynced] = useState(false);

  const handleSync = async () => {
    if (!icalUrl.trim()) {
      toast.error('Insira uma URL de calendário válida');
      return;
    }

    setIsSyncing(true);
    // Simulate sync
    await new Promise(resolve => setTimeout(resolve, 2000));
    setSynced(true);
    setIsSyncing(false);
    toast.success('Calendário sincronizado com sucesso!');
  };

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

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            URL do Calendário iCal
          </CardTitle>
          <CardDescription>
            Cole a URL do calendário iCal da sua plataforma de hospedagem
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ical-url">URL do iCal</Label>
            <Input
              id="ical-url"
              placeholder="https://airbnb.com/calendar/ical/..."
              value={icalUrl}
              onChange={(e) => setIcalUrl(e.target.value)}
              disabled={synced}
            />
          </div>
          
          {synced ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 p-3 rounded-lg">
              <CheckCircle2 className="h-5 w-5" />
              Calendário conectado com sucesso!
            </div>
          ) : (
            <Button 
              onClick={handleSync} 
              disabled={isSyncing || !icalUrl.trim()}
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
          )}
        </CardContent>
      </Card>

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
