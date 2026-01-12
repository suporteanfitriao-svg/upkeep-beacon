import { useState } from 'react';
import { toast } from 'sonner';
import { formatCEP } from '@/lib/formatters';

interface CepData {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

interface UseCepLookupOptions {
  onSuccess?: (data: CepData) => void;
  onError?: () => void;
}

export function useCepLookup(options?: UseCepLookupOptions) {
  const [fetching, setFetching] = useState(false);

  const handleCepChange = async (
    value: string,
    setFormData: (updater: (prev: any) => any) => void
  ) => {
    const formattedCep = formatCEP(value);
    setFormData((prev: any) => ({ ...prev, address_cep: formattedCep }));

    // Only fetch when we have a complete CEP (8 digits)
    const cleanCep = formattedCep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setFetching(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data: CepData = await response.json();

        if (data.erro) {
          toast.error('CEP não encontrado');
          options?.onError?.();
          return;
        }

        setFormData((prev: any) => ({
          ...prev,
          address_street: data.logradouro || prev.address_street,
          address_district: data.bairro || prev.address_district,
          address_city: data.localidade || prev.address_city,
          address_state: data.uf || prev.address_state,
        }));
        
        toast.success('Endereço preenchido automaticamente');
        options?.onSuccess?.(data);
      } catch (error) {
        console.error('Error fetching CEP:', error);
        toast.error('Erro ao buscar CEP');
        options?.onError?.();
      } finally {
        setFetching(false);
      }
    }
  };

  return {
    fetching,
    handleCepChange,
  };
}
