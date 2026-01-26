import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useCepLookup } from '@/hooks/useCepLookup';
import { formatCEP } from '@/lib/formatters';
import { Loader2, Search, MapPin } from 'lucide-react';

export interface AddressFormData {
  address_cep: string;
  address_street: string;
  address_number: string;
  address_complement1: string;
  address_complement2: string;
  address_district: string;
  address_city: string;
  address_state: string;
}

interface PropertyAddressEditorProps {
  value: AddressFormData;
  onChange: (data: AddressFormData) => void;
  onAddressLoaded?: (loaded: boolean) => void;
  isRequired?: boolean;
}

const initialAddressData: AddressFormData = {
  address_cep: '',
  address_street: '',
  address_number: '',
  address_complement1: '',
  address_complement2: '',
  address_district: '',
  address_city: '',
  address_state: '',
};

export function parseAddressToFormData(address: string | null): AddressFormData {
  if (!address) return initialAddressData;
  
  // Try to parse the structured address format
  // Expected format: "Rua X, nº 123, Apto 101, Bloco A, Bairro Y, Cidade - UF, 00000-000"
  const result = { ...initialAddressData };
  
  const parts = address.split(', ');
  if (parts.length >= 2) {
    // Try to find CEP (pattern: XXXXX-XXX or XXXXXXXX)
    const cepMatch = address.match(/(\d{5}-?\d{3})/);
    if (cepMatch) {
      result.address_cep = formatCEP(cepMatch[1]);
    }
    
    // Try to find street (first part, before "nº")
    const streetPart = parts[0];
    if (streetPart && !streetPart.includes('nº')) {
      result.address_street = streetPart;
    }
    
    // Try to find number (after "nº")
    const numberMatch = address.match(/nº\s*(\d+)/);
    if (numberMatch) {
      result.address_number = numberMatch[1];
    }
    
    // Try to find city and state (format: "Cidade - UF")
    const cityStateMatch = address.match(/([^,]+)\s*-\s*([A-Z]{2})/);
    if (cityStateMatch) {
      result.address_city = cityStateMatch[1].trim();
      result.address_state = cityStateMatch[2];
    }
  }
  
  return result;
}

export function buildFullAddress(data: AddressFormData): string {
  const parts = [
    data.address_street,
    data.address_number ? `nº ${data.address_number}` : '',
    data.address_complement1,
    data.address_complement2,
    data.address_district,
    data.address_city && data.address_state ? `${data.address_city} - ${data.address_state}` : '',
    data.address_cep,
  ].filter(Boolean);
  return parts.join(', ');
}

export function PropertyAddressEditor({ 
  value, 
  onChange, 
  onAddressLoaded,
  isRequired = false 
}: PropertyAddressEditorProps) {
  const [addressLoaded, setAddressLoaded] = useState(false);
  
  const { fetching: fetchingCep, handleCepChange } = useCepLookup({
    onSuccess: () => {
      setAddressLoaded(true);
      onAddressLoaded?.(true);
    },
    onError: () => {
      setAddressLoaded(false);
      onAddressLoaded?.(false);
    },
  });

  // Check if address is already loaded based on existing data
  useEffect(() => {
    if (value.address_street && value.address_city && value.address_state) {
      setAddressLoaded(true);
      onAddressLoaded?.(true);
    }
  }, []);

  const onCepChange = (cepValue: string) => {
    const formattedCep = formatCEP(cepValue);
    onChange({ ...value, address_cep: formattedCep });
    
    // Reset address when CEP changes
    if (formattedCep.replace(/\D/g, '').length < 8) {
      setAddressLoaded(false);
      onAddressLoaded?.(false);
      onChange({
        ...value,
        address_cep: formattedCep,
        address_street: '',
        address_district: '',
        address_city: '',
        address_state: '',
      });
    }
  };

  const handleSearchCep = () => {
    handleCepChange(value.address_cep, (updater) => {
      const updated = updater(value);
      onChange(updated);
    });
  };

  const isCepComplete = value.address_cep.replace(/\D/g, '').length === 8;

  return (
    <div className="space-y-4">
      {/* CEP with Search */}
      <div className="space-y-2">
        <Label htmlFor="prop-cep" className="text-sm font-medium">
          CEP {isRequired && '*'}
        </Label>
        <div className="flex gap-2">
          <Input
            id="prop-cep"
            placeholder="00000-000"
            value={value.address_cep}
            onChange={(e) => onCepChange(e.target.value)}
            maxLength={9}
            className="flex-1 rounded-xl"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleSearchCep}
            disabled={fetchingCep || !isCepComplete}
            className="rounded-xl"
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
            <Label className="text-sm font-medium">Logradouro</Label>
            <Input
              value={value.address_street}
              disabled
              className="bg-muted rounded-xl"
            />
          </div>

          {/* District - Read only */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Bairro</Label>
            <Input
              value={value.address_district}
              disabled
              className="bg-muted rounded-xl"
            />
          </div>

          {/* Number and Complements - Editable */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="prop-number" className="text-sm font-medium">Número</Label>
              <Input
                id="prop-number"
                placeholder="123"
                value={value.address_number}
                onChange={(e) => onChange({ ...value, address_number: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-comp1" className="text-sm font-medium">Complemento 1</Label>
              <Input
                id="prop-comp1"
                placeholder="Apto 101"
                value={value.address_complement1}
                onChange={(e) => onChange({ ...value, address_complement1: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-comp2" className="text-sm font-medium">Complemento 2</Label>
              <Input
                id="prop-comp2"
                placeholder="Bloco A"
                value={value.address_complement2}
                onChange={(e) => onChange({ ...value, address_complement2: e.target.value })}
                className="rounded-xl"
              />
            </div>
          </div>

          {/* City and State - Read only */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Cidade</Label>
              <Input
                value={value.address_city}
                disabled
                className="bg-muted rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Estado</Label>
              <Input
                value={value.address_state}
                disabled
                className="bg-muted rounded-xl"
              />
            </div>
          </div>

          {/* Address Preview */}
          <div className="p-3 bg-muted/50 rounded-xl border border-border">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                {buildFullAddress(value)}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export { initialAddressData };
