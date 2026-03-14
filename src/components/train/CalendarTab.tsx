import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addDays, isToday, isSameDay, eachDayOfInterval, getDay,
} from 'date-fns';
import { Trophy } from 'lucide-react';

interface DaySession {
  id: string;
  total_ntu: number | null;
  completed: boolean;
  date: string;
}

export const CalendarTab = () => {
  const { user } = useAuth();
  const [view, setView] = useState<'week' | 'month'>('month');
  const [currentDate] = useState(new Date());
  const [sessionMap, setSessionMap] = useState<Record<string, DaySession[]>>({});
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [dayExercises, setDayExercises] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    loadSessions();
  }, [user, view]);

  useEffect(() => {
    if (!user || !selectedDay) return;
    loadDayDetail(selectedDay);
  }, [selectedDay, user, sessionMap]);

  const loadSessions = async () => {
    if (!user) return;
    const start = view === 'week'
      ? startOfWeek(currentDate, { weekStartsOn: 1 })
      : startOfMonth(currentDate);
    const end = view === 'week'
      ? endOfWeek(currentDate, { weekStartsOn: 1 })
      : endOfMonth(currentDate);

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

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start of month to align with Monday
  const firstDayOfWeek = getDay(monthStart); // 0=Sun
  const padStart = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const dayLabels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const displayDays = view === 'week' ? weekDays : monthDays;

  return (
    <div className="max-w-lg mx-auto px-4 space-y-4">
      {/* View toggle */}
      <div className="inline-flex bg-vault-bg3 border border-vault-border rounded-lg p-1">
        {(['week', 'month'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-1.5 font-mono text-[10px] uppercase tracking-wider rounded-md transition-all ${
              view === v
                ? 'bg-primary text-primary-foreground font-bold'
                : 'text-vault-dim'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Month header */}
      <h2 className="font-display text-3xl tracking-[2px] text-center">
        {format(currentDate, 'MMMM yyyy').toUpperCase()}
      </h2>

      {/* Day column headers */}
      <div className="grid grid-cols-7 mb-2">
        {dayLabels.map((d) => (
          <span key={d} className="font-mono text-[9px] text-vault-dim uppercase text-center">{d}</span>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Padding for month view */}
        {view === 'month' && Array.from({ length: padStart }).map((_, i) => (
          <div key={`pad-${i}`} className="aspect-square" />
        ))}

        {displayDays.map((day, i) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const sessions = sessionMap[dateStr];
          const hasWorkout = sessions?.some(s => s.completed);
          const today = isToday(day);
          const selected = isSameDay(day, selectedDay);

          return (
            <button
              key={i}
              onClick={() => setSelectedDay(day)}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-mono relative transition-all ${
                today
                  ? 'bg-primary text-primary-foreground font-bold'
                  : hasWorkout
                    ? 'bg-vault-bg3 border border-vault-border'
                    : 'bg-vault-bg2 border border-vault-border text-vault-dim'
              } ${selected && !today ? 'ring-1 ring-primary' : ''}`}
            >
              {format(day, 'd')}
              {hasWorkout && !today && (
                <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tapped day expansion */}
      <div className="bg-vault-bg2 border border-primary/20 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-foreground">{format(selectedDay, 'EEEE')}</p>
            <p className="font-mono text-[10px] text-vault-dim">{format(selectedDay, 'dd MMM yyyy')}</p>
          </div>
          {isToday(selectedDay) && (
            <span className="font-mono text-[9px] text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">TODAY</span>
          )}
        </div>

        {dayExercises.length > 0 ? (
          <div className="space-y-2">
            {dayExercises.map((ex: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-1">
                <span className="text-sm text-foreground">{ex.exercises?.name}</span>
                <span className="font-mono text-[10px] text-vault-dim">
                  {ex.exercise_sets?.filter((s: any) => s.completed).length || 0} sets
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="font-mono text-[10px] text-vault-dim text-center py-4">No session logged</p>
        )}
      </div>

      {/* PR Board */}
      <PRBoard />
    </div>
  );
};

const PRBoard = () => {
  const { user } = useAuth();
  const [prs, setPrs] = useState<{ exercise_name: string; weight_kg: number; reps: number | null; achieved_at: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
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
    })();
  }, [user]);

  return (
    <div>
      <h3 className="font-mono text-[10px] text-vault-dim uppercase tracking-widest mb-3">PR BOARD</h3>
      {prs.length > 0 ? (
        <div className="space-y-2">
          {prs.map((pr, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-vault-bg2 border border-vault-gold/20">
              <div className="flex items-center gap-2">
                <Trophy size={14} className="text-vault-gold" />
                <div>
                  <p className="text-sm font-medium text-foreground">{pr.exercise_name}</p>
                  <p className="font-mono text-[10px] text-vault-dim">
                    {format(new Date(pr.achieved_at), 'dd MMM yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-primary font-bold">{pr.weight_kg}kg</span>
                <span className="font-mono text-[9px] text-vault-gold bg-vault-gold/10 px-1.5 py-0.5 rounded">PR</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-vault-bg2 border border-vault-border rounded-2xl p-6 text-center">
          <Trophy size={24} className="mx-auto mb-2 text-vault-dim" />
          <p className="font-mono text-[10px] text-vault-dim">No PRs yet. Start logging to track your bests.</p>
        </div>
      )}
    </div>
  );
};
