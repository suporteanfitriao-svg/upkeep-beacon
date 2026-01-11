import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ChecklistValidationResult {
  canDeactivate: boolean;
  requiresConfirmation: boolean;
  cleaningCount: number;
  pendingCount: number;
  message: string;
}

interface UseChecklistValidationReturn {
  validateDeactivation: (propertyId: string) => Promise<ChecklistValidationResult>;
  isValidating: boolean;
}

export function useChecklistValidation(): UseChecklistValidationReturn {
  const [isValidating, setIsValidating] = useState(false);

  const validateDeactivation = useCallback(async (propertyId: string): Promise<ChecklistValidationResult> => {
    setIsValidating(true);
    try {
      const { data, error } = await supabase
        .rpc('can_deactivate_checklist', { p_property_id: propertyId });

      if (error) {
        console.error('Error validating checklist deactivation:', error);
        return {
          canDeactivate: false,
          requiresConfirmation: false,
          cleaningCount: 0,
          pendingCount: 0,
          message: 'Erro ao validar checklist'
        };
      }

      const result = data as {
        can_deactivate: boolean;
        requires_confirmation: boolean;
        cleaning_count: number;
        pending_count: number;
        message: string;
      };

      return {
        canDeactivate: result.can_deactivate,
        requiresConfirmation: result.requires_confirmation,
        cleaningCount: result.cleaning_count,
        pendingCount: result.pending_count,
        message: result.message
      };
    } catch (err) {
      console.error('Error in validateDeactivation:', err);
      return {
        canDeactivate: false,
        requiresConfirmation: false,
        cleaningCount: 0,
        pendingCount: 0,
        message: 'Erro ao validar checklist'
      };
    } finally {
      setIsValidating(false);
    }
  }, []);

  return { validateDeactivation, isValidating };
}
