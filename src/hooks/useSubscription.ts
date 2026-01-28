/**
 * Hook para gerenciar estado da subscription do usuário
 * REGRA: Sem plano → não entra
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserRole } from './useUserRole';

interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  max_properties: number;
  max_syncs_per_property: number;
  features: string[];
  is_active: boolean;
}

interface Subscription {
  id: string;
  plan_id: string;
  status: 'pending' | 'active' | 'cancelled' | 'expired' | 'suspended';
  started_at: string | null;
  expires_at: string | null;
  plan?: SubscriptionPlan;
}

interface UseSubscriptionReturn {
  subscription: Subscription | null;
  plan: SubscriptionPlan | null;
  hasActiveSubscription: boolean;
  loading: boolean;
  error: string | null;
  maxProperties: number;
  canAddProperty: (currentCount: number) => boolean;
  refetch: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const { user } = useAuth();
  const { isSuperAdmin, isCleaner, isManager, loading: roleLoading } = useUserRole();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = async () => {
    if (!user) {
      setSubscription(null);
      setPlan(null);
      setLoading(false);
      return;
    }

    // SuperAdmins e Cleaners/Managers não precisam de subscription
    if (isSuperAdmin || isCleaner || isManager) {
      setSubscription(null);
      setPlan(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching subscription:', fetchError);
        setError(fetchError.message);
        return;
      }

      if (data) {
        setSubscription(data as Subscription);
        setPlan(data.plan as SubscriptionPlan);
      } else {
        setSubscription(null);
        setPlan(null);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Erro ao carregar subscription');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!roleLoading) {
      fetchSubscription();
    }
  }, [user, roleLoading, isSuperAdmin, isCleaner, isManager]);

  const hasActiveSubscription = Boolean(
    subscription && 
    subscription.status === 'active' &&
    (!subscription.expires_at || new Date(subscription.expires_at) > new Date())
  );

  const maxProperties = plan?.max_properties || 0;

  const canAddProperty = (currentCount: number): boolean => {
    if (isSuperAdmin) return true; // SuperAdmin sem limites
    return currentCount < maxProperties;
  };

  return {
    subscription,
    plan,
    hasActiveSubscription,
    loading: loading || roleLoading,
    error,
    maxProperties,
    canAddProperty,
    refetch: fetchSubscription,
  };
}

/**
 * Hook para buscar planos disponíveis
 */
export function useSubscriptionPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('price_monthly', { ascending: true });

        if (fetchError) {
          console.error('Error fetching plans:', fetchError);
          setError(fetchError.message);
          return;
        }

        setPlans(data as SubscriptionPlan[]);
      } catch (err) {
        console.error('Error:', err);
        setError('Erro ao carregar planos');
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  return { plans, loading, error };
}
