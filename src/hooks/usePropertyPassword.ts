import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type PropertyPasswordMode = 'ical' | 'manual';

interface UsePropertyPasswordProps {
  propertyId: string;
}

interface PropertyPasswordResult {
  passwordMode: PropertyPasswordMode;
  isLoading: boolean;
  updatePasswordMode: (mode: PropertyPasswordMode) => Promise<boolean>;
}

export function usePropertyPassword({ 
  propertyId 
}: UsePropertyPasswordProps): PropertyPasswordResult {
  const [passwordMode, setPasswordMode] = useState<PropertyPasswordMode>('ical');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPasswordMode = async () => {
      if (!propertyId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('properties')
          .select('password_mode')
          .eq('id', propertyId)
          .single();

        if (error) throw error;
        
        setPasswordMode((data?.password_mode as PropertyPasswordMode) || 'ical');
      } catch (err) {
        console.error('Error fetching password mode:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPasswordMode();
  }, [propertyId]);

  const updatePasswordMode = useCallback(async (mode: PropertyPasswordMode): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ password_mode: mode })
        .eq('id', propertyId);

      if (error) throw error;
      
      setPasswordMode(mode);
      return true;
    } catch (err) {
      console.error('Error updating password mode:', err);
      return false;
    }
  }, [propertyId]);

  return {
    passwordMode,
    isLoading,
    updatePasswordMode,
  };
}
