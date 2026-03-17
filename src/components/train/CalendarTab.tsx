import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  format, startOfWeek, addDays, isToday, isSameDay,
  differenceInWeeks,
} from 'date-fns';
import { Trophy } from 'lucide-react';

interface DayData {
  date: Date;
  hasWorkout: boolean;
  isToday: boolean;
}

interface PRRecord {
  exercise_name: string;
  weight_kg: number;
  reps: number | null;
  achieved_at: string;
}

interface ProgrammeWorkout {
  id: string;
  day_number: number;
  name: string;
  prescribed_exercises: Array<{ name: string; sets: number; reps: string; notes: string }>;
}

export const CalendarTab = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeProgramme, setActiveProgramme] = useState<{ id: string; name: string; weeks: number | null; created_at: string | null } | null>(null);
  const [workouts, setWorkouts] = useState<ProgrammeWorkout[]>([]);
  const [sessionDates, setSessionDates] = useState<Set<string>>(new Set());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [prs, setPrs] = useState<PRRecord[]>([]);

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const dayLabels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  // Current programme week
  const currentWeek = activeProgramme?.created_at
    ? Math.max(1, differenceInWeeks(now, new Date(activeProgramme.created_at)) + 1)
    : 1;

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    // Load active programme
    const { data: progData } = await supabase
      .from('training_programmes')
      .select('id, name, weeks, created_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .single();
    if (progData) {
      setActiveProgramme(progData);
      const { data: wkData } = await supabase
        .from('programme_workouts')
        .select('id, day_number, name, prescribed_exercises')
        .eq('programme_id', progData.id)
        .order('day_number');
      if (wkData) setWorkouts(wkData as ProgrammeWorkout[]);
    }

    // Load completed sessions this week
    const ws = format(weekStart, 'yyyy-MM-dd');
    const we = format(addDays(weekStart, 6), 'yyyy-MM-dd');
    const { data: sessions } = await supabase
      .from('training_sessions')
      .select('date')
      .eq('user_id', user.id)
      .eq('completed', true)
      .gte('date', ws)
      .lte('date', we);
    setSessionDates(new Set((sessions || []).map(s => s.date)));

    // Load PRs
    const { data: prData } = await supabase
      .from('personal_records')
      .select('weight_kg, reps, achieved_at, exercises(name)')
      .eq('user_id', user.id)
      .order('achieved_at', { ascending: false })
      .limit(10) as any;
    setPrs((prData || []).map((pr: any) => ({
      exercise_name: pr.exercises?.name || '',
      weight_kg: Number(pr.weight_kg),
      reps: pr.reps,
      achieved_at: pr.achieved_at,
    })));
  };

  // Selected day's workout
  const selectedDayOfWeek = selectedDay.getDay(); // 0=Sun
  const selectedDayNum = selectedDayOfWeek === 0 ? 7 : selectedDayOfWeek;
  const todayWorkout = workouts.find(w => w.day_number === selectedDayNum);
  const selectedDateStr = format(selectedDay, 'yyyy-MM-dd');
  const dayCompleted = sessionDates.has(selectedDateStr);

  const weeksAgo = (dateStr: string) => {
    const w = differenceInWeeks(now, new Date(dateStr));
    if (w === 0) return 'This week';
    if (w === 1) return '1 week ago';
    return `${w} weeks ago`;
  };

  return (
    <div className="max-w-lg mx-auto px-4 space-y-5">
      {/* Programme header */}
      <div>
        <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 18, color: 'hsl(var(--text))', letterSpacing: 1 }}>PROGRAMME</h2>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'hsl(var(--dim))' }}>
          {activeProgramme ? `${activeProgramme.name} · Week ${currentWeek} of ${activeProgramme.weeks || '∞'}` : 'No active programme'}
        </p>
      </div>

      {/* Horizontal day strip */}
      <div className="flex gap-1">
        {weekDays.map((day, i) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const completed = sessionDates.has(dateStr);
          const today = isToday(day);
          const selected = isSameDay(day, selectedDay);

          return (
            <button
              key={i}
              onClick={() => setSelectedDay(day)}
              className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg transition-all"
              style={{
                background: selected ? 'hsla(192,91%,54%,0.08)' : 'transparent',
                border: selected ? '1px solid hsla(192,91%,54%,0.3)' : '1px solid transparent',
              }}
            >
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, color: 'hsl(var(--dim))', textTransform: 'uppercase' }}>{dayLabels[i]}</span>
              <span style={{ fontSize: 13, fontWeight: today ? 700 : 400, color: today ? 'hsl(var(--primary))' : 'hsl(var(--text))' }}>{format(day, 'd')}</span>
              {/* Status square */}
              <div
                style={{
                  width: 6, height: 6, borderRadius: 1,
                  background: completed ? 'hsl(var(--primary))' : 'transparent',
                  border: today && !completed ? '1px solid hsl(var(--primary))' : completed ? 'none' : '1px solid hsl(var(--dim))',
                  opacity: completed || today ? 1 : 0.3,
                }}
              />
            </button>
          );
        })}
      </div>

      {/* Today's workout card */}
      <div style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))', borderRadius: 10, padding: 14 }}>
        <div className="flex items-center justify-between mb-2">
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: 'hsl(var(--text))' }}>
            {format(selectedDay, 'EEEE')}, {format(selectedDay, 'dd MMM')} {todayWorkout ? `— ${todayWorkout.name}` : ''}
          </p>
          {isToday(selectedDay) && (
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, background: 'hsl(var(--primary))', color: 'hsl(220,16%,6%)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>TODAY</span>
          )}
        </div>

        {todayWorkout ? (
          <>
            <div className="space-y-1 mb-3">
              {todayWorkout.prescribed_exercises.slice(0, 2).map((ex, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div style={{ width: 3, height: 16, borderRadius: 2, background: 'hsl(var(--primary))' }} />
                  <span style={{ fontSize: 10, color: 'hsl(var(--text))' }}>{ex.name}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: 'hsl(var(--dim))' }}>{ex.sets}×{ex.reps}</span>
                </div>
              ))}
              {todayWorkout.prescribed_exercises.length > 2 && (
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: 'hsl(var(--dim))', paddingLeft: 11 }}>
                  +{todayWorkout.prescribed_exercises.length - 2} more exercises...
                </p>
              )}
            </div>
            {dayCompleted ? (
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'hsl(var(--ok))', textAlign: 'center', padding: '8px 0' }}>✓ Completed</div>
            ) : (
              <button
                onClick={() => navigate('/train')}
                style={{ width: '100%', background: 'hsl(var(--primary))', color: 'hsl(220,16%,6%)', fontWeight: 700, fontSize: 11, padding: 8, borderRadius: 8, border: 'none' }}
              >
                Begin Workout →
              </button>
            )}
          </>
        ) : (
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'hsl(var(--dim))', textAlign: 'center', padding: '16px 0' }}>
            {dayCompleted ? '✓ Session completed' : 'Rest day — no workout scheduled'}
          </p>
        )}
      </div>

      {/* PR Board */}
      <div>
        <h3 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 18, color: 'hsl(var(--text))', letterSpacing: 1, marginBottom: 10 }}>PR BOARD</h3>
        {prs.length > 0 ? (
          <div className="space-y-[6px]">
            {prs.map((pr, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))', borderRadius: 8, padding: '10px 14px' }}>
                <div className="flex items-center gap-3">
                  <Trophy size={14} style={{ color: 'hsl(var(--gold))' }} />
                  <div>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: 'hsl(var(--text))' }}>{pr.exercise_name}</p>
                    <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: 'hsl(var(--dim))' }}>{weeksAgo(pr.achieved_at)}</p>
                  </div>
                </div>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: 'hsl(var(--primary))', fontWeight: 600 }}>{pr.weight_kg}kg</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))', borderRadius: 10, padding: '24px 16px', textAlign: 'center' }}>
            <Trophy size={24} style={{ color: 'hsl(var(--dim))', margin: '0 auto 8px' }} />
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'hsl(var(--dim))' }}>No PRs yet. Log sets to track your bests.</p>
          </div>
        )}
      </div>
    </div>
  );
};
