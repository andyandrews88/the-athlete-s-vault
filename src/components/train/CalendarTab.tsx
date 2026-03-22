import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useWorkoutStore } from '@/stores/workoutStore';
import {
  format, startOfWeek, startOfMonth, endOfMonth, addDays, addMonths, subMonths,
  isToday, isSameDay, isSameMonth, getDay, differenceInWeeks, eachDayOfInterval,
} from 'date-fns';
import { Trophy, ChevronLeft, ChevronRight, X } from 'lucide-react';

/* ─── Types ─── */
interface PRRecord {
  exercise_name: string;
  weight_kg: number;
  reps: number | null;
  achieved_at: string;
}

interface SessionData {
  id: string;
  date: string;
  completed: boolean | null;
  total_ntu: number | null;
  workout_notes: string | null;
  session_exercises: Array<{
    exercises: { name: string; movement_pattern: string | null } | null;
    exercise_sets: Array<{
      set_num: number;
      reps: number | null;
      weight_kg: number | null;
      completed: boolean | null;
    }>;
  }>;
}

interface ProgrammeWorkout {
  id: string;
  day_number: number;
  name: string;
  prescribed_exercises: Array<{ name: string; sets: number; reps: string; notes: string }>;
}

/* ─── Movement pattern colors ─── */
const patternColor = (p: string | null) => {
  const map: Record<string, string> = {
    Push: 'hsl(var(--primary))', Pull: 'hsl(142, 71%, 45%)',
    Squat: 'hsl(38, 92%, 50%)', Hinge: 'hsl(0, 72%, 51%)',
    Core: 'hsl(45, 93%, 58%)', Carry: 'hsl(215, 14%, 50%)',
  };
  return map[p || ''] || 'hsl(var(--dim))';
};

/* ─── Component ─── */
export const CalendarTab = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const setViewingWorkout = useWorkoutStore(s => s.setViewingWorkout);

  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [sheetDay, setSheetDay] = useState<Date | null>(null);
  const [activeProgramme, setActiveProgramme] = useState<{ id: string; name: string; weeks: number | null; created_at: string | null } | null>(null);
  const [programmeWorkouts, setProgrammeWorkouts] = useState<ProgrammeWorkout[]>([]);
  const [prs, setPrs] = useState<PRRecord[]>([]);

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const dayLabels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  const currentWeek = activeProgramme?.created_at
    ? Math.max(1, differenceInWeeks(now, new Date(activeProgramme.created_at)) + 1)
    : 1;

  /* ─── Month calendar days ─── */
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = useMemo(() => {
    const startDow = getDay(monthStart);
    const adjustedStart = startDow === 0 ? 6 : startDow - 1; // Mon=0
    const gridStart = addDays(monthStart, -adjustedStart);
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [currentMonth]);

  /* ─── React Query: sessions for month ─── */
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const { data: monthSessions = [] } = useQuery<SessionData[]>({
    queryKey: ['calendarSessions', user?.id, year, month],
    queryFn: async () => {
      if (!user) return [];
      const from = format(monthStart, 'yyyy-MM-dd');
      const to = format(monthEnd, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('training_sessions')
        .select(`
          id, date, completed, total_ntu, workout_notes,
          session_exercises (
            exercises (name, movement_pattern),
            exercise_sets (set_num, reps, weight_kg, completed)
          )
        `)
        .eq('user_id', user.id)
        .gte('date', from)
        .lte('date', to) as any;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });

  /* ─── Sessions lookup by date ─── */
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, SessionData[]>();
    for (const s of monthSessions) {
      const existing = map.get(s.date) || [];
      existing.push(s);
      map.set(s.date, existing);
    }
    return map;
  }, [monthSessions]);

  /* ─── Week strip session dates (derived from monthSessions or separate query) ─── */
  const weekSessionDates = useMemo(() => {
    const set = new Set<string>();
    for (const s of monthSessions) {
      if (s.completed) set.add(s.date);
    }
    return set;
  }, [monthSessions]);

  /* ─── Programme workouts by day number ─── */
  const progWorkoutByDay = useMemo(() => {
    const map = new Map<number, ProgrammeWorkout>();
    for (const w of programmeWorkouts) map.set(w.day_number, w);
    return map;
  }, [programmeWorkouts]);

  /* ─── Load programme + PRs ─── */
  useEffect(() => {
    if (!user) return;
    loadStaticData();
  }, [user]);

  const loadStaticData = async () => {
    if (!user) return;

    // Active programme
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
      if (wkData) setProgrammeWorkouts(wkData as ProgrammeWorkout[]);
    }

    // PRs
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

  /* ─── Day helpers ─── */
  const getDayStatus = useCallback((day: Date): 'completed' | 'missed' | 'free' | null => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const sessions = sessionsByDate.get(dateStr);
    const dow = getDay(day);
    const dayNum = dow === 0 ? 7 : dow;
    const hasProgrammeWorkout = progWorkoutByDay.has(dayNum);

    if (sessions?.some(s => s.completed)) {
      return hasProgrammeWorkout ? 'completed' : 'free';
    }
    if (hasProgrammeWorkout && day < now && !isToday(day)) {
      return 'missed';
    }
    return null;
  }, [sessionsByDate, progWorkoutByDay, now]);

  const getSheetData = useCallback((day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const sessions = sessionsByDate.get(dateStr) || [];
    const completedSession = sessions.find(s => s.completed);
    const dow = getDay(day);
    const dayNum = dow === 0 ? 7 : dow;
    const planned = progWorkoutByDay.get(dayNum) || null;
    return { completedSession, planned };
  }, [sessionsByDate, progWorkoutByDay]);

  /* ─── Week strip selected day workout ─── */
  const selectedDayOfWeek = selectedDay.getDay();
  const selectedDayNum = selectedDayOfWeek === 0 ? 7 : selectedDayOfWeek;
  const todayWorkout = programmeWorkouts.find(w => w.day_number === selectedDayNum);
  const selectedDateStr = format(selectedDay, 'yyyy-MM-dd');
  const dayCompleted = weekSessionDates.has(selectedDateStr);

  const weeksAgo = (dateStr: string) => {
    const w = differenceInWeeks(now, new Date(dateStr));
    if (w === 0) return 'This week';
    if (w === 1) return '1 week ago';
    return `${w} weeks ago`;
  };

  /* ─── Helpers for sheet ─── */
  const handleViewWorkout = (sessionId: string) => {
    setViewingWorkout(sessionId);
    setSheetDay(null);
    navigate('/train');
  };

  const handleStartProgrammeWorkout = () => {
    setSheetDay(null);
    navigate('/train');
  };

  return (
    <div className="max-w-lg mx-auto px-4 space-y-5 pb-8">

      {/* ═══ SECTION 1 — Programme header + Week strip (kept) ═══ */}
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
          const completed = weekSessionDates.has(dateStr);
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

      {/* ═══ SECTION 2 — MONTH CALENDAR ═══ */}
      <div>
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-1">
            <ChevronLeft size={18} style={{ color: 'hsl(var(--dim))' }} />
          </button>
          <h3 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 20, color: 'hsl(var(--primary))', letterSpacing: 2 }}>
            {format(currentMonth, 'MMMM yyyy').toUpperCase()}
          </h3>
          <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-1">
            <ChevronRight size={18} style={{ color: 'hsl(var(--dim))' }} />
          </button>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-7 mb-1">
          {dayLabels.map(d => (
            <div key={d} className="text-center" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: 'hsl(var(--dim))' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, i) => {
            const inMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);
            const status = inMonth ? getDayStatus(day) : null;

            return (
              <button
                key={i}
                onClick={() => inMonth && setSheetDay(day)}
                className="flex flex-col items-center justify-center relative"
                style={{ height: 48, opacity: inMonth ? 1 : 0.3 }}
                disabled={!inMonth}
              >
                {/* Date number */}
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: today ? 28 : 'auto',
                    height: today ? 28 : 'auto',
                    borderRadius: today ? '50%' : 0,
                    background: today ? 'hsl(var(--primary))' : 'transparent',
                    color: today ? 'hsl(220,16%,6%)' : inMonth ? 'hsl(var(--text))' : 'hsl(var(--dim))',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 13,
                    fontWeight: today ? 700 : 400,
                  }}
                >
                  {format(day, 'd')}
                </div>

                {/* Status dot */}
                {status && (
                  <div
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      marginTop: 2,
                      background:
                        status === 'completed' ? 'hsl(var(--ok))' :
                        status === 'free' ? 'hsl(var(--warn))' :
                        status === 'missed' ? 'hsl(var(--bad))' : 'transparent',
                    }}
                  />
                )}
                {!status && <div style={{ width: 4, height: 4, marginTop: 2 }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ SECTION 3 — PR BOARD (kept) ═══ */}
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

      {/* ═══ DAY DETAIL SHEET ═══ */}
      {sheetDay && (
        <DayDetailSheet
          day={sheetDay}
          onClose={() => setSheetDay(null)}
          sessionData={getSheetData(sheetDay)}
          onViewWorkout={handleViewWorkout}
          onStartWorkout={handleStartProgrammeWorkout}
        />
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════
   DAY DETAIL BOTTOM SHEET
   ═══════════════════════════════════════════ */
interface DayDetailSheetProps {
  day: Date;
  onClose: () => void;
  sessionData: {
    completedSession: SessionData | undefined;
    planned: ProgrammeWorkout | null;
  };
  onViewWorkout: (sessionId: string) => void;
  onStartWorkout: () => void;
}

const DayDetailSheet = ({ day, onClose, sessionData, onViewWorkout, onStartWorkout }: DayDetailSheetProps) => {
  const { completedSession, planned } = sessionData;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'hsla(220,16%,6%,0.6)',
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 61,
          background: 'hsl(var(--bg2))',
          borderTop: '1px solid hsl(var(--border2))',
          borderRadius: '20px 20px 0 0',
          padding: '20px 16px',
          maxHeight: '70vh',
          overflowY: 'auto',
          animation: 'slideUp 0.25s ease-out',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center mb-4">
          <div style={{ width: 32, height: 4, borderRadius: 2, background: 'hsl(var(--border2))' }} />
        </div>

        {/* Date header */}
        <div className="flex items-center justify-between mb-4">
          <h4 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 20, color: 'hsl(var(--primary))', letterSpacing: 2 }}>
            {format(day, 'EEEE, dd MMM').toUpperCase()}
          </h4>
          <button onClick={onClose} className="p-1">
            <X size={16} style={{ color: 'hsl(var(--dim))' }} />
          </button>
        </div>

        {/* Content */}
        {completedSession ? (
          <CompletedSessionView session={completedSession} onViewWorkout={onViewWorkout} />
        ) : planned ? (
          <PlannedWorkoutView workout={planned} onStart={onStartWorkout} />
        ) : (
          <RestDayView />
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

/* ─── Completed session view ─── */
const CompletedSessionView = ({ session, onViewWorkout, onEditWorkout }: { session: SessionData; onViewWorkout: (id: string) => void; onEditWorkout: (id: string) => void }) => {
  const exercises = session.session_exercises || [];
  const totalSets = exercises.reduce((sum, ex) => sum + (ex.exercise_sets?.length || 0), 0);

  return (
    <div className="space-y-3">
      <div>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: 'hsl(var(--text))' }}>
          Workout Completed
        </p>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'hsl(var(--dim))' }}>
          {exercises.length} exercises · {totalSets} sets{session.total_ntu ? ` · ${Math.round(session.total_ntu)} NTU` : ''}
        </p>
      </div>

      {/* Exercise list */}
      <div className="space-y-0">
        {exercises.slice(0, 5).map((ex, i) => {
          const bestSet = ex.exercise_sets?.reduce((best, s) => {
            const vol = (s.weight_kg || 0) * (s.reps || 0);
            const bestVol = (best?.weight_kg || 0) * (best?.reps || 0);
            return vol > bestVol ? s : best;
          }, ex.exercise_sets[0]);

          return (
            <div
              key={i}
              className="flex items-center gap-2 py-2"
              style={{ borderBottom: i < Math.min(exercises.length, 5) - 1 ? '1px solid hsl(var(--border))' : 'none' }}
            >
              <div style={{ width: 3, height: 20, borderRadius: 2, background: patternColor(ex.exercises?.movement_pattern || null) }} />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'hsl(var(--text))', flex: 1 }}>
                {ex.exercises?.name || 'Unknown'}
              </span>
              {bestSet && (
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'hsl(var(--dim))' }}>
                  {bestSet.reps}×{bestSet.weight_kg}kg
                </span>
              )}
            </div>
          );
        })}
      </div>

      {exercises.length > 5 && (
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'hsl(var(--dim))' }}>
          +{exercises.length - 5} more exercises
        </p>
      )}

      <div className="flex gap-2" style={{ marginTop: 8 }}>
        <button
          onClick={() => onViewWorkout(session.id)}
          style={{
            flex: 1, background: 'transparent', color: 'hsl(var(--dim))',
            fontWeight: 600, fontSize: 11, padding: 10, borderRadius: 8,
            border: '1px solid hsl(var(--border))',
          }}
        >
          View
        </button>
        <button
          onClick={() => onEditWorkout(session.id)}
          style={{
            flex: 1, background: 'hsl(var(--primary))', color: 'hsl(220,16%,6%)',
            fontWeight: 700, fontSize: 11, padding: 10, borderRadius: 8, border: 'none',
          }}
        >
          Edit
        </button>
      </div>
    </div>
  );
};

/* ─── Planned workout view ─── */
const PlannedWorkoutView = ({ workout, onStart }: { workout: ProgrammeWorkout; onStart: () => void }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <span style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 8, fontWeight: 700,
        background: 'hsla(192,91%,54%,0.1)', color: 'hsl(var(--primary))',
        padding: '2px 8px', borderRadius: 4,
      }}>
        PLANNED
      </span>
    </div>

    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: 'hsl(var(--text))' }}>
      {workout.name}
    </p>

    <div className="space-y-0">
      {workout.prescribed_exercises.slice(0, 5).map((ex, i) => (
        <div
          key={i}
          className="flex items-center gap-2 py-2"
          style={{ borderBottom: i < Math.min(workout.prescribed_exercises.length, 5) - 1 ? '1px solid hsl(var(--border))' : 'none' }}
        >
          <div style={{ width: 3, height: 20, borderRadius: 2, background: 'hsl(var(--primary))' }} />
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'hsl(var(--text))', flex: 1 }}>{ex.name}</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'hsl(var(--dim))' }}>{ex.sets}×{ex.reps}</span>
        </div>
      ))}
    </div>

    {workout.prescribed_exercises.length > 5 && (
      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'hsl(var(--dim))' }}>
        +{workout.prescribed_exercises.length - 5} more exercises
      </p>
    )}

    <button
      onClick={onStart}
      style={{
        width: '100%', background: 'hsl(var(--primary))', color: 'hsl(220,16%,6%)',
        fontWeight: 700, fontSize: 11, padding: 10, borderRadius: 8, border: 'none',
        marginTop: 8,
      }}
    >
      Start This Workout →
    </button>
  </div>
);

/* ─── Rest day view ─── */
const RestDayView = () => (
  <div className="text-center py-6">
    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'hsl(var(--dim))' }}>Rest Day</p>
    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'hsl(var(--dim))', marginTop: 4, opacity: 0.7 }}>
      Recovery is training.
    </p>
  </div>
);
