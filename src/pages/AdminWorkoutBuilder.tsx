import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Search, GripVertical, ChevronUp, ChevronDown, X, Plus } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };
const bebas: React.CSSProperties = { fontFamily: "'Bebas Neue', cursive" };

const pipColor: Record<string, string> = {
  Hinge: 'hsl(0,72%,51%)', Squat: 'hsl(262,60%,55%)', Push: 'hsl(192,91%,54%)',
  Pull: 'hsl(142,71%,45%)', 'Single Leg': 'hsl(38,92%,50%)', Carry: 'hsl(38,92%,50%)',
  Core: 'hsl(215,14%,50%)', Olympic: 'hsl(45,93%,58%)', Conditioning: 'hsl(38,92%,50%)',
  Isolation: 'hsl(215,14%,50%)', Plyometric: 'hsl(0,72%,51%)', Rotational: 'hsl(215,14%,50%)',
};

interface ExerciseResult { id: string; name: string; movement_pattern: string | null; difficulty_coefficient: number | null; }
interface CanvasExercise {
  id: string; exerciseId: string; name: string; movementPattern: string;
  sets: number; reps: string; weight: string; rir: string; type: string;
  section: string; supersetGroup: string; selected: boolean;
}
interface Programme {
  id: string; name: string; description: string | null; is_free: boolean;
  weeks: number | null; days_per_week: number | null; is_template: boolean | null;
  user_id: string; workoutCount: number;
}
interface Client { id: string; full_name: string | null; email: string | null; }

const DEFAULT_PROGRAMMES = [
  { name: 'Functional Bodybuilding', weeks: 12, days_per_week: 4, is_free: true, description: 'Build muscle, look athletic, perform well.', is_template: true },
  { name: 'Hybrid Programme', weeks: 12, days_per_week: 5, is_free: true, description: 'Strength meets conditioning.', is_template: true },
  { name: 'CrossFit Programme', weeks: 12, days_per_week: 5, is_free: true, description: 'GPP and competitive fitness.', is_template: true },
];

const AdminWorkoutBuilder = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ExerciseResult[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [canvasExercises, setCanvasExercises] = useState<CanvasExercise[]>([]);
  const [workoutName, setWorkoutName] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [activeSection, setActiveSection] = useState('warmup');
  const [activeProgrammeId, setActiveProgrammeId] = useState<string | null>(null);
  const [sectionSearch, setSectionSearch] = useState<Record<string, string>>({ warmup: '', main: '', cooldown: '' });
  const [sectionResults, setSectionResults] = useState<Record<string, ExerciseResult[]>>({ warmup: [], main: [], cooldown: [] });
  const [showNewProgramme, setShowNewProgramme] = useState(false);
  const [newProgName, setNewProgName] = useState('');
  const [newProgWeeks, setNewProgWeeks] = useState('12');
  const [newProgDays, setNewProgDays] = useState('4');
  const [newProgDesc, setNewProgDesc] = useState('');
  const [newProgFree, setNewProgFree] = useState(false);
  // Assign sheet
  const [assignSheet, setAssignSheet] = useState(false);
  const [assignProgId, setAssignProgId] = useState<string | null>(null);
  const [assignProgName, setAssignProgName] = useState('');
  const [assignClient, setAssignClient] = useState('');
  const [assignDate, setAssignDate] = useState<Date>(new Date());
  const searchRef = useRef<HTMLInputElement>(null);
  const supersetCounter = useRef(0);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [progsRes, clientsRes] = await Promise.all([
      supabase.from('training_programmes').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, email').eq('role', 'client'),
    ]);
    let progs = progsRes.data || [];

    // Seed defaults if empty
    if (progs.length === 0 && user) {
      for (const dp of DEFAULT_PROGRAMMES) {
        await supabase.from('training_programmes').insert({ ...dp, user_id: user.id, is_active: false } as any);
      }
      const { data: seeded } = await supabase.from('training_programmes').select('*').order('created_at', { ascending: false });
      progs = seeded || [];
    }

    // Count workouts per programme
    const progIds = progs.map(p => p.id);
    const { data: workouts } = await supabase.from('programme_workouts').select('id, programme_id').in('programme_id', progIds.length ? progIds : ['_']);
    const countMap: Record<string, number> = {};
    (workouts || []).forEach(w => { countMap[w.programme_id] = (countMap[w.programme_id] || 0) + 1; });

    setProgrammes(progs.map(p => ({
      id: p.id, name: p.name, description: (p as any).description || null,
      is_free: (p as any).is_free || false, weeks: (p as any).weeks || null,
      days_per_week: (p as any).days_per_week || null, is_template: p.is_template,
      user_id: p.user_id, workoutCount: countMap[p.id] || 0,
    })));
    setClients(clientsRes.data || []);
    setLoading(false);
  };

  const searchExercises = async (q: string) => {
    if (q.length < 1) { setSearchResults([]); return; }
    const { data } = await supabase.from('exercises').select('id, name, movement_pattern, difficulty_coefficient').ilike('name', `%${q}%`).limit(8);
    setSearchResults(data || []);
  };

  const searchSectionExercises = async (section: string, q: string) => {
    if (q.length < 1) { setSectionResults(p => ({ ...p, [section]: [] })); return; }
    const { data } = await supabase.from('exercises').select('id, name, movement_pattern, difficulty_coefficient').ilike('name', `%${q}%`).limit(8);
    setSectionResults(p => ({ ...p, [section]: data || [] }));
  };

  const addExercise = (ex: ExerciseResult, section: string) => {
    setCanvasExercises(prev => [...prev, {
      id: crypto.randomUUID(), exerciseId: ex.id, name: ex.name,
      movementPattern: ex.movement_pattern || '', sets: 3, reps: '10',
      weight: '', rir: '2', type: 'HYP', section, supersetGroup: '', selected: false,
    }]);
    setSearchQuery(''); setSearchResults([]);
    setSectionSearch(p => ({ ...p, [section]: '' }));
    setSectionResults(p => ({ ...p, [section]: [] }));
  };

  const updateExercise = (id: string, field: keyof CanvasExercise, value: any) => {
    setCanvasExercises(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const removeExercise = (id: string) => {
    setCanvasExercises(prev => prev.filter(e => e.id !== id));
  };

  const moveExercise = (id: string, dir: -1 | 1) => {
    setCanvasExercises(prev => {
      const idx = prev.findIndex(e => e.id === id);
      if (idx < 0) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  const linkSuperset = () => {
    const selected = canvasExercises.filter(e => e.selected && e.section === activeSection);
    if (selected.length < 2) { toast({ title: 'Select 2+ exercises to link' }); return; }
    supersetCounter.current++;
    const group = String.fromCharCode(64 + supersetCounter.current);
    setCanvasExercises(prev => prev.map(e =>
      selected.find(s => s.id === e.id) ? { ...e, supersetGroup: group, selected: false } : e
    ));
  };

  const saveWorkout = async () => {
    if (!workoutName.trim()) { toast({ title: 'Enter a workout name' }); return; }
    const prescribed = canvasExercises.map((e, i) => ({
      name: e.name, exercise_id: e.exerciseId, sets: e.sets, reps: e.reps,
      weight: e.weight, rir: e.rir, type: e.type, section: e.section,
      superset_group: e.supersetGroup, display_order: i,
    }));
    const { error } = await supabase.from('programme_workouts').insert({
      programme_id: activeProgrammeId || programmes[0]?.id,
      name: workoutName, day_number: 1, prescribed_exercises: prescribed as any,
      section: activeSection,
    });
    if (error) { toast({ title: 'Error saving', description: error.message }); return; }
    toast({ title: 'Workout saved' });
    loadData();
  };

  const copyWorkout = async () => {
    const newName = prompt('New workout name:', workoutName + ' (Copy)');
    if (!newName) return;
    const prescribed = canvasExercises.map((e, i) => ({
      name: e.name, exercise_id: e.exerciseId, sets: e.sets, reps: e.reps,
      weight: e.weight, rir: e.rir, type: e.type, section: e.section,
      superset_group: e.supersetGroup, display_order: i,
    }));
    await supabase.from('programme_workouts').insert({
      programme_id: activeProgrammeId || programmes[0]?.id,
      name: newName, day_number: 1, prescribed_exercises: prescribed as any,
      section: activeSection,
    });
    toast({ title: 'Workout copied' });
    loadData();
  };

  const createProgramme = async () => {
    if (!newProgName.trim() || !user) return;
    await supabase.from('training_programmes').insert({
      name: newProgName, user_id: user.id, is_active: false, is_template: true,
      is_free: newProgFree, weeks: parseInt(newProgWeeks) || 12,
      days_per_week: parseInt(newProgDays) || 4, description: newProgDesc,
    } as any);
    toast({ title: 'Programme created' });
    setShowNewProgramme(false);
    setNewProgName(''); setNewProgDesc('');
    loadData();
  };

  const assignProgramme = async () => {
    if (!assignClient || !assignProgId) return;
    // Deactivate current active
    await supabase.from('training_programmes').update({ is_active: false }).eq('user_id', assignClient).eq('is_active', true);
    const prog = programmes.find(p => p.id === assignProgId);
    await supabase.from('training_programmes').insert({
      name: prog?.name || 'Programme', user_id: assignClient, is_active: true,
      is_template: false, description: prog?.description,
      is_free: prog?.is_free, weeks: prog?.weeks, days_per_week: prog?.days_per_week,
    } as any);
    toast({ title: 'Programme assigned' });
    setAssignSheet(false);
    loadData();
  };

  const loadProgrammeWorkouts = async (progId: string) => {
    setActiveProgrammeId(progId);
    const { data } = await supabase.from('programme_workouts').select('*').eq('programme_id', progId).order('day_number');
    if (data && data.length > 0) {
      const w = data[0];
      setWorkoutName(w.name);
      const exs = (w.prescribed_exercises as any[]) || [];
      setCanvasExercises(exs.map((e: any, i: number) => ({
        id: crypto.randomUUID(), exerciseId: e.exercise_id || '', name: e.name,
        movementPattern: e.movement_pattern || '', sets: e.sets || 3, reps: e.reps || '10',
        weight: e.weight || '', rir: e.rir || '2', type: e.type || 'HYP',
        section: e.section || 'main', supersetGroup: e.superset_group || '', selected: false,
      })));
    } else {
      setCanvasExercises([]);
      setWorkoutName('');
    }
  };

  const sectionExercises = canvasExercises.filter(e => e.section === activeSection);
  const sections = ['warmup', 'main', 'cooldown'] as const;
  const hasSelected = canvasExercises.filter(e => e.selected && e.section === activeSection).length >= 2;

  const inputStyle: React.CSSProperties = {
    background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border2))',
    borderRadius: 8, padding: '8px 12px', color: 'hsl(var(--text))',
    fontSize: 13, width: '100%', outline: 'none',
  };
  const smallInput: React.CSSProperties = {
    ...mono, background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))',
    borderRadius: 6, padding: '4px 6px', color: 'hsl(var(--text))', fontSize: 11, outline: 'none', textAlign: 'center' as const,
  };

  return (
    <AdminLayout>
    <div style={{ minHeight: '100vh', background: 'hsl(var(--bg))', paddingBottom: 32 }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px', borderBottom: '1px solid hsl(var(--border))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ ...bebas, fontSize: 24, color: 'hsl(var(--text))' }}>WORKOUT BUILDER</span>
        </div>
        <span style={{ ...mono, fontSize: 8, padding: '2px 8px', borderRadius: 4, background: 'hsla(192,91%,54%,0.1)', color: 'hsl(var(--primary))', border: '1px solid hsla(192,91%,54%,0.2)', textTransform: 'uppercase', letterSpacing: 1 }}>ADMIN</span>
      </div>

      <div style={{ display: 'flex', gap: 20, padding: 20, flexWrap: 'wrap' }}>
        {/* LEFT PANEL */}
        <div style={{ flex: '1 1 340px', minWidth: 300, maxWidth: 420 }}>
          {/* Exercise Search */}
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: 11, color: 'hsl(var(--dim))' }} />
            <input ref={searchRef} value={searchQuery} onChange={e => { setSearchQuery(e.target.value); searchExercises(e.target.value); }}
              placeholder="Search exercises..." style={{ ...inputStyle, paddingLeft: 34 }} />
            {searchResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border2))', borderRadius: 8, marginTop: 4, overflow: 'hidden' }}>
                {searchResults.map(r => (
                  <button key={r.id} onClick={() => addExercise(r, activeSection)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 12px', background: 'none', border: 'none', borderBottom: '1px solid hsl(var(--border))', color: 'hsl(var(--text))', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ fontSize: 12 }}>{r.name}</span>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {r.movement_pattern && <span style={{ ...mono, fontSize: 8, padding: '1px 6px', borderRadius: 4, background: 'hsl(var(--pg) / 0.1)', color: 'hsl(var(--primary))' }}>{r.movement_pattern}</span>}
                      <span style={{ ...mono, fontSize: 9, color: 'hsl(var(--dim))' }}>×{r.difficulty_coefficient ?? 1}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Programme Library */}
          <div style={{ ...bebas, fontSize: 20, color: 'hsl(var(--text))', marginBottom: 12 }}>PROGRAMMES</div>

          <button onClick={() => setShowNewProgramme(!showNewProgramme)}
            style={{ width: '100%', padding: '10px 0', borderRadius: 8, background: 'transparent', border: '1px solid hsl(var(--primary) / 0.3)', color: 'hsl(var(--primary))', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}>
            + New Programme
          </button>

          {showNewProgramme && (
            <div style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))', borderRadius: 10, padding: 14, marginBottom: 12 }}>
              <input value={newProgName} onChange={e => setNewProgName(e.target.value)} placeholder="Programme name" style={{ ...inputStyle, marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input value={newProgWeeks} onChange={e => setNewProgWeeks(e.target.value)} placeholder="Weeks" type="number" style={{ ...inputStyle, width: '50%' }} />
                <input value={newProgDays} onChange={e => setNewProgDays(e.target.value)} placeholder="Days/wk" type="number" style={{ ...inputStyle, width: '50%' }} />
              </div>
              <textarea value={newProgDesc} onChange={e => setNewProgDesc(e.target.value)} placeholder="Description" style={{ ...inputStyle, minHeight: 50, resize: 'vertical' }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, ...mono, fontSize: 10, color: 'hsl(var(--dim))' }}>
                <input type="checkbox" checked={newProgFree} onChange={e => setNewProgFree(e.target.checked)} /> FREE programme
              </label>
              <button onClick={createProgramme} style={{ width: '100%', padding: '8px 0', borderRadius: 6, background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', marginTop: 8 }}>Save Programme</button>
            </div>
          )}

          {loading ? [1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full mb-3 rounded-lg" />) : programmes.map(p => (
            <div key={p.id} style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))', borderRadius: 10, padding: 14, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                {p.is_free && <span style={{ ...mono, fontSize: 8, padding: '1px 6px', borderRadius: 4, background: 'hsl(var(--ok) / 0.1)', color: 'hsl(var(--ok))', border: '1px solid hsl(var(--ok) / 0.2)' }}>FREE</span>}
              </div>
              <div style={{ ...mono, fontSize: 9, color: 'hsl(var(--dim))', marginBottom: 4 }}>
                {p.weeks || '–'} WEEKS · {p.days_per_week || '–'} DAYS/WK · {p.workoutCount} WORKOUTS
              </div>
              {p.description && <div style={{ fontSize: 11, color: 'hsl(var(--mid))', marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setAssignProgId(p.id); setAssignProgName(p.name); setAssignSheet(true); }}
                  style={{ flex: 1, padding: '6px 0', borderRadius: 6, background: 'transparent', border: '1px solid hsl(var(--border2))', color: 'hsl(var(--dim))', fontSize: 10, cursor: 'pointer' }}>
                  Assign to Client
                </button>
                <button onClick={() => loadProgrammeWorkouts(p.id)}
                  style={{ flex: 1, padding: '6px 0', borderRadius: 6, background: 'transparent', border: '1px solid hsl(var(--primary) / 0.3)', color: 'hsl(var(--primary))', fontSize: 10, cursor: 'pointer' }}>
                  Edit ✎
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT PANEL — CANVAS */}
        <div style={{ flex: '1 1 400px', minWidth: 320 }}>
          {/* Workout name + client */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <input value={workoutName} onChange={e => setWorkoutName(e.target.value)}
              placeholder="Workout name e.g. Functional BB A - W4"
              style={{ ...bebas, fontSize: 20, background: 'transparent', border: 'none', borderBottom: '1px solid hsl(var(--border2))', color: 'hsl(var(--text))', flex: 1, padding: '4px 0', outline: 'none' }} />
            <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)}
              style={{ ...mono, fontSize: 10, background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border2))', borderRadius: 6, padding: '6px 8px', color: 'hsl(var(--dim))', outline: 'none' }}>
              <option value="">No client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.full_name || c.email}</option>)}
            </select>
          </div>

          {/* Section tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {sections.map(s => (
              <button key={s} onClick={() => setActiveSection(s)}
                style={{ ...mono, flex: 1, padding: '8px 0', borderRadius: 6, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', border: 'none', cursor: 'pointer',
                  background: activeSection === s ? 'hsl(var(--primary))' : 'hsl(var(--bg3))',
                  color: activeSection === s ? 'hsl(220,16%,6%)' : 'hsl(var(--dim))',
                }}>
                {s}
              </button>
            ))}
          </div>

          {/* Superset link */}
          {hasSelected && (
            <button onClick={linkSuperset}
              style={{ width: '100%', padding: '6px 0', borderRadius: 6, background: 'hsl(var(--warn) / 0.1)', border: '1px solid hsl(var(--warn) / 0.3)', color: 'hsl(var(--warn))', fontSize: 10, fontWeight: 600, cursor: 'pointer', marginBottom: 12, ...mono }}>
              Link as Superset
            </button>
          )}

          {/* Exercise rows */}
          {(() => {
            let lastGroup = '';
            return sectionExercises.map((ex, idx) => {
              const showLabel = ex.supersetGroup && ex.supersetGroup !== lastGroup;
              lastGroup = ex.supersetGroup;
              return (
                <div key={ex.id}>
                  {showLabel && <div style={{ ...mono, fontSize: 8, color: 'hsl(var(--warn))', marginBottom: 4, letterSpacing: 1 }}>SUPERSET {ex.supersetGroup}</div>}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', marginBottom: 6,
                    background: 'hsl(var(--bg2))', borderRadius: 8, border: '1px solid hsl(var(--border))',
                    borderLeft: ex.supersetGroup ? '2px solid hsl(var(--warn))' : '1px solid hsl(var(--border))',
                  }}>
                    <input type="checkbox" checked={ex.selected} onChange={e => updateExercise(ex.id, 'selected', e.target.checked)} style={{ accentColor: 'hsl(var(--primary))' }} />
                    <div style={{ width: 3, height: 24, borderRadius: 2, background: pipColor[ex.movementPattern] || 'hsl(var(--dim))' }} />
                    <div style={{ flex: '1 1 100px', minWidth: 80 }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{ex.name}</div>
                      <div style={{ ...mono, fontSize: 9, color: 'hsl(var(--dim))' }}>{ex.movementPattern}</div>
                    </div>
                    <input value={ex.sets} onChange={e => updateExercise(ex.id, 'sets', parseInt(e.target.value) || 0)} type="number" placeholder="S" style={{ ...smallInput, width: 40 }} />
                    <input value={ex.reps} onChange={e => updateExercise(ex.id, 'reps', e.target.value)} placeholder="Reps" style={{ ...smallInput, width: 52 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <input value={ex.weight} onChange={e => updateExercise(ex.id, 'weight', e.target.value)} placeholder="kg" type="number" style={{ ...smallInput, width: 52 }} />
                      <span style={{ ...mono, fontSize: 8, color: 'hsl(var(--dim))' }}>kg</span>
                    </div>
                    <input value={ex.rir} onChange={e => updateExercise(ex.id, 'rir', e.target.value)} type="number" placeholder="RIR" style={{ ...smallInput, width: 36 }} />
                    <select value={ex.type} onChange={e => updateExercise(ex.id, 'type', e.target.value)}
                      style={{ ...smallInput, width: 56, textAlign: 'center' }}>
                      <option>STR</option><option>HYP</option><option>PWR</option><option>COND</option>
                    </select>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <button onClick={() => moveExercise(ex.id, -1)} style={{ background: 'none', border: 'none', color: 'hsl(var(--dim))', cursor: 'pointer', padding: 0, lineHeight: 1 }}><ChevronUp size={12} /></button>
                      <button onClick={() => moveExercise(ex.id, 1)} style={{ background: 'none', border: 'none', color: 'hsl(var(--dim))', cursor: 'pointer', padding: 0, lineHeight: 1 }}><ChevronDown size={12} /></button>
                    </div>
                    <button onClick={() => removeExercise(ex.id)} style={{ background: 'none', border: 'none', color: 'hsl(var(--bad))', cursor: 'pointer', padding: 0 }}><X size={14} /></button>
                  </div>
                </div>
              );
            });
          })()}

          {/* Inline add search */}
          <div style={{ position: 'relative', marginTop: 8, marginBottom: 20 }}>
            <Plus size={14} style={{ position: 'absolute', left: 10, top: 9, color: 'hsl(var(--dim))' }} />
            <input value={sectionSearch[activeSection]} onChange={e => { setSectionSearch(p => ({ ...p, [activeSection]: e.target.value })); searchSectionExercises(activeSection, e.target.value); }}
              placeholder={`+ Add to ${activeSection}...`} style={{ ...inputStyle, paddingLeft: 32, fontSize: 11 }} />
            {sectionResults[activeSection]?.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border2))', borderRadius: 8, marginTop: 4, overflow: 'hidden' }}>
                {sectionResults[activeSection].map(r => (
                  <button key={r.id} onClick={() => addExercise(r, activeSection)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 12px', background: 'none', border: 'none', borderBottom: '1px solid hsl(var(--border))', color: 'hsl(var(--text))', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ fontSize: 12 }}>{r.name}</span>
                    {r.movement_pattern && <span style={{ ...mono, fontSize: 8, padding: '1px 6px', borderRadius: 4, background: 'hsl(var(--pg) / 0.1)', color: 'hsl(var(--primary))' }}>{r.movement_pattern}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bottom actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={saveWorkout}
              style={{ flex: 1, padding: '12px 0', borderRadius: 8, background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
              Save Workout
            </button>
            <button onClick={copyWorkout}
              style={{ flex: 1, padding: '12px 0', borderRadius: 8, background: 'transparent', border: '1px solid hsl(var(--border2))', color: 'hsl(var(--dim))', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Copy →
            </button>
          </div>
        </div>
      </div>

      {/* Assign Sheet */}
      <Sheet open={assignSheet} onOpenChange={setAssignSheet}>
        <SheetContent side="bottom" style={{ background: 'hsl(var(--bg2))', border: 'none', borderTop: '1px solid hsl(var(--border))' }}>
          <SheetHeader>
            <SheetTitle style={{ ...bebas, fontSize: 22, color: 'hsl(var(--text))' }}>ASSIGN PROGRAMME</SheetTitle>
          </SheetHeader>
          <div style={{ padding: '16px 0' }}>
            <div style={{ ...mono, fontSize: 9, color: 'hsl(var(--dim))', marginBottom: 4 }}>Programme: {assignProgName}</div>
            <select value={assignClient} onChange={e => setAssignClient(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }}>
              <option value="">Select client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.full_name || c.email}</option>)}
            </select>
            <div style={{ ...mono, fontSize: 9, color: 'hsl(var(--dim))', marginBottom: 4 }}>Start date</div>
            <Popover>
              <PopoverTrigger asChild>
                <button style={{ ...inputStyle, textAlign: 'left', cursor: 'pointer', marginBottom: 12 }}>{format(assignDate, 'PPP')}</button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={assignDate} onSelect={d => d && setAssignDate(d)} className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <button onClick={assignProgramme} disabled={!assignClient}
              style={{ width: '100%', padding: '12px 0', borderRadius: 8, background: assignClient ? 'hsl(var(--primary))' : 'hsl(var(--bg3))', color: assignClient ? 'hsl(var(--primary-foreground))' : 'hsl(var(--dim))', fontSize: 13, fontWeight: 700, border: 'none', cursor: assignClient ? 'pointer' : 'default' }}>
              Assign
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
    </AdminLayout>
  );
};

export default AdminWorkoutBuilder;
