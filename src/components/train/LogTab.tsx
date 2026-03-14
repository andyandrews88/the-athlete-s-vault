import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { calculateSetNtu } from '@/lib/movementPatterns';
import { RestTimer } from './RestTimer';
import { WeekStrip } from './WeekStrip';
import {
  Search, Plus, ChevronDown, ChevronUp, Dumbbell, ListChecks,
  Link2, StickyNote, MessageSquare, Trash2, X, Check,
} from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { format } from 'date-fns';

/* ─── Types ─── */
interface ExerciseRow {
  id: string;
  name: string;
  movement_pattern: string;
  difficulty_coefficient: number;
  exercise_type?: string;
  video_url?: string;
}

interface SetData {
  set_num: number;
  reps: number | null;
  weight_kg: number | null;
  rir: number | null;
  rpe: number | null;
  completed: boolean;
  set_type: 'warmup' | 'working';
  duration_secs: number | null;
  distance_m: number | null;
  calories: number | null;
}

type WorkoutSection = 'warmup' | 'exercises' | 'cooldown';

interface SessionExercise {
  exercise: ExerciseRow;
  sets: SetData[];
  expanded: boolean;
  isPr: boolean;
  notes: string;
  section: WorkoutSection;
  supersetGroup: string | null;
  showNotes: boolean;
}

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

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [exercises, setExercises] = useState<SessionExercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ExerciseRow[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [finished, setFinished] = useState(false);
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [summaryData, setSummaryData] = useState<any>(null);
  const [timer, setTimer] = useState('00:00');

  // Rest timer
  const [showRestTimer, setShowRestTimer] = useState(false);

  // Sections open state
  const [sectionsOpen, setSectionsOpen] = useState({ warmup: true, exercises: true, cooldown: true });

  // Programme state
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [activeProgramme, setActiveProgramme] = useState<Programme | null>(null);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string | null>(null);
  const [showProgrammeSelector, setShowProgrammeSelector] = useState(false);

  // Workout day state
  const [workouts, setWorkouts] = useState<ProgrammeWorkout[]>([]);
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

  /* ─── Load programmes ─── */
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('training_programmes')
        .select('id, name, description, is_active')
        .eq('user_id', user.id)
        .order('is_active', { ascending: false });
      const progs = (data as Programme[]) || [];
      setProgrammes(progs);
      const active = progs.find(p => p.is_active) || null;
      setActiveProgramme(active);
      setSelectedProgrammeId(active?.id || null);
      if (active) {
        const { data: wkData } = await supabase
          .from('programme_workouts')
          .select('id, day_number, name, prescribed_exercises')
          .eq('programme_id', active.id)
          .order('day_number');
        if (wkData?.length) setWorkouts(wkData as ProgrammeWorkout[]);
      }
    })();
  }, [user]);

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
      setSessionId(data.id);
      setSessionStartTime(new Date());
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
            const preloaded: SessionExercise[] = prescribed
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
            setExercises(preloaded);
          }
        }
      }
    }
  };

  const cancelSession = async () => {
    if (!sessionId) return;
    await supabase.from('training_sessions').delete().eq('id', sessionId);
    setSessionId(null);
    setExercises([]);
    setSessionStartTime(null);
    setTimer('00:00');
    setWorkoutNotes('');
    toast({ title: 'Workout cancelled', description: 'Session discarded.' });
  };

  const addExercise = (ex: ExerciseRow, section: WorkoutSection = 'exercises') => {
    setExercises(prev => [...prev, {
      exercise: ex, sets: [emptySet(1)], expanded: true, isPr: false,
      notes: '', section, supersetGroup: null, showNotes: false,
    }]);
    setSearchQuery(''); setSearchResults([]); setShowSearch(false);
  };

  const removeExercise = (exIdx: number) => {
    setExercises(prev => prev.filter((_, i) => i !== exIdx));
  };

  const addSet = (exIdx: number) => {
    setExercises(prev => prev.map((e, i) => i === exIdx ? {
      ...e, sets: [...e.sets, emptySet(e.sets.length + 1)],
    } : e));
  };

  const updateSet = (exIdx: number, setIdx: number, field: keyof SetData, value: any) => {
    setExercises(prev => prev.map((e, i) => i === exIdx ? {
      ...e, sets: e.sets.map((s, j) => j === setIdx ? { ...s, [field]: value } : s),
    } : e));
  };

  const completeSet = (exIdx: number, setIdx: number) => {
    updateSet(exIdx, setIdx, 'completed', true);
    setShowRestTimer(true);
  };

  const uncompleteSet = (exIdx: number, setIdx: number) => {
    updateSet(exIdx, setIdx, 'completed', false);
  };

  const toggleExpand = (exIdx: number) => {
    setExercises(prev => prev.map((e, i) => i === exIdx ? { ...e, expanded: !e.expanded } : e));
  };

  const moveExercise = (exIdx: number, to: WorkoutSection) => {
    setExercises(prev => prev.map((e, i) => i === exIdx ? { ...e, section: to } : e));
  };

  const updateNotes = (exIdx: number, notes: string) => {
    setExercises(prev => prev.map((e, i) => i === exIdx ? { ...e, notes } : e));
  };

  const toggleNotesVisibility = (exIdx: number) => {
    setExercises(prev => prev.map((e, i) => i === exIdx ? { ...e, showNotes: !e.showNotes } : e));
  };

  /* ─── Superset linking ─── */
  const handleSupersetLink = (exIdx: number) => {
    if (linkingSuperset === null) {
      setLinkingSuperset(exIdx);
    } else {
      const groupId = `ss-${Date.now()}`;
      setExercises(prev => prev.map((e, i) => {
        if (i === linkingSuperset || i === exIdx) return { ...e, supersetGroup: groupId };
        return e;
      }));
      setLinkingSuperset(null);
    }
  };

  /* ─── Finish ─── */
  const finishSession = async () => {
    if (!sessionId || !user) return;
    let prsHit = 0;
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      const { data: seData } = await supabase
        .from('session_exercises')
        .insert({
          session_id: sessionId, exercise_id: ex.exercise.id,
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
            weight_kg: set.weight_kg!, reps: set.reps, session_id: sessionId,
          });
          toast({ title: '🏆 New PR!', description: `${ex.exercise.name}: ${set.weight_kg}kg × ${set.reps}` });
        }
      }
    }
    if (workoutNotes) {
      await supabase.from('training_sessions').update({ workout_notes: workoutNotes } as any).eq('id', sessionId);
    }
    await supabase.from('training_sessions')
      .update({ completed: true, total_ntu: Math.round(totalNtu) }).eq('id', sessionId);

    const durSecs = sessionStartTime ? Math.floor((Date.now() - sessionStartTime.getTime()) / 1000) : 0;
    setSummaryData({
      date: format(new Date(), 'dd MMM yyyy'),
      duration: `${Math.floor(durSecs / 60).toString().padStart(2, '0')}:${(durSecs % 60).toString().padStart(2, '0')}`,
      totalNtu: Math.round(totalNtu), prsHit, exercisesDone: exercises.length,
      programmeName: activeProgramme?.name,
    });
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

    const completedCls = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
    const normalCls = 'bg-secondary border-border text-foreground';
    const inputCls = (done: boolean) =>
      `w-full rounded-lg px-1.5 py-2.5 font-mono text-xs text-center border focus:border-primary focus:outline-none disabled:opacity-100 ${done ? completedCls : normalCls}`;

    return (
      <div key={setIdx} className="flex items-center gap-2 mb-1.5">
        {/* Set label */}
        <span className={`font-mono text-[10px] w-7 text-center shrink-0 ${
          set.set_type === 'warmup' ? 'text-amber-500' : 'text-muted-foreground'
        }`}>
          {set.set_type === 'warmup' ? 'W' : `S${set.set_num}`}
        </span>

        {/* Weight / Duration */}
        {isTimed ? (
          <div className="flex-1 relative">
            <input
              type="number" inputMode="numeric" placeholder="sec"
              value={set.duration_secs ?? ''} disabled={set.completed}
              onChange={e => updateSet(exIdx, setIdx, 'duration_secs', e.target.value ? parseInt(e.target.value) : null)}
              className={inputCls(set.completed)}
            />
            {set.completed && <Check size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-emerald-400" />}
          </div>
        ) : (
          <div className="flex-1 relative">
            <input
              type="number" inputMode="decimal"
              placeholder={weightUnit === 'lbs' ? 'lbs' : 'kg'}
              value={toDisplay(set.weight_kg) ?? ''}
              onChange={e => updateSet(exIdx, setIdx, 'weight_kg', toKg(e.target.value ? parseFloat(e.target.value) : null))}
              disabled={set.completed}
              className={inputCls(set.completed)}
            />
            {set.completed && <Check size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-emerald-400" />}
          </div>
        )}

        {/* Reps */}
        {!isTimed && (
          <div className="flex-1 relative">
            <input
              type="number" inputMode="numeric" placeholder="reps"
              value={set.reps ?? ''} disabled={set.completed}
              onChange={e => updateSet(exIdx, setIdx, 'reps', e.target.value ? parseInt(e.target.value) : null)}
              className={inputCls(set.completed)}
            />
            {set.completed && <Check size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-emerald-400" />}
          </div>
        )}

        {/* Conditioning extras */}
        {isConditioning && (
          <>
            <div className="flex-1 relative">
              <input
                type="number" inputMode="decimal" placeholder="m"
                value={set.distance_m ?? ''} disabled={set.completed}
                onChange={e => updateSet(exIdx, setIdx, 'distance_m', e.target.value ? parseFloat(e.target.value) : null)}
                className={inputCls(set.completed)}
              />
            </div>
            <div className="flex-1 relative">
              <input
                type="number" inputMode="numeric" placeholder="cal"
                value={set.calories ?? ''} disabled={set.completed}
                onChange={e => updateSet(exIdx, setIdx, 'calories', e.target.value ? parseInt(e.target.value) : null)}
                className={inputCls(set.completed)}
              />
            </div>
          </>
        )}

        {/* RIR */}
        <input
          type="number" inputMode="numeric" min={0} max={5} placeholder="RIR"
          value={set.rir ?? ''} disabled={set.completed}
          onChange={e => updateSet(exIdx, setIdx, 'rir', e.target.value ? parseInt(e.target.value) : null)}
          className={inputCls(set.completed) + ' w-12 shrink-0'}
        />

        {/* Per-set completion button */}
        <button
          onClick={() => set.completed ? uncompleteSet(exIdx, setIdx) : (canComplete ? completeSet(exIdx, setIdx) : null)}
          disabled={!set.completed && !canComplete}
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
            set.completed
              ? 'bg-emerald-500 text-white'
              : canComplete
                ? 'border border-border text-muted-foreground hover:border-primary hover:text-primary'
                : 'text-muted-foreground/20 cursor-not-allowed'
          }`}
        >
          <Check size={12} />
        </button>
      </div>
    );
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

    return (
      <div key={exIdx} className={`bg-card border border-border rounded-2xl overflow-hidden ${ssColor}`}>
        {/* Header — tap to expand */}
        <button onClick={() => toggleExpand(exIdx)} className="w-full flex items-center justify-between px-4 py-3 text-left">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm text-foreground truncate">{ex.exercise.name}</p>
              {ex.supersetGroup && (
                <span className="font-mono text-[8px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">SS</span>
              )}
            </div>
            <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{summaryLine}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {completedSets.length > 0 && (
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {completedSets.length}/{ex.sets.length}
              </span>
            )}
            {ex.isPr && (
              <span className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">PR ↑</span>
            )}
          </div>
        </button>

        {ex.expanded && (
          <div className="px-4 pb-4 space-y-2">
            {/* Column headers */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[7px] text-muted-foreground uppercase w-7 text-center shrink-0">Set</span>
              <span className="font-mono text-[7px] text-muted-foreground uppercase flex-1 text-center">
                {isTimed ? 'Secs' : weightUnit.toUpperCase()}
              </span>
              {!isTimed && <span className="font-mono text-[7px] text-muted-foreground uppercase flex-1 text-center">Reps</span>}
              {ex.exercise.exercise_type === 'conditioning' && (
                <>
                  <span className="font-mono text-[7px] text-muted-foreground uppercase flex-1 text-center">Dist</span>
                  <span className="font-mono text-[7px] text-muted-foreground uppercase flex-1 text-center">Cal</span>
                </>
              )}
              <span className="font-mono text-[7px] text-muted-foreground uppercase w-12 text-center shrink-0">RIR</span>
              <span className="w-8 shrink-0" />
            </div>

            {/* Sets */}
            {ex.sets.map((set, setIdx) => renderSetRow(ex, exIdx, set, setIdx))}

            {/* Add Set */}
            <button onClick={() => addSet(exIdx)} className="w-full font-mono text-[10px] text-primary py-2 rounded-lg border border-dashed border-primary/20 hover:bg-primary/5 transition-colors">
              + Set
            </button>

            {/* Notes toggle */}
            <div>
              <button
                onClick={() => toggleNotesVisibility(exIdx)}
                className={`flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider transition-colors ${
                  ex.showNotes ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <StickyNote size={10} /> {ex.showNotes ? 'Hide Notes' : 'Notes'}
              </button>
              {ex.showNotes && (
                <textarea
                  value={ex.notes}
                  onChange={e => updateNotes(exIdx, e.target.value)}
                  placeholder="Exercise notes..."
                  rows={2}
                  className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-none"
                />
              )}
            </div>

            {/* Overflow actions — compact row */}
            <div className="flex items-center gap-2 pt-1 border-t border-border/50">
              <button
                onClick={() => removeExercise(exIdx)}
                className="font-mono text-[8px] text-destructive/60 hover:text-destructive flex items-center gap-1 transition-colors"
              >
                <Trash2 size={10} /> Remove
              </button>
              <span className="text-border">|</span>
              {ex.section !== 'warmup' && (
                <button onClick={() => moveExercise(exIdx, 'warmup')} className="font-mono text-[8px] text-muted-foreground hover:text-foreground transition-colors">→ Warm Up</button>
              )}
              {ex.section !== 'exercises' && (
                <button onClick={() => moveExercise(exIdx, 'exercises')} className="font-mono text-[8px] text-muted-foreground hover:text-foreground transition-colors">→ Main</button>
              )}
              {ex.section !== 'cooldown' && (
                <button onClick={() => moveExercise(exIdx, 'cooldown')} className="font-mono text-[8px] text-muted-foreground hover:text-foreground transition-colors">→ Cool Down</button>
              )}
              <button
                onClick={() => handleSupersetLink(exIdx)}
                className={`font-mono text-[8px] flex items-center gap-1 transition-colors ${
                  linkingSuperset === exIdx ? 'text-amber-500' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Link2 size={8} /> {linkingSuperset === exIdx ? 'Pick pair…' : 'SS'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const sectionConfig: Record<WorkoutSection, { label: string; emoji: string; bgCls: string; textCls: string; borderCls: string }> = {
    warmup:    { label: 'WARM UP',        emoji: '🔥', bgCls: 'bg-amber-500/10', textCls: 'text-amber-500', borderCls: 'border-amber-500/20' },
    exercises: { label: 'MAIN EXERCISES', emoji: '⚡', bgCls: 'bg-primary/10',   textCls: 'text-primary',   borderCls: 'border-primary/20' },
    cooldown:  { label: 'COOL DOWN',      emoji: '🧊', bgCls: 'bg-sky-500/10',   textCls: 'text-sky-500',   borderCls: 'border-sky-500/20' },
  };

  const renderSection = (sectionKey: WorkoutSection, items: { ex: SessionExercise; globalIdx: number }[]) => {
    const cfg = sectionConfig[sectionKey];
    return (
      <Collapsible
        open={sectionsOpen[sectionKey]}
        onOpenChange={open => setSectionsOpen(prev => ({ ...prev, [sectionKey]: open }))}
      >
        <CollapsibleTrigger className={`w-full flex items-center justify-between py-2.5 px-4 rounded-xl border ${cfg.bgCls} ${cfg.borderCls} mb-2`}>
          <div className="flex items-center gap-2">
            <span className="text-sm">{cfg.emoji}</span>
            <span className={`font-mono text-[10px] ${cfg.textCls} uppercase tracking-widest font-semibold`}>{cfg.label}</span>
            {items.length > 0 && (
              <span className={`font-mono text-[9px] ${cfg.textCls} opacity-60`}>{items.length}</span>
            )}
          </div>
          {sectionsOpen[sectionKey]
            ? <ChevronUp size={14} className={cfg.textCls} />
            : <ChevronDown size={14} className={cfg.textCls} />}
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 mb-4">
          {items.map(({ ex, globalIdx }) => renderExerciseCard(ex, globalIdx))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  /* ═══════════════════════════════════════════
     STATE 1 — No active session
     ═══════════════════════════════════════════ */
  if (!sessionId && !finished) {
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

        <div className="w-full bg-card border border-primary/20 rounded-2xl p-8 text-center" style={{ boxShadow: '0 0 30px hsl(var(--primary) / 0.06)' }}>
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <Dumbbell size={28} className="text-primary" />
          </div>
          <h2 className="font-display text-4xl tracking-[2px] mb-2">START WORKOUT</h2>
          <p className="font-mono text-[10px] text-muted-foreground mb-5 uppercase tracking-widest">Log your training session</p>

          {/* Programme selector */}
          {programmes.length > 0 && (
            <div className="mb-5">
              <button
                onClick={() => setShowProgrammeSelector(!showProgrammeSelector)}
                className="w-full flex items-center justify-between bg-secondary border border-border rounded-xl px-4 py-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <ListChecks size={14} className="text-primary" />
                  <span className="font-mono text-xs text-foreground">
                    {selectedProgrammeId ? programmes.find(p => p.id === selectedProgrammeId)?.name : 'No Programme'}
                  </span>
                </div>
                <ChevronDown size={14} className="text-muted-foreground" />
              </button>
              {showProgrammeSelector && (
                <div className="mt-1 bg-card border border-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => { setSelectedProgrammeId(null); setShowProgrammeSelector(false); }}
                    className={`w-full text-left px-4 py-3 font-mono text-xs border-b border-border transition-colors ${!selectedProgrammeId ? 'text-primary bg-primary/5' : 'text-foreground hover:bg-secondary'}`}
                  >
                    No Programme (Free Session)
                  </button>
                  {programmes.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedProgrammeId(p.id); setShowProgrammeSelector(false); }}
                      className={`w-full text-left px-4 py-3 font-mono text-xs border-b border-border last:border-b-0 transition-colors ${selectedProgrammeId === p.id ? 'text-primary bg-primary/5' : 'text-foreground hover:bg-secondary'}`}
                    >
                      {p.name}
                      {p.is_active && <span className="ml-2 text-[8px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full border border-primary/20">ACTIVE</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Workout day picker */}
          {workouts.length > 0 && selectedProgrammeId === activeProgramme?.id && (
            <div className="mb-5">
              <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest mb-2 text-left">Select today's workout</p>
              <div className="grid grid-cols-1 gap-1.5">
                {workouts.map(w => (
                  <button
                    key={w.id}
                    onClick={() => setSelectedWorkout(selectedWorkout?.id === w.id ? null : w)}
                    className={`w-full text-left px-4 py-3 rounded-xl font-mono text-xs border transition-colors ${
                      selectedWorkout?.id === w.id ? 'text-primary bg-primary/5 border-primary/40' : 'text-foreground bg-secondary border-border hover:border-primary/20'
                    }`}
                  >
                    <span className="font-bold">Day {w.day_number}</span>
                    <span className="text-muted-foreground ml-2">— {w.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button onClick={startSession} className="w-full bg-primary text-primary-foreground font-bold text-xs py-4 rounded-xl uppercase tracking-widest">Begin Session →</button>
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
            onClick={() => { setSessionId(null); setExercises([]); setFinished(false); setSummaryData(null); setTimer('00:00'); setWorkoutNotes(''); }}
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
    <div className="max-w-lg mx-auto px-4 space-y-4">
      {/* Week strip */}
      <WeekStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} workoutDays={workouts.map(w => w.day_number)} />

      {/* Session header */}
      <div className="rounded-2xl p-4 border border-primary/20 bg-card flex items-center justify-between" style={{ boxShadow: '0 0 20px hsl(var(--primary) / 0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <div>
            <p className="font-mono text-2xl text-primary leading-none">{timer}</p>
            <p className="font-mono text-[9px] text-muted-foreground mt-0.5">
              {activeProgramme ? activeProgramme.name + ' · ' : ''}
              {exercises.length} exercise{exercises.length !== 1 ? 's' : ''} · {Math.round(totalNtu)} NTU
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={cancelSession}
            className="text-destructive/70 hover:text-destructive font-mono text-[9px] px-3 py-2.5 rounded-xl border border-destructive/20 hover:bg-destructive/5 transition-colors uppercase tracking-widest"
          >
            <X size={14} />
          </button>
          <button onClick={finishSession} className="bg-primary text-primary-foreground font-bold text-xs px-5 py-2.5 rounded-xl uppercase tracking-widest">FINISH</button>
        </div>
      </div>

      {/* ─── Sections ─── */}
      {renderSection('🔥 Warm Up', 'warmup', sectionExercises.warmup)}
      {renderSection('💪 Exercises', 'exercises', sectionExercises.exercises)}
      {renderSection('🧊 Cool Down', 'cooldown', sectionExercises.cooldown)}

      {/* Add Exercise */}
      {!showSearch ? (
        <button
          onClick={() => setShowSearch(true)}
          className="w-full py-3 rounded-2xl text-xs font-medium flex items-center justify-center gap-2 border-2 border-dashed border-border text-muted-foreground bg-transparent"
        >
          <Plus size={14} /> Add Exercise
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
      <div className="bg-card border border-border rounded-2xl p-4">
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
