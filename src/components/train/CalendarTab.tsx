import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfWeek, addDays, isToday, isSameDay } from 'date-fns';
import { Trophy, Play } from 'lucide-react';

interface DaySession {
  id: string;
  total_ntu: number | null;
  completed: boolean;
  date: string;
}

interface PR {
  exercise_name: string;
  weight_kg: number;
  reps: number | null;
  achieved_at: string;
}

export const CalendarTab = () => {
  const { user } = useAuth();
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [sessionMap, setSessionMap] = useState<Record<string, DaySession[]>>({});
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [dayExercises, setDayExercises] = useState<any[]>([]);
  const [prs, setPrs] = useState<PR[]>([]);

  useEffect(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    setWeekDays(days);
  }, []);

  useEffect(() => {
    if (!user) return;
    loadWeek();
    loadPrs();
  }, [user]);

  useEffect(() => {
    if (!user || !selectedDay) return;
    loadDayDetail(selectedDay);
  }, [selectedDay, user]);

  const loadWeek = async () => {
    if (!user) return;
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = addDays(start, 6);
    const { data } = await supabase
      .from('training_sessions')
      .select('id, date, total_ntu, completed')
      .eq('user_id', user.id)
      .gte('date', format(start, 'yyyy-MM-dd'))
      .lte('date', format(end, 'yyyy-MM-dd'));

    const map: Record<string, DaySession[]> = {};
    data?.forEach(s => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    });
    setSessionMap(map);
  };

  const loadDayDetail = async (day: Date) => {
    if (!user) return;
    const dateStr = format(day, 'yyyy-MM-dd');
    const sessions = sessionMap[dateStr];
    if (!sessions?.length) { setDayExercises([]); return; }

    const details: any[] = [];
    for (const s of sessions) {
      const { data: exs } = await supabase
        .from('session_exercises')
        .select('exercises(name), exercise_sets(reps, weight_kg, completed)')
        .eq('session_id', s.id) as any;
      details.push(...(exs || []));
    }
    setDayExercises(details);
  };

  const loadPrs = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('personal_records')
      .select('weight_kg, reps, achieved_at, exercises(name)')
      .eq('user_id', user.id)
      .order('achieved_at', { ascending: false })
      .limit(10) as any;

    setPrs((data || []).map((pr: any) => ({
      exercise_name: pr.exercises?.name || '',
      weight_kg: Number(pr.weight_kg),
      reps: pr.reps,
      achieved_at: pr.achieved_at,
    })));
  };

  const dayLabels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  return (
    <div className="mt-4 space-y-6">
      {/* Programme header */}
      <div>
        <h3 className="font-mono text-xs text-muted-foreground tracking-wider mb-1">PROGRAMME</h3>
        <p className="text-sm text-foreground">Functional Bodybuilding</p>
      </div>

      {/* Day strip */}
      <div className="grid grid-cols-7 gap-1.5">
        {weekDays.map((day, i) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const sessions = sessionMap[dateStr];
          const hasCompleted = sessions?.some(s => s.completed);
          const today = isToday(day);
          const selected = isSameDay(day, selectedDay);

          return (
            <button
              key={i}
              onClick={() => setSelectedDay(day)}
              className={`flex flex-col items-center gap-1 py-2 rounded-lg transition-colors ${
                selected ? 'bg-primary/10 border border-primary' :
                hasCompleted ? 'bg-primary/5' : 'bg-card'
              }`}
            >
              <span className="text-[10px] font-mono text-muted-foreground">{dayLabels[i]}</span>
              <span className={`text-sm font-mono ${today ? 'text-primary font-bold' : 'text-foreground'}`}>
                {format(day, 'd')}
              </span>
              {hasCompleted && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
              {today && !hasCompleted && (
                <Play size={10} className="text-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Today's workout / selected day */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium">{format(selectedDay, 'EEEE')}</p>
            <p className="text-xs text-muted-foreground font-mono">{format(selectedDay, 'dd MMM yyyy')}</p>
          </div>
          {isToday(selectedDay) && (
            <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-full">TODAY</span>
          )}
        </div>

        {dayExercises.length > 0 ? (
          <div className="space-y-2">
            {dayExercises.map((ex: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-1">
                <span className="text-sm text-foreground">{ex.exercises?.name}</span>
                <span className="text-xs font-mono text-muted-foreground">
                  {ex.exercise_sets?.filter((s: any) => s.completed).length || 0} sets
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground font-mono text-center py-4">No session logged</p>
        )}
      </div>

      {/* PR Board */}
      <div>
        <h3 className="font-mono text-xs text-muted-foreground tracking-wider mb-3">PR BOARD</h3>
        {prs.length > 0 ? (
          <div className="space-y-2">
            {prs.map((pr, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg"
                style={{
                  background: 'hsl(var(--bg2))',
                  border: '1px solid hsla(45, 93%, 58%, 0.2)',
                }}
              >
                <div className="flex items-center gap-2">
                  <Trophy size={14} className="text-[hsl(var(--gold))]" />
                  <div>
                    <p className="text-sm font-medium">{pr.exercise_name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {format(new Date(pr.achieved_at), 'dd MMM yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-primary font-bold">{pr.weight_kg}kg</span>
                  <span className="text-[10px] font-mono text-[hsl(var(--gold))] bg-[hsla(45,93%,58%,0.1)] px-1.5 py-0.5 rounded">PR</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-6 text-center">
            <Trophy size={24} className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground font-mono">No PRs yet. Start logging to track your bests.</p>
          </div>
        )}
      </div>
    </div>
  );
};
