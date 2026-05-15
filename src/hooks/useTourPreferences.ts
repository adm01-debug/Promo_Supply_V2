import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';

interface TourPreference {
  tourKey: string;
  completed: boolean;
  skipped: boolean;
  completedAt: string | null;
  skippedAt: string | null;
}

export const useTourPreferences = (tourKey: string) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [preference, setPreference] = useState<TourPreference | null>(null);

  // Fetch preference from database
  const fetchPreference = useCallback(async () => {
    // Don't show tour if user is not logged in
    if (!user?.id) {
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_tour_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('tour_key', tourKey)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreference({
          tourKey: data.tour_key,
          completed: data.completed || false,
          skipped: data.skipped || false,
          completedAt: data.completed_at,
          skippedAt: data.skipped_at,
        });
        // Don't show tour if already completed or skipped
        setIsOpen(false);
      } else {
        // First time logged-in user - show tour
        setIsOpen(true);
      }
    } catch (error) {
      // On error, check localStorage as fallback
      const localKey = `tour_${tourKey}`;
      const localData = localStorage.getItem(localKey);
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          setIsOpen(!parsed.completed && !parsed.skipped);
        } catch {
          setIsOpen(false);
        }
      } else {
        // Don't show tour on error - safer default
        setIsOpen(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, tourKey]);

  useEffect(() => {
    fetchPreference();
  }, [fetchPreference]);

  // Mark tour as completed
  const complete = useCallback(async () => {
    setIsOpen(false);
    
    if (!user?.id) {
      localStorage.setItem(`tour_${tourKey}`, JSON.stringify({ completed: true, skipped: false }));
      return;
    }

    try {
      const { error } = await supabase
        .from('user_tour_preferences')
        .upsert({
          user_id: user.id,
          tour_key: tourKey,
          completed: true,
          skipped: false,
          completed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,tour_key',
        });

      if (error) throw error;
      
      setPreference(prev => prev ? { ...prev, completed: true, completedAt: new Date().toISOString() } : null);
    } catch (error) {
      logger.error('Error saving tour completion', { error });
      localStorage.setItem(`tour_${tourKey}`, JSON.stringify({ completed: true, skipped: false }));
    }
  }, [user?.id, tourKey]);

  // Mark tour as skipped
  const skip = useCallback(async () => {
    setIsOpen(false);
    
    if (!user?.id) {
      localStorage.setItem(`tour_${tourKey}`, JSON.stringify({ completed: false, skipped: true }));
      return;
    }

    try {
      const { error } = await supabase
        .from('user_tour_preferences')
        .upsert({
          user_id: user.id,
          tour_key: tourKey,
          completed: false,
          skipped: true,
          skipped_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,tour_key',
        });

      if (error) throw error;
      
      setPreference(prev => prev ? { ...prev, skipped: true, skippedAt: new Date().toISOString() } : null);
    } catch (error) {
      logger.error('Error saving tour skip', { error });
      localStorage.setItem(`tour_${tourKey}`, JSON.stringify({ completed: false, skipped: true }));
    }
  }, [user?.id, tourKey]);

  // Restart tour (reset preferences)
  const restart = useCallback(async () => {
    if (!user?.id) {
      localStorage.removeItem(`tour_${tourKey}`);
      setIsOpen(true);
      return;
    }

    try {
      const { error } = await supabase
        .from('user_tour_preferences')
        .delete()
        .eq('user_id', user.id)
        .eq('tour_key', tourKey);

      if (error) throw error;
      
      setPreference(null);
      setIsOpen(true);
    } catch (error) {
      logger.error('Error restarting tour', { error });
      localStorage.removeItem(`tour_${tourKey}`);
      setIsOpen(true);
    }
  }, [user?.id, tourKey]);

  return {
    isOpen,
    setIsOpen,
    isLoading,
    preference,
    complete,
    skip,
    restart,
    isCompleted: preference?.completed || false,
    isSkipped: preference?.skipped || false,
  };
};

// Hook to manage all tours
export const useAllTourPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<TourPreference[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllPreferences = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_tour_preferences')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      setPreferences((data || []).map(item => ({
        tourKey: item.tour_key,
        completed: item.completed || false,
        skipped: item.skipped || false,
        completedAt: item.completed_at,
        skippedAt: item.skipped_at,
      })));
    } catch (error) {
      logger.error('Error fetching all tour preferences', { error });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAllPreferences();
  }, [fetchAllPreferences]);

  const resetTour = useCallback(async (tourKey: string) => {
    if (!user?.id) return;

    try {
      await supabase
        .from('user_tour_preferences')
        .delete()
        .eq('user_id', user.id)
        .eq('tour_key', tourKey);

      setPreferences(prev => prev.filter(p => p.tourKey !== tourKey));
    } catch (error) {
      logger.error('Error resetting tour', { error });
    }
  }, [user?.id]);

  const resetAllTours = useCallback(async () => {
    if (!user?.id) return;

    try {
      await supabase
        .from('user_tour_preferences')
        .delete()
        .eq('user_id', user.id);

      setPreferences([]);
    } catch (error) {
      logger.error('Error resetting all tours', { error });
    }
  }, [user?.id]);

  return {
    preferences,
    isLoading,
    resetTour,
    resetAllTours,
    refetch: fetchAllPreferences,
  };
};
