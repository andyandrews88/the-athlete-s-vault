import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function usePersonalRecords() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['personalRecords', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personal_records')
        .select(`
          id, weight_kg, reps, achieved_at,
          exercises ( id, name, movement_pattern )
        `)
        .eq('user_id', user!.id)
        .order('achieved_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
}
