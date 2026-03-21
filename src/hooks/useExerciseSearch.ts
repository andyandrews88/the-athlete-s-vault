import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useExerciseSearch(query: string) {
  return useQuery({
    queryKey: ['exercises', 'search', query],
    queryFn: async () => {
      if (!query || query.length < 1) return [];
      const { data, error } = await supabase
        .from('exercises')
        .select('id, name, movement_pattern, difficulty_coefficient, exercise_type, video_url')
        .ilike('name', `%${query}%`)
        .limit(8);
      if (error) throw error;
      return data || [];
    },
    enabled: query.length >= 1,
    staleTime: 1000 * 60 * 5,
  });
}
