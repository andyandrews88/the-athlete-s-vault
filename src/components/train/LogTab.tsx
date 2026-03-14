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
      <div className="max-w-lg mx-auto px-4 space-y-4">
        <div className="bg-vault-bg2 border border-primary/20 rounded-2xl p-4 space-y-4">
          <div className="text-center">
            <p className="font-mono text-2xl text-primary">{timer}</p>
            <p className="font-mono text-[10px] text-vault-dim mt-1">Ready to train</p>
          </div>
          <button
            onClick={startSession}
            className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl uppercase tracking-widest text-xs"
          >
            START SESSION
          </button>
        </div>
      </div>
    );
  }

  // SUMMARY
  if (finished && summaryData) {
    return (
      <div className="max-w-lg mx-auto px-4 space-y-4">
        <div className="bg-vault-bg2 border border-primary/20 rounded-2xl p-5 space-y-4">
          <h3 className="font-mono text-[10px] text-vault-dim uppercase tracking-widest">SESSION COMPLETE</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Date', value: summaryData.date },
              { label: 'Duration', value: summaryData.duration },
              { label: 'Total NTU', value: String(summaryData.totalNtu), primary: true },
              { label: 'PRs Hit', value: String(summaryData.prsHit), gold: true },
            ].map((item) => (
              <div key={item.label}>
                <p className="font-mono text-[8px] text-vault-dim uppercase">{item.label}</p>
                <p className={`font-mono text-sm ${item.primary ? 'text-primary' : item.gold ? 'text-vault-gold' : 'text-foreground'}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
          <button
            onClick={() => { setSessionId(null); setExercises([]); setFinished(false); setSummaryData(null); }}
            className="w-full bg-vault-bg3 border border-vault-border text-foreground font-bold py-3.5 rounded-xl uppercase tracking-widest text-xs"
          >
            New Session
          </button>
        </div>
      </div>
    );
  }

  // ACTIVE SESSION
  return (
    <div className="max-w-lg mx-auto px-4 space-y-4">
      {/* Session header */}
      <div className="bg-vault-bg2 border border-primary/20 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl tracking-wide text-foreground">FUNCTIONAL BB A</h2>
            <p className="font-mono text-[10px] text-vault-dim">Week 3 · Day 1 · Main Block</p>
          </div>
          <p className="font-mono text-2xl text-primary">{timer}</p>
        </div>
      </div>

      {/* Exercise blocks */}
      {exercises.map((ex, exIdx) => {
        const completedSets = ex.sets.filter(s => s.completed);
        const avgRir = completedSets.length > 0
          ? Math.round(completedSets.reduce((sum, s) => sum + (s.rir ?? 0), 0) / completedSets.length)
          : null;

        return (
          <div key={exIdx} className="bg-vault-bg2 border border-vault-border rounded-2xl p-4">
            {/* Exercise header */}
            <button
              onClick={() => toggleExpand(exIdx)}
              className="w-full flex items-center justify-between text-left"
            >
              <div>
                <p className="font-semibold text-sm text-foreground">{ex.exercise.name}</p>
                <span className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 inline-block mt-1">
                  {ex.exercise.movement_pattern}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {avgRir !== null && (
                  <span className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-vault-warn/10 text-vault-warn border border-vault-warn/20">
                    RIR {avgRir}
                  </span>
                )}
                {ex.isPr && (
                  <span className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-vault-ok/10 text-vault-ok border border-vault-ok/20">
                    PR ↑
                  </span>
                )}
                {ex.expanded ? <ChevronUp size={14} className="text-vault-dim" /> : <ChevronDown size={14} className="text-vault-dim" />}
              </div>
            </button>

            {/* Expanded set table */}
            {ex.expanded && (
              <div className="mt-3">
                {/* Headers */}
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {['SET', 'WEIGHT', 'REPS', 'RIR'].map((h) => (
                    <span key={h} className="font-mono text-[8px] text-vault-dim uppercase text-center">{h}</span>
                  ))}
                </div>

                {/* Set rows */}
                {ex.sets.map((set, setIdx) => (
                  <div key={setIdx} className="grid grid-cols-4 gap-2 items-center mb-1.5">
                    <span className="font-mono text-xs text-vault-dim text-center">S{set.set_num}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="—"
                      value={set.weight_kg ?? ''}
                      onChange={(e) => updateSet(exIdx, setIdx, 'weight_kg', e.target.value ? parseFloat(e.target.value) : null)}
                      disabled={set.completed}
                      className={`w-full bg-vault-bg3 border rounded-lg px-2 py-2 font-mono text-xs text-center focus:border-primary focus:outline-none disabled:opacity-100 ${
                        set.completed ? 'border-primary/40 bg-primary/5 text-primary' : 'border-vault-border text-foreground'
                      }`}
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="—"
                      value={set.reps ?? ''}
                      onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value ? parseInt(e.target.value) : null)}
                      disabled={set.completed}
                      className={`w-full bg-vault-bg3 border rounded-lg px-2 py-2 font-mono text-xs text-center focus:border-primary focus:outline-none disabled:opacity-100 ${
                        set.completed ? 'border-primary/40 bg-primary/5 text-primary' : 'border-vault-border text-foreground'
                      }`}
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={5}
                      placeholder="—"
                      value={set.rir ?? ''}
                      onChange={(e) => updateSet(exIdx, setIdx, 'rir', e.target.value ? parseInt(e.target.value) : null)}
                      disabled={set.completed}
                      className={`w-full bg-vault-bg3 border rounded-lg px-2 py-2 font-mono text-xs text-center focus:border-primary focus:outline-none disabled:opacity-100 ${
                        set.completed ? 'border-primary/40 bg-primary/5 text-primary' : 'border-vault-border text-foreground'
                      }`}
                    />
                  </div>
                ))}

                {/* Buttons */}
                <div className="flex gap-2 mt-2">
                  {ex.sets.some(s => !s.completed && s.reps && s.weight_kg) && (
                    <button
                      onClick={() => {
                        const idx = ex.sets.findIndex(s => !s.completed && s.reps && s.weight_kg);
                        if (idx !== -1) updateSet(exIdx, idx, 'completed', true);
                      }}
                      className="flex-1 font-mono text-[9px] text-vault-ok border border-vault-ok/20 bg-vault-ok/5 rounded-lg px-3 py-2"
                    >
                      ✓ Complete Set
                    </button>
                  )}
                  <button
                    onClick={() => addSet(exIdx)}
                    className="flex-1 font-mono text-[9px] text-primary border border-primary/20 bg-primary/5 rounded-lg px-3 py-2"
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
          className="w-full py-3 rounded-2xl text-xs font-medium flex items-center justify-center gap-2 border-2 border-dashed border-vault-border2 text-vault-dim bg-transparent"
        >
          <Plus size={14} /> Add Exercise
        </button>
      ) : (
        <div className="space-y-1">
          <div className="relative">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-vault-dim" />
            <input
              autoFocus
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full bg-vault-bg3 border border-vault-border2 rounded-xl px-4 py-3 pl-10 font-mono text-sm text-foreground placeholder:text-vault-dim focus:outline-none focus:border-primary"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="bg-vault-bg2 border border-vault-border rounded-2xl overflow-hidden">
              {searchResults.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => addExercise(ex)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left border-b border-vault-border last:border-b-0 hover:bg-vault-bg3 transition-colors"
                >
                  <span className="text-sm text-foreground">{ex.name}</span>
                  <span className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
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
          className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl uppercase tracking-widest text-xs mt-4"
        >
          FINISH SESSION
        </button>
      )}
    </div>
  );
};
