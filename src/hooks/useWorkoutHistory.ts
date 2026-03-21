import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useWorkoutHistory(limit = 20) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['workoutHistory', user?.id, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_sessions')
        .select(`
          id, date, total_ntu, completed, workout_notes,
          session_exercises (
            id, display_order, superset_group, notes,
            exercises ( id, name, movement_pattern, difficulty_coefficient, exercise_type, video_url ),
            exercise_sets ( id, set_num, reps, weight_kg, rir, rpe, completed, is_pr, set_type, duration_secs, distance_m, calories )
          )
        `)
        .eq('user_id', user!.id)
        .eq('completed', true)
        .order('date', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });
}

export function usePreviousSets(exerciseId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['previousSets', user?.id, exerciseId],
    queryFn: async () => {
      if (!exerciseId) return null;
      const { data, error } = await supabase
        .from('session_exercises')
        .select(`
          exercise_sets ( set_num, reps, weight_kg, rir ),
          training_sessions!inner ( date, user_id )
        `)
        .eq('exercise_id', exerciseId)
        .order('display_order', { ascending: false })
        .limit(1);
      if (error || !data?.length) return null;
      // Filter to user's sessions and return the most recent
      const userSessions = data.filter(
        (d: any) => d.training_sessions?.user_id === user!.id
      );
      if (!userSessions.length) return null;
      return (userSessions[0] as any)?.exercise_sets || null;
    },
    enabled: !!user && !!exerciseId,
    staleTime: 1000 * 60 * 5,
  });
}
