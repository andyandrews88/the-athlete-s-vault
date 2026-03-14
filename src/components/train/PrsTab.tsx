import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { ALL_PATTERNS } from '@/lib/movementPatterns';

interface PR {
  id: string;
  weight_kg: number;
  reps: number;
  achieved_at: string;
  exercise_name: string;
  movement_pattern: string;
}

export const PrsTab = () => {
  const { user } = useAuth();
  const [prsByPattern, setPrsByPattern] = useState<Record<string, PR[]>>({});

  useEffect(() => {
    if (!user) return;
    loadPrs();
  }, [user]);

  const loadPrs = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('personal_records')
      .select('id, weight_kg, reps, achieved_at, exercise_id, exercises(name, movement_pattern)')
      .eq('user_id', user.id)
      .order('achieved_at', { ascending: false }) as any;

    if (!data) return;

    const grouped: Record<string, PR[]> = {};
    // Deduplicate: keep only the best PR per exercise
    const bestByExercise: Record<string, any> = {};
    for (const pr of data) {
      const exId = pr.exercise_id;
      if (!bestByExercise[exId] || Number(pr.weight_kg) > Number(bestByExercise[exId].weight_kg)) {
        bestByExercise[exId] = pr;
      }
    }

    Object.values(bestByExercise).forEach((pr: any) => {
      const pattern = pr.exercises?.movement_pattern || 'Other';
      if (!grouped[pattern]) grouped[pattern] = [];
      grouped[pattern].push({
        id: pr.id,
        weight_kg: Number(pr.weight_kg),
        reps: pr.reps,
        achieved_at: pr.achieved_at,
        exercise_name: pr.exercises?.name || 'Unknown',
        movement_pattern: pattern,
      });
    });

    setPrsByPattern(grouped);
  };

  const hasPrs = Object.values(prsByPattern).some(prs => prs.length > 0);

  if (!hasPrs) {
    return (
      <div className="mt-4 flex flex-col items-center justify-center py-20 text-center">
        <Trophy className="h-12 w-12 text-vault-gold/30 mb-4" />
        <p className="text-muted-foreground font-mono text-sm">No PRs yet. Start logging to track your bests.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-6">
      {ALL_PATTERNS.filter(p => prsByPattern[p]?.length).map(pattern => (
        <div key={pattern}>
          <h3 className="font-mono text-xs text-muted-foreground tracking-wider mb-3">{pattern.toUpperCase()}</h3>
          <div className="space-y-2">
            {prsByPattern[pattern].map(pr => (
              <div
                key={pr.id}
                className="bg-card rounded-lg p-4 flex items-center justify-between"
                style={{ border: '1px solid hsla(45, 93%, 58%, 0.2)' }}
              >
                <div className="flex items-center gap-3">
                  <Trophy className="h-4 w-4 text-vault-gold" />
                  <div>
                    <p className="text-sm font-medium">{pr.exercise_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {pr.reps} rep{pr.reps !== 1 ? 's' : ''} · {format(new Date(pr.achieved_at), 'dd MMM yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg text-vault-gold">{pr.weight_kg}kg</span>
                  <span className="text-[10px] font-mono bg-vault-gold/20 text-vault-gold px-2 py-0.5 rounded">PR</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
