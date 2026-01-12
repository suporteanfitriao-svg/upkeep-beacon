import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useTeamMemberId() {
  const { user } = useAuth();
  const [teamMemberId, setTeamMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTeamMemberId() {
      if (!user) {
        setTeamMemberId(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('team_member_id')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching team member id:', error);
          setTeamMemberId(null);
        } else {
          setTeamMemberId(data?.team_member_id || null);
        }
      } catch (err) {
        console.error('Error:', err);
        setTeamMemberId(null);
      } finally {
        setLoading(false);
      }
    }

    fetchTeamMemberId();
  }, [user]);

  return { teamMemberId, loading };
}
