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
        .select('id, name, description, is_active, template_id')
        .eq('user_id', user!.id)
        .order('is_active', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
  });
}

export function useProgrammeWorkouts(programmeId: string | null, templateId?: string | null) {
  return useQuery({
    queryKey: ['programmeWorkouts', programmeId, templateId],
    queryFn: async () => {
      // Try programme-specific workouts first
      if (programmeId) {
        const { data } = await supabase
          .from('programme_workouts')
          .select('id, day_number, week_number, name, prescribed_exercises')
          .eq('programme_id', programmeId)
          .order('week_number')
          .order('day_number');
        if (data && data.length > 0) return data;
      }

      // Fall back to template workouts
      if (templateId) {
        const { data, error } = await supabase
          .from('programme_workouts')
          .select('id, day_number, week_number, name, prescribed_exercises')
          .eq('template_id', templateId)
          .order('week_number')
          .order('day_number');
        if (error) throw error;
        return data || [];
      }

      return [];
    },
    enabled: !!(programmeId || templateId),
    staleTime: 1000 * 60 * 10,
  });
}
