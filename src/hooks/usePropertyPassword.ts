import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type PropertyPasswordMode = 'ical' | 'manual' | 'global';

interface UsePropertyPasswordProps {
  propertyId: string;
}

interface PropertyPasswordResult {
  passwordMode: PropertyPasswordMode;
  globalPassword: string | null;
  isLoading: boolean;
  updatePasswordMode: (mode: PropertyPasswordMode) => Promise<boolean>;
  updateGlobalPassword: (password: string) => Promise<boolean>;
}

export function usePropertyPassword({ 
  propertyId 
}: UsePropertyPasswordProps): PropertyPasswordResult {
  const [passwordMode, setPasswordMode] = useState<PropertyPasswordMode>('ical');
  const [globalPassword, setGlobalPassword] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPasswordSettings = async () => {
      if (!propertyId) {
        setIsLoading(false);
        return;
      }

      try {
        // Read non-sensitive mode from table; sensitive password via SECURITY DEFINER RPC
        const { data: modeData, error: modeError } = await supabase
          .from('properties')
          .select('password_mode')
          .eq('id', propertyId)
          .single();

        if (modeError) throw modeError;
        setPasswordMode((modeData?.password_mode as PropertyPasswordMode) || 'ical');

        // Only admin/manager/superadmin will receive a non-null value
        const { data: pwd } = await supabase
          .rpc('get_property_global_password', { p_property_id: propertyId });
        setGlobalPassword((pwd as string) || null);
      } catch (err) {
        console.error('Error fetching password settings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPasswordSettings();
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

  const updateGlobalPassword = useCallback(async (password: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ global_access_password: password || null })
        .eq('id', propertyId);

      if (error) throw error;
      
      setGlobalPassword(password || null);
      return true;
    } catch (err) {
      console.error('Error updating global password:', err);
      return false;
    }
  }, [propertyId]);

  return {
    passwordMode,
    globalPassword,
    isLoading,
    updatePasswordMode,
    updateGlobalPassword,
  };
}
