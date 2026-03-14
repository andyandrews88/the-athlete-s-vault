import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { calculateSetNtu } from '@/lib/movementPatterns';
import { Search, Plus, Link, Check, Trophy } from 'lucide-react';
import { format } from 'date-fns';

interface ExerciseRow {
  id: string;
  name: string;
  movement_pattern: string;
  difficulty_coefficient: number;
}

interface SetData {
  id?: string;
  set_num: number;
  reps: number | null;
  weight_kg: number | null;
  completed: boolean;
}

interface SessionExercise {
  id?: string;
  exercise: ExerciseRow;
  sets: SetData[];
  superset_group: string | null;
}

interface PastSession {
  id: string;
  date: string;
  session_type: string | null;
  total_ntu: number | null;
  exercise_count: number;
}

export const LogTab = () => {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [exercises, setExercises] = useState<SessionExercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ExerciseRow[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [pastSessions, setPastSessions] = useState<PastSession[]>([]);
  const [finished, setFinished] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    date: string; duration: string; totalNtu: number; prsHit: number; exercisesDone: number;
  } | null>(null);
  const [timer, setTimer] = useState(0);

  // Timer
  useEffect(() => {
    if (!sessionStartTime || finished) return;
    const interval = setInterval(() => {
      setTimer(Math.floor((Date.now() - sessionStartTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime, finished]);

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // Load past sessions
  useEffect(() => {
    if (!user) return;
    const loadPast = async () => {
      const { data: sessions } = await supabase
        .from('training_sessions')
        .select('id, date, session_type, total_ntu, completed')
        .eq('user_id', user.id)
        .eq('completed', true)
        .order('date', { ascending: false })
        .limit(3);

      if (sessions) {
        const withCounts = await Promise.all(sessions.map(async (s) => {
          const { count } = await supabase
            .from('session_exercises')
            .select('id', { count: 'exact', head: true })
            .eq('session_id', s.id);
          return { ...s, exercise_count: count ?? 0 };
        }));
        setPastSessions(withCounts);
      }
    };
    loadPast();
  }, [user]);

  // Total NTU
  const totalNtu = useMemo(() => {
    return exercises.reduce((total, ex) => {
      return total + ex.sets.reduce((setTotal, set) => {
        if (!set.completed || !set.reps || !set.weight_kg) return setTotal;
        return setTotal + calculateSetNtu(set.reps, set.weight_kg, ex.exercise.movement_pattern || '');
      }, 0);
    }, 0);
  }, [exercises]);

  // Search exercises
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
      sets: [{ set_num: 1, reps: null, weight_kg: null, completed: false }],
      superset_group: null,
    }]);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  };

  const addSet = (exIdx: number) => {
    setExercises(prev => prev.map((e, i) => i === exIdx ? {
      ...e,
      sets: [...e.sets, { set_num: e.sets.length + 1, reps: null, weight_kg: null, completed: false }],
    } : e));
  };

  const updateSet = (exIdx: number, setIdx: number, field: keyof SetData, value: any) => {
    setExercises(prev => prev.map((e, i) => i === exIdx ? {
      ...e,
      sets: e.sets.map((s, j) => j === setIdx ? { ...s, [field]: value } : s),
    } : e));
  };

  const linkSuperset = (exIdx: number) => {
    if (exIdx < 1) return;
    const group = `ss-${Date.now()}`;
    setExercises(prev => prev.map((e, i) =>
      (i === exIdx || i === exIdx - 1) ? { ...e, superset_group: group } : e
    ));
  };

  const finishSession = async () => {
    if (!sessionId || !user) return;

    let prsHit = 0;

    // Save all exercises and sets to Supabase
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      const { data: seData } = await supabase
        .from('session_exercises')
        .insert({
          session_id: sessionId,
          exercise_id: ex.exercise.id,
          superset_group: ex.superset_group,
          display_order: i,
        })
        .select('id')
        .single();

      if (!seData) continue;

      for (const set of ex.sets) {
        if (!set.completed || !set.reps || !set.weight_kg) continue;

        // Check for PR
        const { data: existingPr } = await supabase
          .from('personal_records')
          .select('weight_kg')
          .eq('user_id', user.id)
          .eq('exercise_id', ex.exercise.id)
          .order('weight_kg', { ascending: false })
          .limit(1);

        const isPr = !existingPr?.length || set.weight_kg > Number(existingPr[0].weight_kg);

        await supabase.from('exercise_sets').insert({
          session_exercise_id: seData.id,
          set_num: set.set_num,
          reps: set.reps,
          weight_kg: set.weight_kg,
          completed: true,
          is_pr: isPr,
        });

        if (isPr) {
          prsHit++;
          await supabase.from('personal_records').insert({
            user_id: user.id,
            exercise_id: ex.exercise.id,
            weight_kg: set.weight_kg,
            reps: set.reps,
            session_id: sessionId,
          });
          toast({
            title: '🏆 New PR!',
            description: `${ex.exercise.name}: ${set.weight_kg}kg × ${set.reps}`,
          });
        }
      }
    }

    // Update session
    await supabase
      .from('training_sessions')
      .update({ completed: true, total_ntu: Math.round(totalNtu) })
      .eq('id', sessionId);

    const duration = sessionStartTime
      ? formatTimer(Math.floor((Date.now() - sessionStartTime.getTime()) / 1000))
      : '00:00';

    setSummaryData({
      date: format(new Date(), 'dd MMM yyyy'),
      duration,
      totalNtu: Math.round(totalNtu),
      prsHit,
      exercisesDone: exercises.length,
    });
    setFinished(true);
  };

  // Pre-session state
  if (!sessionId && !finished) {
    return (
      <div className="mt-4 space-y-4">
        <Button
          onClick={startSession}
          className="w-full h-12 bg-primary text-primary-foreground font-mono text-sm tracking-wider hover:bg-primary/90"
        >
          START SESSION
        </Button>

        {pastSessions.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-mono text-xs text-muted-foreground tracking-wider">RECENT SESSIONS</h3>
            {pastSessions.map(s => (
              <div key={s.id} className="bg-card border border-border rounded-lg p-4 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-xs text-muted-foreground">{format(new Date(s.date), 'dd MMM yyyy')}</span>
                  {s.session_type && <span className="text-xs bg-vault-bg3 px-2 py-0.5 rounded text-muted-foreground">{s.session_type}</span>}
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-primary font-mono">{s.total_ntu ?? 0} NTU</span>
                  <span className="text-muted-foreground">{s.exercise_count} exercises</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Session summary after finishing
  if (finished && summaryData) {
    return (
      <div className="mt-4">
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h3 className="font-mono text-xs text-muted-foreground tracking-wider">SESSION COMPLETE</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-mono text-sm">{summaryData.date}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="font-mono text-sm">{summaryData.duration}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total NTU</p>
              <p className="font-mono text-sm text-primary">{summaryData.totalNtu}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">PRs Hit</p>
              <p className="font-mono text-sm text-vault-gold">{summaryData.prsHit}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Exercises</p>
            <p className="font-mono text-sm">{summaryData.exercisesDone}</p>
          </div>
          <Button
            onClick={() => {
              setSessionId(null);
              setExercises([]);
              setFinished(false);
              setSummaryData(null);
              setTimer(0);
            }}
            variant="outline"
            className="w-full mt-2"
          >
            New Session
          </Button>
        </div>
      </div>
    );
  }

  // Active session
  return (
    <div className="mt-4 space-y-4">
      {/* Timer */}
      <div className="flex justify-between items-center">
        <span className="font-mono text-2xl text-primary">{`NTU: ${Math.round(totalNtu)}`}</span>
        <span className="font-mono text-sm text-vault-ok border border-vault-ok/30 px-3 py-1 rounded">{formatTimer(timer)}</span>
      </div>

      {/* Exercise search */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setShowSearch(true)}
            className="pl-10 bg-vault-bg2 border-border"
          />
        </div>
        {showSearch && searchResults.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-vault-bg2 border border-border rounded-lg overflow-hidden shadow-lg">
            {searchResults.map(ex => (
              <button
                key={ex.id}
                onClick={() => addExercise(ex)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-vault-bg3 transition-colors text-left"
              >
                <span className="text-sm">{ex.name}</span>
                <span className="text-[10px] font-mono bg-primary/20 text-primary px-2 py-0.5 rounded">
                  {ex.movement_pattern}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Exercise blocks */}
      {exercises.map((ex, exIdx) => (
        <div key={exIdx} className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              {ex.superset_group && (
                <span className="text-[10px] font-mono bg-vault-warn/20 text-vault-warn px-1.5 py-0.5 rounded">SS</span>
              )}
              <h4 className="text-sm font-semibold">{ex.exercise.name}</h4>
            </div>
            <span className="text-[10px] font-mono bg-primary/20 text-primary px-2 py-0.5 rounded">
              {ex.exercise.movement_pattern}
            </span>
          </div>

          {/* Header row */}
          <div className="grid grid-cols-[40px_1fr_1fr_40px] gap-2 px-4 py-2 text-[10px] font-mono text-muted-foreground tracking-wider">
            <span>SET</span>
            <span>REPS</span>
            <span>WEIGHT</span>
            <span></span>
          </div>

          {/* Set rows */}
          {ex.sets.map((set, setIdx) => (
            <div
              key={setIdx}
              className={`grid grid-cols-[40px_1fr_1fr_40px] gap-2 px-4 py-2 items-center ${set.completed ? 'bg-vault-pgb' : ''}`}
            >
              <span className="font-mono text-xs text-muted-foreground">S{set.set_num}</span>
              <Input
                type="number"
                placeholder="—"
                value={set.reps ?? ''}
                onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value ? parseInt(e.target.value) : null)}
                className="h-8 bg-vault-bg3 border-border text-sm font-mono text-center"
              />
              <Input
                type="number"
                placeholder="—"
                value={set.weight_kg ?? ''}
                onChange={(e) => updateSet(exIdx, setIdx, 'weight_kg', e.target.value ? parseFloat(e.target.value) : null)}
                className="h-8 bg-vault-bg3 border-border text-sm font-mono text-center"
              />
              <div className="flex justify-center">
                <Checkbox
                  checked={set.completed}
                  onCheckedChange={(checked) => updateSet(exIdx, setIdx, 'completed', !!checked)}
                  className={set.completed ? 'border-vault-ok text-vault-ok data-[state=checked]:bg-vault-ok/20 data-[state=checked]:border-vault-ok' : ''}
                />
              </div>
            </div>
          ))}

          <div className="flex gap-2 px-4 py-3 border-t border-border">
            <Button variant="ghost" size="sm" onClick={() => addSet(exIdx)} className="text-xs text-primary">
              <Plus className="h-3 w-3 mr-1" /> Add Set
            </Button>
            {exIdx > 0 && !ex.superset_group && (
              <Button variant="ghost" size="sm" onClick={() => linkSuperset(exIdx)} className="text-xs text-vault-warn">
                <Link className="h-3 w-3 mr-1" /> Superset
              </Button>
            )}
          </div>
        </div>
      ))}

      {/* Add exercise shortcut */}
      {exercises.length > 0 && !showSearch && (
        <Button
          variant="outline"
          className="w-full border-dashed border-border text-primary"
          onClick={() => setShowSearch(true)}
        >
          <Plus className="h-4 w-4 mr-2" /> Add Exercise
        </Button>
      )}

      {/* Finish */}
      {exercises.length > 0 && (
        <Button
          onClick={finishSession}
          className="w-full h-12 bg-vault-ok text-primary-foreground font-mono text-sm tracking-wider hover:bg-vault-ok/90"
        >
          <Check className="h-4 w-4 mr-2" /> FINISH SESSION
        </Button>
      )}
    </div>
  );
};
