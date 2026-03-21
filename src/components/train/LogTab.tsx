import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { calculateSetNtu } from '@/lib/movementPatterns';
import { RestTimer } from './RestTimer';
import { WeekStrip } from './WeekStrip';
import { ExerciseCard } from './ExerciseCard';
import { ExerciseActionSheet } from './ExerciseActionSheet';
import { PRCelebration } from './PRCelebration';
import { useWorkoutStore, type SessionExercise, type SetData, type WorkoutSection, type ExerciseRow } from '@/stores/workoutStore';
import { useUserProgrammes, useProgrammeWorkouts } from '@/hooks/useProgrammes';
import { usePreviousSets } from '@/hooks/useWorkoutHistory';
import {
  Search, Plus, ChevronDown, ChevronUp, Dumbbell, ListChecks,
  Link2, StickyNote, MessageSquare, Trash2, X, Check,
} from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { format } from 'date-fns';

/* ─── Types ─── */
interface Programme {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface ProgrammeWorkout {
  id: string;
  day_number: number;
  name: string;
  prescribed_exercises: Array<{ name: string; sets: number; reps: string; notes: string }>;
}

const LB_PER_KG = 2.20462;

const emptySet = (num: number): SetData => ({
  set_num: num, reps: null, weight_kg: null, rir: null, rpe: null,
  completed: false, set_type: 'working', duration_secs: null, distance_m: null, calories: null,
});

/* ─── Component ─── */
export const LogTab = () => {
  const { user, profile } = useAuth();
  const weightUnit = profile?.weight_unit ?? 'kg';
  const restTimerDefault = (profile as any)?.rest_timer_secs ?? 90;

  // ─── Zustand store ───
  const store = useWorkoutStore();
  const {
    activeSessionId, sessionStartTime: sessionStartTimeISO, exercises, isSessionActive,
    startSession: storeStartSession, endSession: storeEndSession,
    addExercise: storeAddExercise, removeExercise: storeRemoveExercise,
    updateExercise: storeUpdateExercise, updateSet: storeUpdateSet,
    addSet: storeAddSet, markSetComplete: storeMarkSetComplete,
    markSetIncomplete: storeMarkSetIncomplete, moveExerciseToSection,
    linkSuperset: storeLinkSuperset, resetSession: storeResetSession,
  } = store;

  const sessionStartTime = sessionStartTimeISO ? new Date(sessionStartTimeISO) : null;

  // ─── Local UI state (not persisted) ───
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ExerciseRow[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [finished, setFinished] = useState(false);
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [summaryData, setSummaryData] = useState<any>(null);
  const [timer, setTimer] = useState('00:00');
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [sectionsOpen, setSectionsOpen] = useState({ warmup: true, exercises: true, cooldown: true });

  // ─── Action sheet & PR celebration state ───
  const [actionSheetIndex, setActionSheetIndex] = useState<number | null>(null);
  const [prCelebration, setPrCelebration] = useState<{ exerciseName: string; weight: number } | null>(null);

  // Programme state — via React Query
  const { data: programmesData } = useUserProgrammes();
  const programmes = (programmesData as Programme[]) || [];
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string | null>(null);
  const [showProgrammeSelector, setShowProgrammeSelector] = useState(false);

  const activeProgramme = useMemo(() => programmes.find(p => p.is_active) || null, [programmes]);

  // Set selected programme when data loads
  useEffect(() => {
    if (programmes.length > 0 && selectedProgrammeId === null) {
      setSelectedProgrammeId(activeProgramme?.id || null);
    }
  }, [programmes, activeProgramme, selectedProgrammeId]);

  // Workout day state — via React Query
  const { data: workoutsData } = useProgrammeWorkouts(
    selectedProgrammeId === activeProgramme?.id ? activeProgramme?.id || null : null
  );
  const workouts = (workoutsData as ProgrammeWorkout[]) || [];
  const [selectedWorkout, setSelectedWorkout] = useState<ProgrammeWorkout | null>(null);
  const [showWorkoutPicker, setShowWorkoutPicker] = useState(false);

  // Week strip
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Superset linking
  const [linkingSuperset, setLinkingSuperset] = useState<number | null>(null);

  /* ─── Helpers ─── */
  const toDisplay = (kg: number | null) => {
    if (kg === null) return null;
    return weightUnit === 'lbs' ? Math.round(kg * LB_PER_KG * 10) / 10 : kg;
  };
  const toKg = (display: number | null) => {
    if (display === null) return null;
    return weightUnit === 'lbs' ? Math.round((display / LB_PER_KG) * 100) / 100 : display;
  };

  /** Check if a set has enough data to be completable */
  const setHasData = (set: SetData, exType?: string) => {
    if (exType === 'timed') return !!set.duration_secs;
    if (exType === 'conditioning') return !!(set.duration_secs || set.distance_m || set.calories);
    return !!(set.reps && set.weight_kg);
  };

  /* ─── Timer ─── */
  useEffect(() => {
    if (!sessionStartTime || finished) return;
    const interval = setInterval(() => {
      const s = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000);
      setTimer(`${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime, finished]);

  /* ─── Total NTU ─── */
  const totalNtu = useMemo(() => {
    return exercises.reduce((total, ex) => {
      return total + ex.sets.reduce((st, set) => {
        if (!set.completed || !set.reps || !set.weight_kg) return st;
        return st + calculateSetNtu(set.reps, set.weight_kg, ex.exercise.movement_pattern || '');
      }, 0);
    }, 0);
  }, [exercises]);

  /* ─── Search ─── */
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length < 1) { setSearchResults([]); return; }
    const { data } = await supabase
      .from('exercises')
      .select('id, name, movement_pattern, difficulty_coefficient, exercise_type, video_url')
      .ilike('name', `%${query}%`)
      .limit(8);
    setSearchResults((data as ExerciseRow[]) || []);
  }, []);

  /* ─── Session actions ─── */
  const startSession = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('training_sessions')
      .insert({ user_id: user.id, completed: false, date: selectedDate.toISOString().split('T')[0], programme_id: selectedProgrammeId || null })
      .select('id')
      .single();
    if (data && !error) {
      let preloaded: SessionExercise[] = [];
      if (selectedWorkout) {
        const prescribed = selectedWorkout.prescribed_exercises || [];
        const names = prescribed.map((p: any) => p.name);
        if (names.length > 0) {
          const { data: exData } = await supabase
            .from('exercises')
            .select('id, name, movement_pattern, difficulty_coefficient, exercise_type, video_url')
            .in('name', names);
          if (exData) {
            const exMap = new Map(exData.map((e: any) => [e.name, e]));
            preloaded = prescribed
              .filter((p: any) => exMap.has(p.name))
              .map((p: any) => ({
                exercise: exMap.get(p.name)!,
                sets: Array.from({ length: p.sets || 1 }, (_, i) => emptySet(i + 1)),
                expanded: false, isPr: false,
                notes: p.notes || '',
                section: 'exercises' as WorkoutSection,
                supersetGroup: null,
                showNotes: !!(p.notes),
              }));
          }
        }
      }
      storeStartSession(data.id, preloaded);
    }
  };

  const cancelSession = async () => {
    if (!activeSessionId) return;
    await supabase.from('training_sessions').delete().eq('id', activeSessionId);
    storeEndSession();
    setTimer('00:00');
    setWorkoutNotes('');
    toast({ title: 'Workout cancelled', description: 'Session discarded.' });
  };

  const addExercise = (ex: ExerciseRow, section: WorkoutSection = 'exercises') => {
    storeAddExercise({
      exercise: ex, sets: [emptySet(1)], expanded: true, isPr: false,
      notes: '', section, supersetGroup: null, showNotes: false,
    });
    setSearchQuery(''); setSearchResults([]); setShowSearch(false);
  };

  const removeExercise = (exIdx: number) => {
    storeRemoveExercise(exIdx);
  };

  const addSet = (exIdx: number) => {
    storeAddSet(exIdx);
  };

  const updateSet = (exIdx: number, setIdx: number, field: keyof SetData, value: any) => {
    storeUpdateSet(exIdx, setIdx, { [field]: value });
  };

  const completeSet = (exIdx: number, setIdx: number) => {
    storeMarkSetComplete(exIdx, setIdx);
    setShowRestTimer(true);
  };

  const uncompleteSet = (exIdx: number, setIdx: number) => {
    storeMarkSetIncomplete(exIdx, setIdx);
  };

  const toggleExpand = (exIdx: number) => {
    storeUpdateExercise(exIdx, { expanded: !exercises[exIdx].expanded });
  };

  const moveExercise = (exIdx: number, to: WorkoutSection) => {
    moveExerciseToSection(exIdx, to);
  };

  const updateNotes = (exIdx: number, notes: string) => {
    storeUpdateExercise(exIdx, { notes });
  };

  const toggleNotesVisibility = (exIdx: number) => {
    storeUpdateExercise(exIdx, { showNotes: !exercises[exIdx].showNotes });
  };

  /* ─── Superset linking ─── */
  const handleSupersetLink = (exIdx: number) => {
    if (linkingSuperset === null) {
      setLinkingSuperset(exIdx);
    } else {
      storeLinkSuperset(linkingSuperset, exIdx);
      setLinkingSuperset(null);
    }
  };

  /* ─── Finish ─── */
  const finishSession = async () => {
    if (!activeSessionId || !user) return;
    let prsHit = 0;
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      const { data: seData } = await supabase
        .from('session_exercises')
        .insert({
          session_id: activeSessionId, exercise_id: ex.exercise.id,
          display_order: i, notes: ex.notes || null, superset_group: ex.supersetGroup,
        } as any)
        .select('id').single();
      if (!seData) continue;
      for (const set of ex.sets) {
        if (!set.completed) continue;
        const hasWeight = set.weight_kg !== null && set.reps !== null;
        let isPr = false;
        if (hasWeight && set.weight_kg! > 0) {
          const { data: existingPr } = await supabase
            .from('personal_records').select('weight_kg')
            .eq('user_id', user.id).eq('exercise_id', ex.exercise.id)
            .order('weight_kg', { ascending: false }).limit(1);
          isPr = !existingPr?.length || set.weight_kg! > Number(existingPr[0].weight_kg);
        }
        await supabase.from('exercise_sets').insert({
          session_exercise_id: seData.id, set_num: set.set_num,
          reps: set.reps, weight_kg: set.weight_kg, rir: set.rir, rpe: set.rpe,
          completed: true, is_pr: isPr, set_type: set.set_type,
          duration_secs: set.duration_secs, distance_m: set.distance_m, calories: set.calories,
        } as any);
        if (isPr) {
          prsHit++;
          await supabase.from('personal_records').insert({
            user_id: user.id, exercise_id: ex.exercise.id,
            weight_kg: set.weight_kg!, reps: set.reps, session_id: activeSessionId,
          });
          toast({ title: '🏆 New PR!', description: `${ex.exercise.name}: ${set.weight_kg}kg × ${set.reps}` });
        }
      }
    }
    if (workoutNotes) {
      await supabase.from('training_sessions').update({ workout_notes: workoutNotes } as any).eq('id', activeSessionId);
    }
    await supabase.from('training_sessions')
      .update({ completed: true, total_ntu: Math.round(totalNtu) }).eq('id', activeSessionId);

    const durSecs = sessionStartTime ? Math.floor((Date.now() - sessionStartTime.getTime()) / 1000) : 0;
    setSummaryData({
      date: format(new Date(), 'dd MMM yyyy'),
      duration: `${Math.floor(durSecs / 60).toString().padStart(2, '0')}:${(durSecs % 60).toString().padStart(2, '0')}`,
      totalNtu: Math.round(totalNtu), prsHit, exercisesDone: exercises.length,
      programmeName: activeProgramme?.name,
    });
    storeEndSession();
    setFinished(true);
  };

  /* ─── Grouped exercises by section ─── */
  const sectionExercises = useMemo(() => {
    const map: Record<WorkoutSection, { ex: SessionExercise; globalIdx: number }[]> = {
      warmup: [], exercises: [], cooldown: [],
    };
    exercises.forEach((ex, i) => map[ex.section].push({ ex, globalIdx: i }));
    return map;
  }, [exercises]);

  const isTimedOrConditioning = (exType?: string) => exType === 'timed' || exType === 'conditioning';

  /* ─── Render helpers ─── */
  const renderSetRow = (ex: SessionExercise, exIdx: number, set: SetData, setIdx: number) => {
    const isTimed = isTimedOrConditioning(ex.exercise.exercise_type);
    const isConditioning = ex.exercise.exercise_type === 'conditioning';
    const canComplete = setHasData(set, ex.exercise.exercise_type);

    const cellBase: React.CSSProperties = {
      background: 'hsl(var(--bg3))',
      border: '1px solid hsl(var(--border))',
      borderRadius: 5,
      padding: '3px 6px',
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 9,
      textAlign: 'center' as const,
      width: '100%',
      outline: 'none',
    };
    const cellDone: React.CSSProperties = { ...cellBase, color: 'hsl(var(--ok))' };
    const cellActive: React.CSSProperties = { ...cellBase, color: 'hsl(var(--primary))', borderColor: 'hsla(192,91%,54%,0.3)' };
    const cellDefault: React.CSSProperties = { ...cellBase, color: 'hsl(var(--text))' };
    const rirStyle: React.CSSProperties = { ...cellBase, fontSize: 8, padding: '3px 5px' };

    const getStyle = (done: boolean) => done ? cellDone : cellDefault;

    return (
      <div key={setIdx} style={{ display: 'grid', gridTemplateColumns: isTimed ? '28px 1fr 40px' : '28px 1fr 1fr 40px', gap: 4, marginBottom: 2 }}>
        {/* Set label — tap to toggle completion */}
        <button
          onClick={() => set.completed ? uncompleteSet(exIdx, setIdx) : (canComplete ? completeSet(exIdx, setIdx) : null)}
          style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: set.completed ? 'hsl(var(--ok))' : set.set_type === 'warmup' ? 'hsl(var(--warn))' : 'hsl(var(--dim))', textAlign: 'center', fontWeight: set.completed ? 700 : 400, background: 'transparent', border: 'none' }}
        >
          {set.completed ? '✓' : set.set_type === 'warmup' ? 'W' : `S${set.set_num}`}
        </button>

        {/* Weight / Duration */}
        {isTimed ? (
          <input
            type="number" inputMode="numeric" placeholder="sec"
            value={set.duration_secs ?? ''} disabled={set.completed}
            onChange={e => updateSet(exIdx, setIdx, 'duration_secs', e.target.value ? parseInt(e.target.value) : null)}
            style={getStyle(set.completed)}
          />
        ) : (
          <input
            type="number" inputMode="decimal"
            placeholder={weightUnit === 'lbs' ? 'lbs' : 'kg'}
            value={set.completed && set.weight_kg ? `${toDisplay(set.weight_kg)}` : (toDisplay(set.weight_kg) ?? '')}
            onChange={e => updateSet(exIdx, setIdx, 'weight_kg', toKg(e.target.value ? parseFloat(e.target.value) : null))}
            disabled={set.completed}
            style={getStyle(set.completed)}
          />
        )}

        {/* Reps */}
        {!isTimed && (
          <input
            type="number" inputMode="numeric" placeholder="reps"
            value={set.reps ?? ''} disabled={set.completed}
            onChange={e => updateSet(exIdx, setIdx, 'reps', e.target.value ? parseInt(e.target.value) : null)}
            style={getStyle(set.completed)}
          />
        )}

        {/* RIR */}
        <input
          type="number" inputMode="numeric" min={0} max={5} placeholder="RIR"
          value={set.rir ?? ''} disabled={set.completed}
          onChange={e => updateSet(exIdx, setIdx, 'rir', e.target.value ? parseInt(e.target.value) : null)}
          style={set.completed ? { ...rirStyle, color: 'hsl(var(--ok))' } : rirStyle}
        />
      </div>
    );
  };

  const pipColor = (pattern: string) => {
    const map: Record<string, string> = {
      'Hinge':      'hsl(0,72%,51%)',
      'Squat':      'hsl(262,60%,55%)',
      'Push':       'hsl(var(--primary))',
      'Pull':       'hsl(var(--ok))',
      'Single Leg': 'hsl(38,92%,50%)',
      'Carry':      'hsl(38,92%,50%)',
      'Core':       'hsl(215,14%,50%)',
      'Olympic':    'hsl(var(--gold))',
      'Isolation':  'hsl(215,14%,50%)',
      'Plyometric': 'hsl(var(--gold))',
      'Rotational': 'hsl(var(--primary))',
      'Conditioning':'hsl(var(--warn))',
    };
    return map[pattern] || 'hsl(var(--primary))';
  };

  const renderExerciseCard = (ex: SessionExercise, exIdx: number) => {
    const completedSets = ex.sets.filter(s => s.completed);
    const isTimed = isTimedOrConditioning(ex.exercise.exercise_type);

    // Summary line: "4 × 8 · Hinge"
    const firstReps = ex.sets[0]?.reps;
    const summaryLine = isTimed
      ? `${ex.sets.length} set${ex.sets.length > 1 ? 's' : ''} · ${ex.exercise.movement_pattern || ''}`
      : `${ex.sets.length} × ${firstReps ?? '–'} · ${ex.exercise.movement_pattern || ''}`;

    const ssColor = ex.supersetGroup ? 'border-l-2 border-l-amber-500' : '';
    const lastSetRir = ex.sets.length > 0 ? ex.sets[ex.sets.length - 1].rir : null;

    return (
      <div key={exIdx} className={ssColor} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
        {/* Header — flat row */}
        <button onClick={() => toggleExpand(exIdx)} className="w-full flex items-center gap-[6px] text-left" style={{ padding: '7px 0' }}>
          <div style={{ width: 3, minWidth: 3, height: 26, borderRadius: 2, flexShrink: 0, background: pipColor(ex.exercise.movement_pattern || '') }} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate" style={{ fontSize: 10, fontWeight: 500, color: 'hsl(var(--text))' }}>{ex.exercise.name}</p>
              {ex.supersetGroup && (
                <span className="font-mono" style={{ fontSize: 8, padding: '0.5px 4px', borderRadius: 9, background: 'hsla(38,92%,50%,0.1)', color: 'hsl(var(--warn))', border: '1px solid hsla(38,92%,50%,0.2)' }}>SS</span>
              )}
            </div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: 'hsl(var(--dim))', marginTop: 1 }}>{summaryLine}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {completedSets.length > 0 && (
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, padding: '1px 5px', borderRadius: 9, background: 'hsla(142,71%,45%,0.1)', color: 'hsl(var(--ok))', border: '1px solid hsla(142,71%,45%,0.2)' }}>
                {completedSets.length}/{ex.sets.length}
              </span>
            )}
            {!ex.expanded && lastSetRir !== null && lastSetRir !== undefined && (
              <span style={{ background: 'hsla(38,92%,50%,0.1)', color: 'hsl(var(--warn))', fontFamily: 'JetBrains Mono, monospace', fontSize: 8, padding: '1px 3px', borderRadius: 3 }}>
                RIR {lastSetRir}
              </span>
            )}
            {ex.isPr && (
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, padding: '1px 3px', borderRadius: 3, background: 'hsl(var(--pg))', color: 'hsl(var(--primary))', border: '1px solid hsla(192,91%,54%,0.25)' }}>PR ↑</span>
            )}
          </div>
        </button>

        {ex.expanded && (
          <div style={{ padding: '0 0 8px 9px' }} className="space-y-1">
            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: isTimed ? '28px 1fr 40px' : '28px 1fr 1fr 40px', gap: 4, padding: '4px 0 0 0' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, color: 'hsl(var(--dim))', textTransform: 'uppercase', textAlign: 'center' }}>Set</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, color: 'hsl(var(--dim))', textTransform: 'uppercase', textAlign: 'center' }}>
                {isTimed ? 'Secs' : 'Weight'}
              </span>
              {!isTimed && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, color: 'hsl(var(--dim))', textTransform: 'uppercase', textAlign: 'center' }}>Reps</span>}
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, color: 'hsl(var(--dim))', textTransform: 'uppercase', textAlign: 'center' }}>RIR</span>
            </div>

            {/* Sets */}
            {ex.sets.map((set, setIdx) => renderSetRow(ex, exIdx, set, setIdx))}

            {/* Add Set */}
            <button onClick={() => addSet(exIdx)} className="w-full text-primary" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, padding: '5px 0', border: '1px dashed hsla(192,91%,54%,0.2)', borderRadius: 5, background: 'transparent' }}>
              + Set
            </button>

            {/* Notes toggle */}
            <div>
              <button
                onClick={() => toggleNotesVisibility(exIdx)}
                className="flex items-center gap-1.5 transition-colors"
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em', color: ex.showNotes ? 'hsl(var(--primary))' : 'hsl(var(--dim))' }}
              >
                <StickyNote size={10} /> {ex.showNotes ? 'Hide Notes' : 'Notes'}
              </button>
              {ex.showNotes && (
                <textarea
                  value={ex.notes}
                  onChange={e => updateNotes(exIdx, e.target.value)}
                  placeholder="Exercise notes..."
                  rows={2}
                  className="w-full mt-1 focus:outline-none resize-none"
                  style={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))', borderRadius: 6, padding: '6px 8px', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'hsl(var(--text))' }}
                />
              )}
            </div>

            {/* Overflow actions — compact row */}
            <div className="flex items-center gap-2 pt-1" style={{ borderTop: '1px solid hsl(var(--border))' }}>
              <button
                onClick={() => removeExercise(exIdx)}
                className="flex items-center gap-1 transition-colors"
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: 'hsl(var(--bad))' }}
              >
                <Trash2 size={10} /> Remove
              </button>
              <span style={{ color: 'hsl(var(--border))' }}>|</span>
              {ex.section !== 'warmup' && (
                <button onClick={() => moveExercise(exIdx, 'warmup')} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: 'hsl(var(--dim))' }}>→ Warm Up</button>
              )}
              {ex.section !== 'exercises' && (
                <button onClick={() => moveExercise(exIdx, 'exercises')} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: 'hsl(var(--dim))' }}>→ Main</button>
              )}
              {ex.section !== 'cooldown' && (
                <button onClick={() => moveExercise(exIdx, 'cooldown')} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: 'hsl(var(--dim))' }}>→ Cool Down</button>
              )}
              <button
                onClick={() => handleSupersetLink(exIdx)}
                className="flex items-center gap-1 transition-colors"
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: linkingSuperset === exIdx ? 'hsl(var(--warn))' : 'hsl(var(--dim))' }}
              >
                <Link2 size={8} /> {linkingSuperset === exIdx ? 'Pick pair…' : 'SS'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const sectionConfig: Record<WorkoutSection, { label: string; emoji: string; color: string; bannerStyle: React.CSSProperties }> = {
    warmup:    { label: 'WARM UP',        emoji: '🔥', color: 'hsl(var(--warn))',    bannerStyle: { padding: '4px 7px', background: 'hsla(38,92%,50%,0.06)', border: '1px solid hsla(38,92%,50%,0.15)', borderRadius: 6 } },
    exercises: { label: 'MAIN EXERCISES', emoji: '🏋️', color: 'hsl(var(--primary))', bannerStyle: { padding: '4px 7px', background: 'hsla(192,91%,54%,0.07)', border: '1px solid hsla(192,91%,54%,0.2)', borderRadius: 6 } },
    cooldown:  { label: 'COOL DOWN',      emoji: '🧊', color: 'hsl(200,60%,60%)',   bannerStyle: { padding: '4px 7px', background: 'hsla(200,60%,50%,0.06)', border: '1px solid hsla(200,60%,50%,0.15)', borderRadius: 6 } },
  };

  const renderSection = (sectionKey: WorkoutSection, items: { ex: SessionExercise; globalIdx: number }[]) => {
    const cfg = sectionConfig[sectionKey];
    return (
      <div>
        <div className="flex items-center gap-2 mb-2" style={cfg.bannerStyle}>
          <span style={{ fontSize: 10 }}>{cfg.emoji}</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, letterSpacing: 1, color: cfg.color, textTransform: 'uppercase', fontWeight: 600 }}>{cfg.label}</span>
          {items.length > 0 && (
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: cfg.color, opacity: 0.6 }}>{items.length}</span>
          )}
        </div>
        <div className="mb-4">
          {items.map(({ ex, globalIdx }) => renderExerciseCard(ex, globalIdx))}
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════
     STATE 1 — No active session
     ═══════════════════════════════════════════ */
  if (!isSessionActive && !finished) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        {/* Week strip */}
        <div className="w-full mb-4">
          <WeekStrip
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            workoutDays={workouts.map(w => w.day_number)}
          />
        </div>

        <div className="w-full" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsla(192,91%,54%,0.2)', boxShadow: '0 0 30px hsla(192,91%,54%,0.06)', borderRadius: 16, padding: 24 }}>
          {/* Programme header */}
          <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: 'hsl(var(--text))', letterSpacing: 1, lineHeight: 1, marginBottom: 4 }}>
            {activeProgramme ? activeProgramme.name.toUpperCase() : 'FREE SESSION'}
          </h2>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'hsl(var(--dim))', marginBottom: 16 }}>
            {activeProgramme && selectedWorkout
              ? `Week 1 · Day ${selectedWorkout.day_number} · Main Block`
              : activeProgramme
                ? 'Select a workout day below'
                : 'No programme · Free session'}
          </p>

          {/* Programme selector */}
          {programmes.length > 0 && (
            <div className="mb-5">
              <button
                onClick={() => setShowProgrammeSelector(!showProgrammeSelector)}
                className="w-full flex items-center justify-between rounded-xl px-4 py-3 text-left"
                style={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))' }}
              >
                <div className="flex items-center gap-2">
                  <ListChecks size={14} className="text-primary" />
                  <span className="font-mono text-xs" style={{ color: 'hsl(var(--text))' }}>
                    {selectedProgrammeId ? programmes.find(p => p.id === selectedProgrammeId)?.name : 'No Programme'}
                  </span>
                </div>
                <ChevronDown size={14} style={{ color: 'hsl(var(--dim))' }} />
              </button>
              {showProgrammeSelector && (
                <div className="mt-1 overflow-hidden" style={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))', borderRadius: 10 }}>
                  <button
                    onClick={() => { setSelectedProgrammeId(null); setShowProgrammeSelector(false); }}
                    className="w-full text-left px-4 py-3 font-mono text-xs transition-colors"
                    style={{ color: !selectedProgrammeId ? 'hsl(var(--primary))' : 'hsl(var(--text))', borderBottom: '1px solid hsl(var(--border))' }}
                  >
                    No Programme (Free Session)
                  </button>
                  {programmes.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedProgrammeId(p.id); setShowProgrammeSelector(false); }}
                      className="w-full text-left px-4 py-3 font-mono text-xs transition-colors"
                      style={{ color: selectedProgrammeId === p.id ? 'hsl(var(--primary))' : 'hsl(var(--text))', borderBottom: '1px solid hsl(var(--border))' }}
                    >
                      {p.name}
                      {p.is_active && <span className="ml-2" style={{ fontSize: 8, color: 'hsl(var(--primary))', background: 'hsla(192,91%,54%,0.1)', padding: '1px 5px', borderRadius: 9, border: '1px solid hsla(192,91%,54%,0.2)' }}>ACTIVE</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Workout day picker */}
          {workouts.length > 0 && selectedProgrammeId === activeProgramme?.id && (
            <div className="mb-5">
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'hsl(var(--dim))', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Select today's workout</p>
              <div className="grid grid-cols-1 gap-1.5">
                {workouts.map(w => (
                  <button
                    key={w.id}
                    onClick={() => setSelectedWorkout(selectedWorkout?.id === w.id ? null : w)}
                    className="w-full text-left px-4 py-3 rounded-lg font-mono text-xs transition-colors"
                    style={{
                      background: selectedWorkout?.id === w.id ? 'hsla(192,91%,54%,0.05)' : 'hsl(var(--bg3))',
                      border: selectedWorkout?.id === w.id ? '1px solid hsla(192,91%,54%,0.4)' : '1px solid hsl(var(--border))',
                      color: selectedWorkout?.id === w.id ? 'hsl(var(--primary))' : 'hsl(var(--text))',
                    }}
                  >
                    <span className="font-bold">Day {w.day_number}</span>
                    <span style={{ color: 'hsl(var(--dim))', marginLeft: 8 }}>— {w.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={startSession}
            style={{ width: '100%', background: 'hsl(var(--primary))', color: 'hsl(220,16%,6%)', fontWeight: 700, fontSize: 11, padding: '12px 0', borderRadius: 8, border: 'none', textTransform: 'uppercase', letterSpacing: 1 }}
          >
            Begin Session →
          </button>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     SUMMARY
     ═══════════════════════════════════════════ */
  if (finished && summaryData) {
    return (
      <div className="max-w-lg mx-auto px-4 space-y-4">
        <div className="bg-card border border-primary/20 rounded-2xl p-5 space-y-4">
          <h3 className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">SESSION COMPLETE</h3>
          {summaryData.programmeName && (
            <p className="font-mono text-[9px] text-primary bg-primary/10 px-2 py-1 rounded-lg border border-primary/20 inline-block">
              {summaryData.programmeName}
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Date', value: summaryData.date },
              { label: 'Duration', value: summaryData.duration },
              { label: 'Total NTU', value: String(summaryData.totalNtu), primary: true },
              { label: 'PRs Hit', value: String(summaryData.prsHit), gold: true },
            ].map(item => (
              <div key={item.label}>
                <p className="font-mono text-[8px] text-muted-foreground uppercase">{item.label}</p>
                <p className={`font-mono text-sm ${item.primary ? 'text-primary' : item.gold ? 'text-amber-500' : 'text-foreground'}`}>{item.value}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => { storeResetSession(); setFinished(false); setSummaryData(null); setTimer('00:00'); setWorkoutNotes(''); }}
            className="w-full bg-secondary border border-border text-foreground font-bold py-3.5 rounded-xl uppercase tracking-widest text-xs"
          >New Session</button>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     STATE 2 — Active session
     ═══════════════════════════════════════════ */
  return (
    <div className="max-w-lg mx-auto space-y-4" style={{ padding: '8px 11px 64px', background: 'hsl(var(--bg))' }}>
      {/* Week strip */}
      <WeekStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} workoutDays={workouts.map(w => w.day_number)} />

      {/* Session header — compact */}
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          {activeProgramme && (
            <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 18, color: 'hsl(var(--text))', letterSpacing: 1, lineHeight: 1 }}>{activeProgramme.name.toUpperCase()}</h2>
          )}
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'hsl(var(--dim))', marginTop: 2 }}>
            {selectedWorkout ? `Week 1 · Day ${selectedWorkout.day_number} · ${selectedWorkout.name}` : 'Free Session'} · {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5" style={{ background: 'transparent', border: '1px solid hsl(var(--warn))', borderRadius: 6, padding: '3px 8px' }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'hsl(var(--warn))' }} />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 11, color: 'hsl(var(--warn))' }}>{timer}</span>
          </div>
          <button
            onClick={cancelSession}
            className="w-9 h-9 flex items-center justify-center transition-colors"
            style={{ borderRadius: 8, border: '1px solid hsl(var(--border))', color: 'hsl(var(--bad))' }}
          >
            <X size={14} />
          </button>
          <button onClick={finishSession} className="bg-primary text-primary-foreground font-bold uppercase" style={{ fontSize: 10, padding: '7px 14px', borderRadius: 8, letterSpacing: 1 }}>FINISH</button>
        </div>
      </div>

      {/* ─── Sections ─── */}
      {renderSection('warmup', sectionExercises.warmup)}
      {renderSection('exercises', sectionExercises.exercises)}
      {renderSection('cooldown', sectionExercises.cooldown)}

      {/* Add Exercise */}
      {!showSearch ? (
        <button
          onClick={() => setShowSearch(true)}
          className="w-full flex items-center justify-center gap-2"
          style={{ border: '1px solid hsl(var(--border2))', color: 'hsl(var(--dim))', fontFamily: 'Inter, sans-serif', fontSize: 9, padding: 7, borderRadius: 8, background: 'transparent', marginTop: 7 }}
        >
          <Plus size={12} /> + Add Exercise
        </button>
      ) : (
        <div className="space-y-1">
          <div className="relative">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus placeholder="Search exercises..."
              value={searchQuery} onChange={e => handleSearch(e.target.value)}
              className="w-full bg-secondary border border-input rounded-xl px-4 py-3 pl-10 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {searchResults.map(ex => (
                <button
                  key={ex.id} onClick={() => addExercise(ex)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left border-b border-border last:border-b-0 text-foreground hover:bg-secondary cursor-pointer font-mono text-sm transition-colors"
                >
                  <span>{ex.name}</span>
                  <div className="flex items-center gap-1.5">
                    {ex.exercise_type && ex.exercise_type !== 'strength' && (
                      <span className="font-mono text-[8px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">{ex.exercise_type}</span>
                    )}
                    <span className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{ex.movement_pattern}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
          <button onClick={() => setShowSearch(false)} className="w-full font-mono text-[9px] text-muted-foreground py-2">Cancel</button>
        </div>
      )}

      {/* Workout notes */}
      <div className="rounded-2xl p-4" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
        <div className="flex items-center gap-1.5 mb-2">
          <MessageSquare size={12} className="text-muted-foreground" />
          <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">Workout Notes</span>
        </div>
        <textarea
          value={workoutNotes} onChange={e => setWorkoutNotes(e.target.value)}
          placeholder="How did this session feel?"
          rows={3}
          className="w-full bg-secondary border border-border rounded-lg px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-none"
        />
      </div>

      {/* Rest timer overlay */}
      {showRestTimer && (
        <RestTimer
          durationSecs={restTimerDefault}
          onComplete={() => setShowRestTimer(false)}
          onSkip={() => setShowRestTimer(false)}
        />
      )}
    </div>
  );
};
