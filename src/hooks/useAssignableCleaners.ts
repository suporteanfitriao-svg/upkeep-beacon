import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AssignableCleaner {
  id: string;
  name: string;
  email: string;
}

export function useAssignableCleaners(propertyId: string | null) {
  const [cleaners, setCleaners] = useState<AssignableCleaner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCleaners = useCallback(async () => {
    if (!propertyId) {
      setCleaners([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch cleaners who are either:
      // 1. Has access to all properties (has_all_properties = true)
      // 2. Has specific access to this property via team_member_properties
      const { data, error: fetchError } = await supabase
        .from('team_members')
        .select(`
          id,
          name,
          email,
          has_all_properties,
          team_member_properties!left(property_id)
        `)
        .eq('role', 'cleaner')
        .eq('is_active', true);

      if (fetchError) throw fetchError;

      // Filter cleaners who can access this property
      const eligibleCleaners = (data || []).filter(cleaner => {
        if (cleaner.has_all_properties) return true;
        const properties = cleaner.team_member_properties || [];
        return properties.some((p: { property_id: string }) => p.property_id === propertyId);
      });

      setCleaners(eligibleCleaners.map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
      })));
    } catch (err) {
      console.error('Error fetching assignable cleaners:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar limpadores');
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchCleaners();
  }, [fetchCleaners]);

  return { cleaners, loading, error, refetch: fetchCleaners };
}
