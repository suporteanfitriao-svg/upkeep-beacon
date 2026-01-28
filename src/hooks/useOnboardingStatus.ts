/**
 * Hook para verificar status do onboarding
 * REGRA: Sem onboarding → não usa. Nenhum plano pode ser usado sem onboarding completo.
 * 
 * Apenas Proprietários (Admin) precisam completar onboarding.
 * Cleaners, Managers e SuperAdmins são isentos.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserRole } from './useUserRole';

interface OnboardingStatus {
  isCompleted: boolean;
  loading: boolean;
  /** REGRA: true se o usuário precisa completar onboarding (apenas Proprietários) */
  requiresOnboarding: boolean;
  markAsCompleted: () => Promise<boolean>;
}

export function useOnboardingStatus(): OnboardingStatus {
  const { user } = useAuth();
  const { isCleaner, isManager, isSuperAdmin, isAdmin, loading: roleLoading } = useUserRole();
  const [isCompleted, setIsCompleted] = useState(true); // Default to true to avoid flash
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || roleLoading) {
      setLoading(roleLoading);
      return;
    }

    // REGRA: Cleaners, Managers e SuperAdmins NÃO precisam de onboarding
    // Eles são convidados por Proprietários que já fizeram o onboarding
    if (isCleaner || isManager || isSuperAdmin) {
      setIsCompleted(true);
      setLoading(false);
      return;
    }

    // Apenas Proprietários (Admin) precisam completar onboarding
    if (isAdmin) {
      checkOnboardingStatus();
    } else {
      setIsCompleted(true);
      setLoading(false);
    }
  }, [user, isCleaner, isManager, isSuperAdmin, isAdmin, roleLoading]);

  const checkOnboardingStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error checking onboarding status:', error);
        // If profile doesn't exist or error, assume onboarding needed for admins
        setIsCompleted(false);
      } else {
        setIsCompleted(data?.onboarding_completed ?? false);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setIsCompleted(false);
    } finally {
      setLoading(false);
    }
  };

  const markAsCompleted = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      if (error) {
        console.error('Error marking onboarding as completed:', error);
        return false;
      }

      setIsCompleted(true);
      return true;
    } catch (error) {
      console.error('Error marking onboarding as completed:', error);
      return false;
    }
  };

  // REGRA: Apenas Proprietários (Admin) que não completaram precisam de onboarding
  const requiresOnboarding = isAdmin && !isCompleted && !loading;

  return {
    isCompleted,
    loading,
    requiresOnboarding,
    markAsCompleted,
  };
}
