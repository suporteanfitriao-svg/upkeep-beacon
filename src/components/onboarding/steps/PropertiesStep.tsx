import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Plus, ArrowLeft, ArrowRight, Loader2, Trash2, MapPin, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePropertyGeocoding } from '@/hooks/usePropertyGeocoding';
import { useCepLookup } from '@/hooks/useCepLookup';
import { formatCEP } from '@/lib/formatters';

interface PropertiesStepProps {
  onNext: () => void;
  onBack: () => void;
}

interface Property {
  id: string;
  name: string;
  address: string;
  property_code: string | null;
  require_checklist: boolean;
}

interface PropertyFormData {
  name: string;
  address_cep: string;
  address_street: string;
  address_number: string;
  address_complement1: string;
  address_complement2: string;
  address_district: string;
  address_city: string;
  address_state: string;
}

const initialFormData: PropertyFormData = {
  name: '',
  address_cep: '',
  address_street: '',
  address_number: '',
  address_complement1: '',
  address_complement2: '',
  address_district: '',
  address_city: '',
  address_state: '',
};

export function PropertiesStep({ onNext, onBack }: PropertiesStepProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<PropertyFormData>(initialFormData);
  const [adding, setAdding] = useState(false);
  const [addressLoaded, setAddressLoaded] = useState(false);
  const { geocodeProperty } = usePropertyGeocoding();
  const { fetching: fetchingCep, handleCepChange } = useCepLookup({
    onSuccess: () => setAddressLoaded(true),
    onError: () => setAddressLoaded(false),
  });

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name, address, property_code, require_checklist')
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

  const buildFullAddress = (): string => {
    const parts = [
      formData.address_street,
      formData.address_number ? `nº ${formData.address_number}` : '',
      formData.address_complement1,
      formData.address_complement2,
      formData.address_district,
      `${formData.address_city} - ${formData.address_state}`,
      formData.address_cep,
    ].filter(Boolean);
    return parts.join(', ');
  };

  const handleAddProperty = async () => {
    if (!formData.name.trim()) {
      toast.error('Nome da propriedade é obrigatório');
      return;
    }

    if (!addressLoaded) {
      toast.error('Por favor, busque o endereço pelo CEP');
      return;
    }

    setAdding(true);
    try {
      const fullAddress = buildFullAddress();
      
      const { data, error } = await supabase
        .from('properties')
        .insert({ name: formData.name, address: fullAddress })
        .select()
        .single();

      if (error) throw error;

      // Geocode address automatically
      if (data) {
        geocodeProperty(data.id).then(result => {
          if (result.success) {
            console.log('[PropertiesStep] Property geocoded successfully');
          }
        });
      }

      setProperties(prev => [...prev, data]);
      setFormData(initialFormData);
      setAddressLoaded(false);
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

  const onCepChange = (value: string) => {
    const formattedCep = formatCEP(value);
    setFormData(prev => ({ ...prev, address_cep: formattedCep }));
    
    // Reset address when CEP changes
    if (formattedCep.replace(/\D/g, '').length < 8) {
      setAddressLoaded(false);
      setFormData(prev => ({
        ...prev,
        address_cep: formattedCep,
        address_street: '',
        address_district: '',
        address_city: '',
        address_state: '',
      }));
    }
  };

  const handleSearchCep = () => {
    handleCepChange(formData.address_cep, setFormData);
  };

  const canAddProperty = formData.name.trim() && addressLoaded;

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
          {/* Property Name */}
          <div className="space-y-2">
            <Label htmlFor="prop-name">Nome da Propriedade *</Label>
            <Input
              id="prop-name"
              placeholder="Ex: Apartamento Centro"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          {/* CEP with Search */}
          <div className="space-y-2">
            <Label htmlFor="prop-cep">CEP *</Label>
            <div className="flex gap-2">
              <Input
                id="prop-cep"
                placeholder="00000-000"
                value={formData.address_cep}
                onChange={(e) => onCepChange(e.target.value)}
                maxLength={9}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSearchCep}
                disabled={fetchingCep || formData.address_cep.replace(/\D/g, '').length !== 8}
              >
                {fetchingCep ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Address Fields - Only shown after CEP lookup */}
          {addressLoaded && (
            <>
              {/* Street - Read only */}
              <div className="space-y-2">
                <Label>Logradouro</Label>
                <Input
                  value={formData.address_street}
                  disabled
                  className="bg-muted"
                />
              </div>

              {/* District - Read only */}
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input
                  value={formData.address_district}
                  disabled
                  className="bg-muted"
                />
              </div>

              {/* Number and Complements */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="prop-number">Número</Label>
                  <Input
                    id="prop-number"
                    placeholder="123"
                    value={formData.address_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, address_number: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prop-comp1">Complemento 1</Label>
                  <Input
                    id="prop-comp1"
                    placeholder="Apto 101"
                    value={formData.address_complement1}
                    onChange={(e) => setFormData(prev => ({ ...prev, address_complement1: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prop-comp2">Complemento 2</Label>
                  <Input
                    id="prop-comp2"
                    placeholder="Bloco A"
                    value={formData.address_complement2}
                    onChange={(e) => setFormData(prev => ({ ...prev, address_complement2: e.target.value }))}
                  />
                </div>
              </div>

              {/* City and State - Read only */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input
                    value={formData.address_city}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Input
                    value={formData.address_state}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              {/* Address Preview */}
              <div className="p-3 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    {buildFullAddress()}
                  </p>
                </div>
              </div>
            </>
          )}

          <Button onClick={handleAddProperty} disabled={adding || !canAddProperty}>
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{property.name}</p>
                          {property.property_code && (
                            <span className="text-[9px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                              {property.property_code}
                            </span>
                          )}
                          {!property.require_checklist && (
                            <span className="text-[9px] font-medium text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              Sem checklist
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
