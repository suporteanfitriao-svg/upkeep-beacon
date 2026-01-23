import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserRole } from './useUserRole';

interface OnboardingStatus {
  isCompleted: boolean;
  loading: boolean;
  markAsCompleted: () => Promise<boolean>;
}

export function useOnboardingStatus(): OnboardingStatus {
  const { user } = useAuth();
  const { isCleaner, loading: roleLoading } = useUserRole();
  const [isCompleted, setIsCompleted] = useState(true); // Default to true to avoid flash
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || roleLoading) {
      setLoading(roleLoading);
      return;
    }

    // Cleaners don't need onboarding
    if (isCleaner) {
      setIsCompleted(true);
      setLoading(false);
      return;
    }

    checkOnboardingStatus();
  }, [user, isCleaner, roleLoading]);

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
        // If profile doesn't exist or error, assume onboarding needed
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

  return {
    isCompleted,
    loading,
    markAsCompleted,
  };
}
