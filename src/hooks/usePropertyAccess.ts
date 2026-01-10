import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UsePropertyAccessProps {
  propertyId: string;
  teamMemberId: string | null;
  enabled?: boolean;
}

interface PropertyAccessResult {
  hasAccess: boolean;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

/**
 * Hook to check if a team member has access to a specific property.
 * Access is granted if:
 * 1. Team member has has_all_properties = true
 * 2. Team member is linked to the property via team_member_properties
 */
export function usePropertyAccess({ 
  propertyId, 
  teamMemberId,
  enabled = true 
}: UsePropertyAccessProps): PropertyAccessResult {
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkAccess = useCallback(async () => {
    if (!propertyId || !teamMemberId || !enabled) {
      setIsLoading(false);
      setHasAccess(false);
      return;
    }

    setIsLoading(true);
    try {
      // First check if team member has access to all properties
      const { data: member, error: memberError } = await supabase
        .from('team_members')
        .select('has_all_properties')
        .eq('id', teamMemberId)
        .single();

      if (memberError) throw memberError;

      if (member?.has_all_properties) {
        setHasAccess(true);
        setIsLoading(false);
        return;
      }

      // Check specific property access
      const { data: propertyAccess, error: accessError } = await supabase
        .from('team_member_properties')
        .select('id')
        .eq('team_member_id', teamMemberId)
        .eq('property_id', propertyId)
        .maybeSingle();

      if (accessError) throw accessError;

      setHasAccess(!!propertyAccess);
    } catch (err) {
      console.error('Error checking property access:', err);
      setHasAccess(false);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, teamMemberId, enabled]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  return {
    hasAccess,
    isLoading,
    refetch: checkAccess,
  };
}
