import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { calculateSetNtu } from '@/lib/movementPatterns';
import { Search, Plus, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

interface ExerciseRow {
  id: string;
  name: string;
  movement_pattern: string;
  difficulty_coefficient: number;
}

interface SetData {
  set_num: number;
  reps: number | null;
  weight_kg: number | null;
  rir: number | null;
  completed: boolean;
}

interface SessionExercise {
  exercise: ExerciseRow;
  sets: SetData[];
  expanded: boolean;
  isPr: boolean;
}

const PATTERN_COLORS: Record<string, string> = {
  Squat: '192 91% 54%',
  Hinge: '38 92% 50%',
  Push: '142 71% 45%',
  Pull: '270 60% 60%',
  Carry: '210 15% 70%',
  Lunge: '192 91% 54%',
  Rotation: '45 93% 58%',
  Jump: '0 72% 51%',
  Sprint: '0 72% 51%',
  Swim: '192 91% 54%',
  Row: '270 60% 60%',
};

export const LogTab = () => {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [exercises, setExercises] = useState<SessionExercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ExerciseRow[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [finished, setFinished] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    date: string; duration: string; totalNtu: number; prsHit: number; exercisesDone: number;
  } | null>(null);
  const [timer, setTimer] = useState('00:00');

  // Timer
  useEffect(() => {
    if (!sessionStartTime || finished) return;
    const interval = setInterval(() => {
      const s = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000);
      const m = Math.floor(s / 60);
      const sec = s % 60;
      setTimer(`${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime, finished]);

  // Total NTU (silent)
  const totalNtu = useMemo(() => {
    return exercises.reduce((total, ex) => {
      return total + ex.sets.reduce((setTotal, set) => {
        if (!set.completed || !set.reps || !set.weight_kg) return setTotal;
        return setTotal + calculateSetNtu(set.reps, set.weight_kg, ex.exercise.movement_pattern || '');
      }, 0);
    }, 0);
  }, [exercises]);

  // Search
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length < 1) { setSearchResults([]); return; }
    const { data } = await supabase
      .from('exercises')
      .select('id, name, movement_pattern, difficulty_coefficient')
      .ilike('name', `%${query}%`)
      .limit(8);
    setSearchResults((data as ExerciseRow[]) || []);
  }, []);

  const startSession = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('training_sessions')
      .insert({ user_id: user.id, completed: false, date: new Date().toISOString().split('T')[0] })
      .select('id')
      .single();
    if (data && !error) {
      setSessionId(data.id);
      setSessionStartTime(new Date());
    }
  };

  const addExercise = (ex: ExerciseRow) => {
    setExercises(prev => [...prev, {
      exercise: ex,
      sets: [{ set_num: 1, reps: null, weight_kg: null, rir: null, completed: false }],
      expanded: true,
      isPr: false,
    }]);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  };

  const addSet = (exIdx: number) => {
    setExercises(prev => prev.map((e, i) => i === exIdx ? {
      ...e,
      sets: [...e.sets, { set_num: e.sets.length + 1, reps: null, weight_kg: null, rir: null, completed: false }],
    } : e));
  };

  const updateSet = (exIdx: number, setIdx: number, field: keyof SetData, value: any) => {
    setExercises(prev => prev.map((e, i) => i === exIdx ? {
      ...e,
      sets: e.sets.map((s, j) => j === setIdx ? { ...s, [field]: value } : s),
    } : e));
  };

  const toggleExpand = (exIdx: number) => {
    setExercises(prev => prev.map((e, i) => i === exIdx ? { ...e, expanded: !e.expanded } : e));
  };

  const finishSession = async () => {
    if (!sessionId || !user) return;
    let prsHit = 0;

    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      const { data: seData } = await supabase
        .from('session_exercises')
        .insert({ session_id: sessionId, exercise_id: ex.exercise.id, display_order: i })
        .select('id')
        .single();
      if (!seData) continue;

      for (const set of ex.sets) {
        if (!set.completed || !set.reps || !set.weight_kg) continue;

        const { data: existingPr } = await supabase
          .from('personal_records')
          .select('weight_kg')
          .eq('user_id', user.id)
          .eq('exercise_id', ex.exercise.id)
          .order('weight_kg', { ascending: false })
          .limit(1);

        const isPr = !existingPr?.length || set.weight_kg > Number(existingPr[0].weight_kg);

        await supabase.from('exercise_sets').insert({
          session_exercise_id: seData.id, set_num: set.set_num,
          reps: set.reps, weight_kg: set.weight_kg, completed: true, is_pr: isPr,
        });

        if (isPr) {
          prsHit++;
          await supabase.from('personal_records').insert({
            user_id: user.id, exercise_id: ex.exercise.id,
            weight_kg: set.weight_kg, reps: set.reps, session_id: sessionId,
          });
          toast({ title: '🏆 New PR!', description: `${ex.exercise.name}: ${set.weight_kg}kg × ${set.reps}` });
          setExercises(prev => prev.map((e, idx) => idx === i ? { ...e, isPr: true } : e));
        }
      }
    }

    await supabase.from('training_sessions')
      .update({ completed: true, total_ntu: Math.round(totalNtu) })
      .eq('id', sessionId);

    const durSecs = sessionStartTime ? Math.floor((Date.now() - sessionStartTime.getTime()) / 1000) : 0;
    const m = Math.floor(durSecs / 60);
    const s = durSecs % 60;

    setSummaryData({
      date: format(new Date(), 'dd MMM yyyy'),
      duration: `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`,
      totalNtu: Math.round(totalNtu),
      prsHit,
      exercisesDone: exercises.length,
    });
    setFinished(true);
  };

  // PRE-SESSION
  if (!sessionId && !finished) {
    return (
      <div className="px-4 py-5 pb-24 space-y-4">
        <button
          onClick={startSession}
          className="w-full py-3 rounded-[12px] text-sm font-bold tracking-wider"
          style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
        >
          START SESSION
        </button>
        <p className="text-center text-xs" style={{ color: 'hsl(var(--dim))' }}>
          Tap to begin logging your workout
        </p>
      </div>
    );
  }

  // SUMMARY
  if (finished && summaryData) {
    return (
      <div className="px-4 py-5 pb-24">
        <div className="rounded-[12px] p-5 space-y-4"
          style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
          <h3 className="font-mono text-xs tracking-wider" style={{ color: 'hsl(var(--dim))' }}>SESSION COMPLETE</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Date', value: summaryData.date },
              { label: 'Duration', value: summaryData.duration },
              { label: 'Total NTU', value: String(summaryData.totalNtu), primary: true },
              { label: 'PRs Hit', value: String(summaryData.prsHit), gold: true },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-[10px]" style={{ color: 'hsl(var(--dim))' }}>{item.label}</p>
                <p className="font-mono text-sm" style={{
                  color: item.primary ? 'hsl(var(--primary))' : item.gold ? 'hsl(var(--gold))' : 'hsl(var(--text))',
                }}>{item.value}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => { setSessionId(null); setExercises([]); setFinished(false); setSummaryData(null); }}
            className="w-full py-3 rounded-[12px] text-sm font-medium"
            style={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text))' }}
          >
            New Session
          </button>
        </div>
      </div>
    );
  }

  // ACTIVE SESSION
  return (
    <div className="px-4 py-5 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-[22px] tracking-wide" style={{ color: 'hsl(var(--text))' }}>
            FUNCTIONAL BB A
          </h2>
          <p className="text-xs" style={{ color: 'hsl(var(--dim))' }}>
            Week 3 · Day 1 · Main Block
          </p>
        </div>
        <div className="font-mono text-xs px-3 py-1.5 rounded-[8px]"
          style={{ border: '1px solid hsl(var(--ok))', color: 'hsl(var(--ok))' }}>
          {timer}
        </div>
      </div>

      {/* WARM UP banner */}
      <div className="py-2 px-3 rounded-[4px]"
        style={{
          background: 'hsla(38,92%,50%,0.15)',
          borderLeft: '3px solid hsl(var(--warn))',
        }}>
        <span className="font-mono text-[10px] tracking-[2px] font-semibold"
          style={{ color: 'hsl(var(--warn))' }}>
          🔥 WARM UP
        </span>
      </div>

      {/* Warm up exercise (static) */}
      <div className="py-2 px-3 rounded-[10px]"
        style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
        <p className="text-[13px] font-semibold" style={{ color: 'hsl(var(--text))' }}>
          Hip Activation + Mobility
        </p>
        <p className="text-xs" style={{ color: 'hsl(var(--dim))' }}>2 × 10 · bodyweight</p>
      </div>

      {/* MAIN EXERCISES banner */}
      <div className="py-2 px-3 rounded-[4px]"
        style={{
          background: 'hsla(var(--pgb), 0.15)',
          borderLeft: '3px solid hsl(var(--primary))',
        }}>
        <span className="font-mono text-[10px] tracking-[2px] font-semibold"
          style={{ color: 'hsl(var(--primary))' }}>
          🏋 MAIN EXERCISES
        </span>
      </div>

      {/* Exercise blocks */}
      {exercises.map((ex, exIdx) => {
        const patternColor = PATTERN_COLORS[ex.exercise.movement_pattern] || '215 14% 50%';
        const completedSets = ex.sets.filter(s => s.completed);
        const avgRir = completedSets.length > 0
          ? Math.round(completedSets.reduce((sum, s) => sum + (s.rir ?? 0), 0) / completedSets.length)
          : null;
        const summaryWeight = completedSets.length > 0
          ? Math.max(...completedSets.map(s => s.weight_kg ?? 0))
          : null;

        return (
          <div key={exIdx} className="rounded-[10px] overflow-hidden"
            style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
            {/* Exercise header */}
            <button
              onClick={() => toggleExpand(exIdx)}
              className="w-full flex items-center gap-3 p-3 text-left"
            >
              {/* Movement pattern pip */}
              <div className="w-[3px] h-8 rounded-[2px] shrink-0"
                style={{ background: `hsl(${patternColor})` }} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold" style={{ color: 'hsl(var(--text))' }}>
                  {ex.exercise.name}
                </p>
                <p className="text-xs" style={{ color: 'hsl(var(--dim))' }}>
                  {ex.sets.length} × {completedSets[0]?.reps ?? '—'} · {summaryWeight ? `${summaryWeight}kg` : '—'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* RIR badge */}
                {avgRir !== null && (
                  <span className="font-mono text-[9px] px-2 py-0.5 rounded-[4px]"
                    style={{
                      background: 'hsla(38,92%,50%,0.1)',
                      border: '1px solid hsl(var(--warn))',
                      color: 'hsl(var(--warn))',
                    }}>
                    RIR {avgRir}
                  </span>
                )}
                {/* PR badge */}
                {ex.isPr && (
                  <span className="font-mono text-[9px] px-2 py-0.5 rounded-[4px]"
                    style={{
                      background: 'hsla(142,71%,45%,0.1)',
                      border: '1px solid hsl(var(--ok))',
                      color: 'hsl(var(--ok))',
                    }}>
                    PR ↑
                  </span>
                )}
                {ex.expanded ? (
                  <ChevronUp size={14} style={{ color: 'hsl(var(--dim))' }} />
                ) : (
                  <ChevronDown size={14} style={{ color: 'hsl(var(--dim))' }} />
                )}
              </div>
            </button>

            {/* Expanded set table */}
            {ex.expanded && (
              <div className="px-3 pb-3">
                {/* Column headers */}
                <div className="grid grid-cols-[36px_1fr_1fr_48px] gap-2 mb-1">
                  {['Set', 'Weight', 'Reps', 'RIR'].map((h) => (
                    <span key={h} className="font-mono text-[9px] tracking-wider"
                      style={{ color: 'hsl(var(--dim))' }}>{h}</span>
                  ))}
                </div>

                {/* Set rows */}
                {ex.sets.map((set, setIdx) => {
                  const isActive = !set.completed;
                  return (
                    <div key={setIdx} className="grid grid-cols-[36px_1fr_1fr_48px] gap-2 items-center mb-1.5">
                      <span className="font-mono text-xs" style={{ color: 'hsl(var(--dim))' }}>
                        S{set.set_num}
                      </span>
                      {/* Weight */}
                      <div className="relative">
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder="—"
                          value={set.weight_kg ?? ''}
                          onChange={(e) => updateSet(exIdx, setIdx, 'weight_kg', e.target.value ? parseFloat(e.target.value) : null)}
                          disabled={set.completed}
                          className="w-full h-8 rounded-[6px] px-2 text-xs font-mono text-center outline-none disabled:opacity-100"
                          style={{
                            background: 'hsl(var(--bg3))',
                            border: `1px solid ${isActive ? 'hsl(var(--primary))' : 'hsl(var(--border2))'}`,
                            color: set.completed ? 'hsl(var(--primary))' : 'hsl(var(--text))',
                          }}
                        />
                        {set.completed && (
                          <Check size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2"
                            style={{ color: 'hsl(var(--ok))' }} />
                        )}
                      </div>
                      {/* Reps */}
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="—"
                        value={set.reps ?? ''}
                        onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value ? parseInt(e.target.value) : null)}
                        disabled={set.completed}
                        className="w-full h-8 rounded-[6px] px-2 text-xs font-mono text-center outline-none disabled:opacity-100"
                        style={{
                          background: 'hsl(var(--bg3))',
                          border: `1px solid ${isActive ? 'hsl(var(--primary))' : 'hsl(var(--border2))'}`,
                          color: set.completed ? 'hsl(var(--primary))' : 'hsl(var(--text))',
                        }}
                      />
                      {/* RIR */}
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={5}
                        placeholder="—"
                        value={set.rir ?? ''}
                        onChange={(e) => updateSet(exIdx, setIdx, 'rir', e.target.value ? parseInt(e.target.value) : null)}
                        disabled={set.completed}
                        className="w-full h-8 rounded-[6px] px-2 text-xs font-mono text-center outline-none disabled:opacity-100"
                        style={{
                          background: 'hsl(var(--bg3))',
                          border: `1px solid ${isActive ? 'hsl(var(--primary))' : 'hsl(var(--border2))'}`,
                          color: set.completed ? 'hsl(var(--primary))' : 'hsl(var(--text))',
                        }}
                      />
                    </div>
                  );
                })}

                {/* Complete set + Add set buttons */}
                <div className="flex gap-2 mt-2">
                  {ex.sets.some(s => !s.completed && s.reps && s.weight_kg) && (
                    <button
                      onClick={() => {
                        const idx = ex.sets.findIndex(s => !s.completed && s.reps && s.weight_kg);
                        if (idx !== -1) updateSet(exIdx, idx, 'completed', true);
                      }}
                      className="flex-1 py-2 rounded-[8px] text-[11px] font-semibold"
                      style={{ background: 'hsla(var(--ok), 0.15)', color: 'hsl(var(--ok))' }}
                    >
                      ✓ Complete Set
                    </button>
                  )}
                  <button
                    onClick={() => addSet(exIdx)}
                    className="flex-1 py-2 rounded-[8px] text-[11px] font-medium"
                    style={{ background: 'hsl(var(--bg3))', color: 'hsl(var(--dim))' }}
                  >
                    + Add Set
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Add Exercise */}
      {!showSearch ? (
        <button
          onClick={() => setShowSearch(true)}
          className="w-full py-3 rounded-[12px] text-xs font-medium flex items-center justify-center gap-2"
          style={{ border: '2px dashed hsl(var(--border2))', color: 'hsl(var(--dim))', background: 'transparent' }}
        >
          <Plus size={14} /> Add Exercise
        </button>
      ) : (
        <div className="space-y-1">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'hsl(var(--dim))' }} />
            <input
              autoFocus
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full h-10 rounded-[10px] pl-9 pr-3 text-sm outline-none"
              style={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text))' }}
            />
          </div>
          {searchResults.length > 0 && (
            <div className="rounded-[10px] overflow-hidden"
              style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
              {searchResults.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => addExercise(ex)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors"
                  style={{ borderBottom: '1px solid hsl(var(--border))' }}
                >
                  <span className="text-sm" style={{ color: 'hsl(var(--text))' }}>{ex.name}</span>
                  <span className="font-mono text-[9px] px-2 py-0.5 rounded-[4px]"
                    style={{ background: 'hsla(var(--primary), 0.15)', color: 'hsl(var(--primary))' }}>
                    {ex.movement_pattern}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Finish Session */}
      {exercises.length > 0 && (
        <button
          onClick={finishSession}
          className="w-full py-3 rounded-[12px] text-sm font-bold tracking-wider"
          style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
        >
          FINISH SESSION
        </button>
      )}
    </div>
  );
};
