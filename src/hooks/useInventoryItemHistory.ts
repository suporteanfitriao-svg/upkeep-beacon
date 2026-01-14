import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface HistoryChange {
  field: string;
  old: any;
  new: any;
}

export const useInventoryItemHistory = () => {
  const recordHistory = useCallback(async (
    itemId: string,
    action: 'created' | 'updated' | 'photo_added' | 'photo_removed',
    changes?: Record<string, { old: any; new: any }>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Try to get user name from profile
      let userName = user.email || 'Usuário';
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profile?.name) {
        userName = profile.name;
      }

      await supabase.from('inventory_item_history').insert({
        item_id: itemId,
        user_id: user.id,
        user_name: userName,
        action,
        changes: changes || null,
      });
    } catch (error) {
      console.error('Error recording history:', error);
    }
  }, []);

  const getItemHistory = useCallback(async (itemId: string) => {
    try {
      const { data, error } = await supabase
        .from('inventory_item_history')
        .select('*')
        .eq('item_id', itemId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching history:', error);
      return [];
    }
  }, []);

  return { recordHistory, getItemHistory };
};
