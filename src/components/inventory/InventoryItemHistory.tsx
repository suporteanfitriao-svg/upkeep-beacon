import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { History, User, Clock, Edit2, Camera, Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface HistoryEntry {
  id: string;
  item_id: string;
  user_id: string;
  user_name: string | null;
  action: string;
  changes: any;
  created_at: string;
}

interface InventoryItemHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string | null;
  itemName: string;
}

const actionConfig: Record<string, { label: string; icon: typeof Edit2; color: string }> = {
  created: { label: 'Criado', icon: Plus, color: 'bg-green-100 text-green-700' },
  updated: { label: 'Atualizado', icon: Edit2, color: 'bg-blue-100 text-blue-700' },
  photo_added: { label: 'Foto adicionada', icon: Camera, color: 'bg-purple-100 text-purple-700' },
  photo_removed: { label: 'Foto removida', icon: Trash2, color: 'bg-red-100 text-red-700' },
};

const fieldLabels: Record<string, string> = {
  name: 'Nome',
  quantity: 'Quantidade',
  unit: 'Unidade',
  details: 'Detalhes',
  photo_url: 'Foto',
};

export const InventoryItemHistory = ({
  open,
  onOpenChange,
  itemId,
  itemName,
}: InventoryItemHistoryProps) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && itemId) {
      fetchHistory();
    }
  }, [open, itemId]);

  const fetchHistory = async () => {
    if (!itemId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_item_history')
        .select('*')
        .eq('item_id', itemId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderChanges = (changes: Record<string, { old: any; new: any }> | null) => {
    if (!changes) return null;

    return (
      <div className="mt-2 space-y-1 text-xs">
        {Object.entries(changes).map(([field, { old: oldVal, new: newVal }]) => (
          <div key={field} className="flex items-start gap-1">
            <span className="text-muted-foreground">{fieldLabels[field] || field}:</span>
            <span className="line-through text-red-500">{oldVal || '(vazio)'}</span>
            <span className="mx-1">→</span>
            <span className="text-green-600">{newVal || '(vazio)'}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Alterações
          </DialogTitle>
          <DialogDescription>
            Item: {itemName}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum histórico registrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry) => {
                const config = actionConfig[entry.action] || actionConfig.updated;
                const Icon = config.icon;

                return (
                  <div key={entry.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={config.color}>
                          <Icon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(entry.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {entry.user_name}
                    </div>

                    {renderChanges(entry.changes as Record<string, { old: any; new: any }> | null)}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
