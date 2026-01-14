import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Plus, ArrowLeft, ArrowRight, Loader2, Check, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PropertiesStepProps {
  onNext: () => void;
  onBack: () => void;
}

interface Property {
  id: string;
  name: string;
  address: string;
  property_code: string | null;
}

export function PropertiesStep({ onNext, onBack }: PropertiesStepProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProperty, setNewProperty] = useState({ name: '', address: '' });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name, address, property_code')
        .order('name');

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast.error('Erro ao carregar propriedades');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProperty = async () => {
    if (!newProperty.name.trim()) {
      toast.error('Nome da propriedade é obrigatório');
      return;
    }

    setAdding(true);
    try {
      const { data, error } = await supabase
        .from('properties')
        .insert({ name: newProperty.name, address: newProperty.address || null })
        .select()
        .single();

      if (error) throw error;

      setProperties(prev => [...prev, data]);
      setNewProperty({ name: '', address: '' });
      toast.success('Propriedade adicionada com sucesso!');
    } catch (error) {
      console.error('Error adding property:', error);
      toast.error('Erro ao adicionar propriedade');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveProperty = async (id: string) => {
    try {
      const { error } = await supabase.from('properties').delete().eq('id', id);
      if (error) throw error;
      setProperties(prev => prev.filter(p => p.id !== id));
      toast.success('Propriedade removida');
    } catch (error) {
      console.error('Error removing property:', error);
      toast.error('Erro ao remover propriedade');
    }
  };

  return (
    <div className="max-w-2xl w-full">
      <div className="text-center mb-8">
        <div className="mb-6 flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Building2 className="h-7 w-7" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Suas Propriedades</h2>
        <p className="text-muted-foreground">
          Adicione as propriedades que você gerencia.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Adicionar Propriedade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prop-name">Nome da Propriedade *</Label>
              <Input
                id="prop-name"
                placeholder="Ex: Apartamento Centro"
                value={newProperty.name}
                onChange={(e) => setNewProperty(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-address">Endereço</Label>
              <Input
                id="prop-address"
                placeholder="Rua, número, bairro"
                value={newProperty.address}
                onChange={(e) => setNewProperty(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>
          </div>
          <Button onClick={handleAddProperty} disabled={adding || !newProperty.name.trim()}>
            {adding ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Adicionar
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Propriedades Cadastradas</CardTitle>
          <CardDescription>
            {properties.length} propriedade{properties.length !== 1 ? 's' : ''} cadastrada{properties.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : properties.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma propriedade cadastrada ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {properties.map((property) => (
                <div
                  key={property.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border"
                >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{property.name}</p>
                          {property.property_code && (
                            <span className="text-[9px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                              {property.property_code}
                            </span>
                          )}
                        </div>
                        {property.address && (
                          <p className="text-xs text-muted-foreground">{property.address}</p>
                        )}
                      </div>
                    </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemoveProperty(property.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={onNext} disabled={properties.length === 0}>
          Próximo
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
      {properties.length === 0 && (
        <p className="text-xs text-destructive text-center mt-2">
          Adicione pelo menos uma propriedade para continuar.
        </p>
      )}
    </div>
  );
}
