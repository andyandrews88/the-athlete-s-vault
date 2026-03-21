import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useUserProgrammes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['programmes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_programmes')
        .select('id, name, description, is_active')
        .eq('user_id', user!.id)
        .order('is_active', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
  });
}

export function useProgrammeWorkouts(programmeId: string | null) {
  return useQuery({
    queryKey: ['programmeWorkouts', programmeId],
    queryFn: async () => {
      if (!programmeId) return [];
      const { data, error } = await supabase
        .from('programme_workouts')
        .select('id, day_number, name, prescribed_exercises')
        .eq('programme_id', programmeId)
        .order('day_number');
      if (error) throw error;
      return data || [];
    },
    enabled: !!programmeId,
    staleTime: 1000 * 60 * 10,
  });
}
