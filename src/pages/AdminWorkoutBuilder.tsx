import { useEffect, useState, useRef, useCallback, DragEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Search, X, Copy, Clipboard, Trash2, ChevronLeft, ChevronRight, GripVertical, MoreVertical } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };
const bebas: React.CSSProperties = { fontFamily: "'Bebas Neue', cursive" };

const DAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const pipColor: Record<string, string> = {
  Hinge: 'hsl(0,72%,51%)', Squat: 'hsl(262,60%,55%)', Push: 'hsl(192,91%,54%)',
  Pull: 'hsl(142,71%,45%)', 'Single Leg': 'hsl(38,92%,50%)', Carry: 'hsl(38,92%,50%)',
  Core: 'hsl(215,14%,50%)', Olympic: 'hsl(45,93%,58%)', Conditioning: 'hsl(38,92%,50%)',
  Isolation: 'hsl(215,14%,50%)', Plyometric: 'hsl(0,72%,51%)', Rotational: 'hsl(215,14%,50%)',
};

interface Template { id: string; name: string; duration_weeks: number | null; days_per_week: number | null; }
interface ExerciseResult { id: string; name: string; movement_pattern: string | null; muscle_group: string | null; difficulty_coefficient: number | null; }
interface SetData { set_num: number; reps: number | null; weight_kg: number | null; rir: number | null; }
interface PrescribedExercise {
  exercise_id: string; name: string; movement_pattern: string; section: string;
  sets: number; set_data: SetData[]; tempo: string | null; coach_notes: string | null;
  superset_group: string | null; order: number;
}
interface DayWorkout {
  id?: string; name: string; day_number: number; week_number: number;
  prescribed_exercises: PrescribedExercise[]; day_notes?: string;
}

const AdminWorkoutBuilder = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [weekWorkouts, setWeekWorkouts] = useState<DayWorkout[]>([]);
  const [weekNotes, setWeekNotes] = useState('');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [clipboard, setClipboard] = useState<DayWorkout | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);

  // Day editor state
  const [editorWorkout, setEditorWorkout] = useState<DayWorkout | null>(null);
  const [activeSection, setActiveSection] = useState<'warmup' | 'main' | 'cooldown'>('main');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ExerciseResult[]>([]);
  const [saving, setSaving] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  const maxWeeks = selectedTemplate?.duration_weeks || 12;

  // Load templates
  useEffect(() => {
    supabase.from('programme_templates').select('id, name, duration_weeks, days_per_week').eq('is_active', true).order('display_order')
      .then(({ data }) => {
        setTemplates(data || []);
        if (data && data.length > 0 && !selectedTemplateId) setSelectedTemplateId(data[0].id);
      });
  }, []);

  // Load week workouts
  useEffect(() => {
    if (!selectedTemplateId) return;
    supabase.from('programme_workouts').select('id, name, day_number, week_number, prescribed_exercises')
      .eq('template_id', selectedTemplateId).eq('week_number', currentWeek)
      .then(({ data }) => {
        setWeekWorkouts((data || []).map(d => ({
          id: d.id, name: d.name, day_number: d.day_number,
          week_number: d.week_number ?? currentWeek,
          prescribed_exercises: (d.prescribed_exercises as any as PrescribedExercise[]) || [],
        })));
      });
    // Load week notes
    supabase.from('programme_weeks').select('notes')
      .eq('template_id', selectedTemplateId).eq('week_number', currentWeek).maybeSingle()
      .then(({ data }) => setWeekNotes(data?.notes || ''));
  }, [selectedTemplateId, currentWeek]);

  const getWorkoutForDay = (day: number) => weekWorkouts.find(w => w.day_number === day);

  const weekStats = {
    sessions: weekWorkouts.length,
    exercises: weekWorkouts.reduce((sum, w) => sum + (w.prescribed_exercises?.length || 0), 0),
  };

  // Save week notes on blur
  const saveWeekNotes = async () => {
    if (!selectedTemplateId) return;
    await supabase.from('programme_weeks').upsert({
      template_id: selectedTemplateId, week_number: currentWeek, notes: weekNotes,
    }, { onConflict: 'template_id,week_number' });
  };

  // Copy week
  const copyWeek = async () => {
    const target = prompt(`Copy Week ${currentWeek} to which week? (1-${maxWeeks})`);
    if (!target) return;
    const targetWeek = parseInt(target);
    if (isNaN(targetWeek) || targetWeek < 1 || targetWeek > maxWeeks || targetWeek === currentWeek) {
      toast.error('Invalid week number'); return;
    }
    // Delete existing workouts in target week
    await supabase.from('programme_workouts').delete()
      .eq('template_id', selectedTemplateId!).eq('week_number', targetWeek);
    // Copy
    for (const w of weekWorkouts) {
      await supabase.from('programme_workouts').insert({
        programme_id: selectedTemplateId!, template_id: selectedTemplateId!, week_number: targetWeek,
        day_number: w.day_number, name: w.name,
        prescribed_exercises: w.prescribed_exercises as any,
      });
    }
    toast.success(`Copied to Week ${targetWeek}`);
  };

  // Drag & drop
  const handleDragStart = (e: DragEvent, day: number) => {
    e.dataTransfer.setData('text/plain', String(day));
  };
  const handleDragOver = (e: DragEvent, day: number) => {
    e.preventDefault();
    setDragOverDay(day);
  };
  const handleDrop = async (e: DragEvent, targetDay: number) => {
    e.preventDefault();
    setDragOverDay(null);
    const sourceDay = parseInt(e.dataTransfer.getData('text/plain'));
    if (sourceDay === targetDay) return;
    const sourceWorkout = getWorkoutForDay(sourceDay);
    if (!sourceWorkout?.id) return;
    await supabase.from('programme_workouts').update({ day_number: targetDay }).eq('id', sourceWorkout.id);
    // Refresh
    setWeekWorkouts(prev => prev.map(w => w.id === sourceWorkout.id ? { ...w, day_number: targetDay } : w));
    toast.success('Workout moved');
  };

  // Copy/paste workout
  const copyWorkout = (day: number) => {
    const w = getWorkoutForDay(day);
    if (w) { setClipboard(w); toast.success('Workout copied'); }
  };
  const pasteWorkout = async (day: number) => {
    if (!clipboard || !selectedTemplateId) return;
    const { error } = await supabase.from('programme_workouts').insert({
      programme_id: selectedTemplateId!, template_id: selectedTemplateId, week_number: currentWeek,
      day_number: day, name: clipboard.name,
      prescribed_exercises: clipboard.prescribed_exercises as any,
    });
    if (!error) {
      toast.success('Workout pasted');
      // Refresh
      const { data } = await supabase.from('programme_workouts').select('id, name, day_number, week_number, prescribed_exercises')
        .eq('template_id', selectedTemplateId).eq('week_number', currentWeek);
      setWeekWorkouts((data || []).map(d => ({
        id: d.id, name: d.name, day_number: d.day_number,
        week_number: d.week_number ?? currentWeek,
        prescribed_exercises: (d.prescribed_exercises as any as PrescribedExercise[]) || [],
      })));
    }
  };

  const deleteWorkout = async (day: number) => {
    const w = getWorkoutForDay(day);
    if (!w?.id) return;
    if (!confirm('Delete this workout?')) return;
    await supabase.from('programme_workouts').delete().eq('id', w.id);
    setWeekWorkouts(prev => prev.filter(x => x.id !== w.id));
    toast.success('Workout deleted');
  };

  // Open day editor
  const openDay = (day: number) => {
    setSelectedDay(day);
    const existing = getWorkoutForDay(day);
    setEditorWorkout(existing ? { ...existing, prescribed_exercises: [...(existing.prescribed_exercises || []).map(e => ({ ...e, set_data: [...(e.set_data || [])] }))] }
      : { name: '', day_number: day, week_number: currentWeek, prescribed_exercises: [], day_notes: '' });
    setActiveSection('main');
  };

  const closeEditor = () => { setSelectedDay(null); setEditorWorkout(null); };

  // Exercise search
  const handleSearch = (q: string) => {
    setSearchQuery(q);
    clearTimeout(searchTimerRef.current);
    if (q.length < 1) { setSearchResults([]); return; }
    searchTimerRef.current = setTimeout(async () => {
      const { data } = await supabase.from('exercises').select('id, name, movement_pattern, muscle_group, difficulty_coefficient')
        .ilike('name', `%${q}%`).limit(8);
      setSearchResults(data || []);
    }, 150);
  };

  const addExercise = (ex: ExerciseResult) => {
    if (!editorWorkout) return;
    const order = editorWorkout.prescribed_exercises.length;
    const newEx: PrescribedExercise = {
      exercise_id: ex.id, name: ex.name, movement_pattern: ex.movement_pattern || '',
      section: activeSection, sets: 3,
      set_data: [{ set_num: 1, reps: 8, weight_kg: null, rir: null }, { set_num: 2, reps: 8, weight_kg: null, rir: null }, { set_num: 3, reps: 8, weight_kg: null, rir: null }],
      tempo: null, coach_notes: null, superset_group: null, order,
    };
    setEditorWorkout({ ...editorWorkout, prescribed_exercises: [...editorWorkout.prescribed_exercises, newEx] });
    setSearchQuery(''); setSearchResults([]);
  };

  const updateExercise = (idx: number, updates: Partial<PrescribedExercise>) => {
    if (!editorWorkout) return;
    const exs = [...editorWorkout.prescribed_exercises];
    exs[idx] = { ...exs[idx], ...updates };
    setEditorWorkout({ ...editorWorkout, prescribed_exercises: exs });
  };

  const removeExercise = (idx: number) => {
    if (!editorWorkout) return;
    const exs = editorWorkout.prescribed_exercises.filter((_, i) => i !== idx);
    setEditorWorkout({ ...editorWorkout, prescribed_exercises: exs });
  };

  const moveExercise = (idx: number, dir: -1 | 1) => {
    if (!editorWorkout) return;
    const exs = [...editorWorkout.prescribed_exercises];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= exs.length) return;
    [exs[idx], exs[newIdx]] = [exs[newIdx], exs[idx]];
    exs.forEach((e, i) => e.order = i);
    setEditorWorkout({ ...editorWorkout, prescribed_exercises: exs });
  };

  const addSet = (exIdx: number) => {
    if (!editorWorkout) return;
    const exs = [...editorWorkout.prescribed_exercises];
    const ex = { ...exs[exIdx] };
    const lastSet = ex.set_data[ex.set_data.length - 1];
    ex.set_data = [...ex.set_data, { set_num: ex.set_data.length + 1, reps: lastSet?.reps || 8, weight_kg: lastSet?.weight_kg, rir: lastSet?.rir }];
    ex.sets = ex.set_data.length;
    exs[exIdx] = ex;
    setEditorWorkout({ ...editorWorkout, prescribed_exercises: exs });
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    if (!editorWorkout) return;
    const exs = [...editorWorkout.prescribed_exercises];
    const ex = { ...exs[exIdx] };
    ex.set_data = ex.set_data.filter((_, i) => i !== setIdx).map((s, i) => ({ ...s, set_num: i + 1 }));
    ex.sets = ex.set_data.length;
    exs[exIdx] = ex;
    setEditorWorkout({ ...editorWorkout, prescribed_exercises: exs });
  };

  const updateSet = (exIdx: number, setIdx: number, field: keyof SetData, value: number | null) => {
    if (!editorWorkout) return;
    const exs = [...editorWorkout.prescribed_exercises];
    const ex = { ...exs[exIdx] };
    ex.set_data = ex.set_data.map((s, i) => i === setIdx ? { ...s, [field]: value } : s);
    exs[exIdx] = ex;
    setEditorWorkout({ ...editorWorkout, prescribed_exercises: exs });
  };

  // Save workout
  const saveWorkout = async () => {
    if (!editorWorkout || !selectedTemplateId) return;
    if (!editorWorkout.name.trim()) { toast.error('Enter a workout name'); return; }
    setSaving(true);
    const payload = {
      template_id: selectedTemplateId,
      week_number: currentWeek,
      day_number: editorWorkout.day_number,
      name: editorWorkout.name,
      prescribed_exercises: editorWorkout.prescribed_exercises.map((e, i) => ({ ...e, order: i })) as any,
    };

    let error: any;
    if (editorWorkout.id) {
      ({ error } = await supabase.from('programme_workouts').update(payload).eq('id', editorWorkout.id));
    } else {
      ({ error } = await supabase.from('programme_workouts').insert({ ...payload, programme_id: selectedTemplateId }));
    }

    if (error) { toast.error(error.message); setSaving(false); return; }

    // Sync to active client programmes
    const { data: activeProgs } = await supabase.from('training_programmes')
      .select('id').eq('template_id', selectedTemplateId).eq('is_active', true);
    const syncCount = activeProgs?.length || 0;

    toast.success(`Saved ✓${syncCount > 0 ? ` · Synced to ${syncCount} client${syncCount > 1 ? 's' : ''}` : ''}`);

    // Refresh
    const { data } = await supabase.from('programme_workouts').select('id, name, day_number, week_number, prescribed_exercises')
      .eq('template_id', selectedTemplateId).eq('week_number', currentWeek);
    setWeekWorkouts((data || []).map(d => ({
      id: d.id, name: d.name, day_number: d.day_number,
      week_number: d.week_number ?? currentWeek,
      prescribed_exercises: (d.prescribed_exercises as any as PrescribedExercise[]) || [],
    })));
    setSaving(false);
    closeEditor();
  };

  const sectionExercises = editorWorkout?.prescribed_exercises.filter(e => e.section === activeSection) || [];
  const sectionIndices = editorWorkout?.prescribed_exercises
    .map((e, i) => ({ ...e, _idx: i }))
    .filter(e => e.section === activeSection) || [];

  const cellBase: React.CSSProperties = {
    ...mono, background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))',
    borderRadius: 5, padding: '3px 6px', fontSize: 10, textAlign: 'center',
    width: '100%', outline: 'none', color: 'hsl(var(--text))',
  };

  // ─── RENDER ───
  return (
    <AdminLayout>
      <div style={{ minHeight: '100vh', background: 'hsl(var(--bg))' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid hsl(var(--border))' }}>
          <span style={{ ...bebas, fontSize: 24, color: 'hsl(var(--text))' }}>WORKOUT BUILDER</span>
          <span style={{ ...mono, fontSize: 8, padding: '2px 8px', borderRadius: 4, background: 'hsla(192,91%,54%,0.1)', color: 'hsl(var(--primary))', border: '1px solid hsla(192,91%,54%,0.2)', textTransform: 'uppercase', letterSpacing: 1 }}>ADMIN</span>
        </div>

        <div style={{ display: 'flex', height: 'calc(100vh - 53px)' }}>
          {/* ─── LEFT COLUMN ─── */}
          <div style={{ width: isMobile ? '100%' : 240, flexShrink: 0, borderRight: isMobile ? 'none' : '1px solid hsl(var(--border))', padding: 16, overflowY: 'auto', display: (isMobile && selectedDay !== null) ? 'none' : 'block' }}>
            {/* Programme selector */}
            <label style={{ ...mono, fontSize: 8, color: 'hsl(var(--dim))', textTransform: 'uppercase', letterSpacing: 1 }}>PROGRAMME</label>
            <select
              value={selectedTemplateId || ''}
              onChange={e => { setSelectedTemplateId(e.target.value); setCurrentWeek(1); }}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text))', fontSize: 12, outline: 'none', marginTop: 4, marginBottom: 16 }}
            >
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>

            {/* Week navigation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <button onClick={() => setCurrentWeek(w => Math.max(1, w - 1))} style={{ background: 'none', border: 'none', color: 'hsl(var(--dim))', cursor: 'pointer', padding: 4 }}>
                <ChevronLeft size={16} />
              </button>
              <span style={{ ...mono, fontSize: 10, background: 'hsl(var(--primary))', color: 'hsl(220,16%,6%)', borderRadius: 6, padding: '4px 12px', fontWeight: 700 }}>
                WEEK {currentWeek}
              </span>
              <button onClick={() => setCurrentWeek(w => Math.min(maxWeeks, w + 1))} style={{ background: 'none', border: 'none', color: 'hsl(var(--dim))', cursor: 'pointer', padding: 4 }}>
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Week notes */}
            <label style={{ ...mono, fontSize: 8, color: 'hsl(var(--dim))', textTransform: 'uppercase', letterSpacing: 1 }}>WEEK NOTES</label>
            <textarea
              value={weekNotes}
              onChange={e => setWeekNotes(e.target.value)}
              onBlur={saveWeekNotes}
              placeholder="Focus for this week..."
              style={{ width: '100%', minHeight: 80, background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))', borderRadius: 8, padding: 10, fontSize: 12, color: 'hsl(var(--text))', resize: 'vertical', outline: 'none', marginTop: 4, marginBottom: 16 }}
            />

            {/* Week stats */}
            <label style={{ ...mono, fontSize: 8, color: 'hsl(var(--dim))', textTransform: 'uppercase', letterSpacing: 1 }}>WEEK STATS</label>
            <div style={{ display: 'flex', gap: 16, marginTop: 6, marginBottom: 16 }}>
              <div>
                <div style={{ ...mono, fontSize: 20, color: 'hsl(var(--primary))', fontWeight: 700 }}>{weekStats.sessions}</div>
                <div style={{ ...mono, fontSize: 8, color: 'hsl(var(--dim))' }}>SESSIONS</div>
              </div>
              <div>
                <div style={{ ...mono, fontSize: 20, color: 'hsl(var(--primary))', fontWeight: 700 }}>{weekStats.exercises}</div>
                <div style={{ ...mono, fontSize: 8, color: 'hsl(var(--dim))' }}>EXERCISES</div>
              </div>
            </div>

            {/* Copy week */}
            <button onClick={copyWeek} style={{ width: '100%', padding: '8px 0', borderRadius: 6, background: 'transparent', border: '1px solid hsl(var(--primary) / 0.3)', color: 'hsl(var(--primary))', fontSize: 11, fontWeight: 600, cursor: 'pointer', ...mono }}>
              Copy Week →
            </button>
          </div>

          {/* ─── RIGHT COLUMN — 7-DAY GRID ─── */}
          {(!isMobile || selectedDay === null) && (
            <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: isMobile ? 'block' : 'block' }}>
              {/* Day headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 6 }}>
                {DAY_NAMES.map(d => (
                  <div key={d} style={{ ...mono, fontSize: 8, color: 'hsl(var(--dim))', textAlign: 'center', textTransform: 'uppercase' }}>{d}</div>
                ))}
              </div>

              {/* Day cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                {Array.from({ length: 7 }, (_, i) => {
                  const day = i; // 0=Mon, 6=Sun
                  const workout = getWorkoutForDay(day);
                  const isDragOver = dragOverDay === day;
                  const isSelected = selectedDay === day;

                  return (
                    <div
                      key={day}
                      draggable={!!workout}
                      onDragStart={e => handleDragStart(e, day)}
                      onDragOver={e => handleDragOver(e, day)}
                      onDragLeave={() => setDragOverDay(null)}
                      onDrop={e => handleDrop(e, day)}
                      onClick={() => openDay(day)}
                      style={{
                        minHeight: isMobile ? 80 : 160,
                        background: isSelected ? 'hsla(192,91%,54%,0.05)' : 'hsl(var(--bg2))',
                        border: `1px solid ${isDragOver ? 'hsl(var(--primary))' : isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
                        borderRadius: 8, padding: 8, cursor: 'pointer',
                        transition: 'border-color 0.15s, background 0.15s',
                        position: 'relative',
                      }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget.style.borderColor = 'hsla(192,91%,54%,0.3)'); }}
                      onMouseLeave={e => { if (!isSelected && !isDragOver) (e.currentTarget.style.borderColor = 'hsl(var(--border))'); }}
                    >
                      {workout ? (
                        <>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'hsl(var(--primary))', marginBottom: 4, lineHeight: 1.2 }}>{workout.name}</div>
                          {workout.prescribed_exercises.slice(0, 4).map((ex, ei) => (
                            <div key={ei} style={{ fontSize: 9, color: 'hsl(var(--mid))', lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              · {ex.name}
                            </div>
                          ))}
                          {workout.prescribed_exercises.length > 4 && (
                            <div style={{ ...mono, fontSize: 8, color: 'hsl(var(--dim))', marginTop: 2 }}>+{workout.prescribed_exercises.length - 4} more</div>
                          )}
                          <div style={{ ...mono, fontSize: 7, color: 'hsl(var(--dim))', marginTop: 4 }}>{workout.prescribed_exercises.length} exercises</div>

                          {/* Action icons */}
                          <div className="day-actions" style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 2 }}
                            onClick={e => e.stopPropagation()}>
                            <button onClick={() => copyWorkout(day)} style={{ background: 'none', border: 'none', color: 'hsl(var(--dim))', cursor: 'pointer', padding: 2 }} title="Copy">
                              <Copy size={12} />
                            </button>
                            <button onClick={() => deleteWorkout(day)} style={{ background: 'none', border: 'none', color: 'hsl(var(--dim))', cursor: 'pointer', padding: 2 }} title="Delete">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 4 }}>
                          {clipboard ? (
                            <button onClick={e => { e.stopPropagation(); pasteWorkout(day); }} style={{ background: 'none', border: 'none', color: 'hsl(var(--primary))', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                              <Clipboard size={16} />
                              <span style={{ ...mono, fontSize: 8 }}>Paste</span>
                            </button>
                          ) : (
                            <>
                              <span style={{ fontSize: 20, color: 'hsl(var(--border2))' }}>+</span>
                              <span style={{ fontSize: 9, color: 'hsl(var(--dim))' }}>Add workout</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── DAY EDITOR PANEL ─── */}
          {selectedDay !== null && editorWorkout && (
            <div style={{
              width: isMobile ? '100%' : 360, flexShrink: 0,
              borderLeft: isMobile ? 'none' : '1px solid hsl(var(--border))',
              background: 'hsl(var(--bg))', overflowY: 'auto',
              display: 'flex', flexDirection: 'column',
              position: isMobile ? 'fixed' : 'relative',
              top: isMobile ? 0 : undefined, left: isMobile ? 0 : undefined,
              right: isMobile ? 0 : undefined, bottom: isMobile ? 0 : undefined,
              zIndex: isMobile ? 50 : undefined,
            }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                {/* Panel header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ ...bebas, fontSize: 16, color: 'hsl(var(--primary))' }}>
                    {DAY_NAMES[editorWorkout.day_number]} · WEEK {currentWeek}
                  </span>
                  <button onClick={closeEditor} style={{ background: 'none', border: 'none', color: 'hsl(var(--dim))', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>

                {/* Workout name */}
                <input
                  value={editorWorkout.name}
                  onChange={e => setEditorWorkout({ ...editorWorkout, name: e.target.value })}
                  placeholder="Workout name..."
                  style={{ width: '100%', padding: '10px 14px', fontSize: 14, fontWeight: 600, background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border2))', borderRadius: 8, color: 'hsl(var(--text))', outline: 'none', marginBottom: 12 }}
                />

                {/* Section tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                  {(['warmup', 'main', 'cooldown'] as const).map(s => (
                    <button key={s} onClick={() => setActiveSection(s)} style={{
                      ...mono, fontSize: 9, fontWeight: 700, padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: activeSection === s ? 'hsl(var(--primary))' : 'hsl(var(--bg3))',
                      color: activeSection === s ? 'hsl(220,16%,6%)' : 'hsl(var(--dim))',
                      textTransform: 'uppercase',
                    }}>
                      {s}
                    </button>
                  ))}
                </div>

                {/* Exercise list */}
                {sectionIndices.map(ex => {
                  const idx = ex._idx;
                  return (
                    <div key={idx} style={{ marginBottom: 12 }}>
                      {/* Exercise header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <div style={{ width: 3, height: 28, borderRadius: 2, background: pipColor[ex.movement_pattern] || 'hsl(var(--primary))', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</span>
                        {ex.superset_group && (
                          <span style={{ ...mono, fontSize: 8, padding: '0.5px 4px', borderRadius: 9, background: 'hsla(38,92%,50%,0.1)', color: 'hsl(var(--warn))', border: '1px solid hsla(38,92%,50%,0.2)' }}>SS</span>
                        )}
                        <div style={{ display: 'flex', gap: 2 }}>
                          <button onClick={() => moveExercise(idx, -1)} style={{ background: 'none', border: 'none', color: 'hsl(var(--dim))', cursor: 'pointer', padding: 2 }} title="Move Up">▲</button>
                          <button onClick={() => moveExercise(idx, 1)} style={{ background: 'none', border: 'none', color: 'hsl(var(--dim))', cursor: 'pointer', padding: 2 }} title="Move Down">▼</button>
                          <button onClick={() => removeExercise(idx)} style={{ background: 'none', border: 'none', color: 'hsl(var(--dim))', cursor: 'pointer', padding: 2 }} title="Remove">
                            <X size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Set headers */}
                      <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1fr 40px 20px', gap: 4, marginBottom: 2 }}>
                        <span style={{ ...mono, fontSize: 7, color: 'hsl(var(--dim))', textTransform: 'uppercase', textAlign: 'center' }}>Set</span>
                        <span style={{ ...mono, fontSize: 7, color: 'hsl(var(--dim))', textTransform: 'uppercase', textAlign: 'center' }}>Reps</span>
                        <span style={{ ...mono, fontSize: 7, color: 'hsl(var(--dim))', textTransform: 'uppercase', textAlign: 'center' }}>Weight</span>
                        <span style={{ ...mono, fontSize: 7, color: 'hsl(var(--dim))', textTransform: 'uppercase', textAlign: 'center' }}>RIR</span>
                        <span />
                      </div>

                      {/* Set rows */}
                      {ex.set_data.map((set, si) => (
                        <div key={si} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1fr 40px 20px', gap: 4, marginBottom: 2 }}>
                          <span style={{ ...mono, fontSize: 8, color: 'hsl(var(--dim))', textAlign: 'center', lineHeight: '26px' }}>S{set.set_num}</span>
                          <input type="number" min={1} value={set.reps ?? ''} placeholder="—"
                            onChange={e => updateSet(idx, si, 'reps', e.target.value ? parseInt(e.target.value) : null)}
                            style={cellBase} />
                          <input type="number" step="0.5" value={set.weight_kg ?? ''} placeholder="—"
                            onChange={e => updateSet(idx, si, 'weight_kg', e.target.value ? parseFloat(e.target.value) : null)}
                            style={cellBase} />
                          <input type="number" min={0} max={10} value={set.rir ?? ''} placeholder="—"
                            onChange={e => updateSet(idx, si, 'rir', e.target.value ? parseInt(e.target.value) : null)}
                            style={{ ...cellBase, fontSize: 9, padding: '3px 4px' }} />
                          <button onClick={() => removeSet(idx, si)} style={{ background: 'none', border: 'none', color: 'hsl(var(--dim))', cursor: 'pointer', fontSize: 10, padding: 0 }}>×</button>
                        </div>
                      ))}

                      {/* Add set */}
                      <button onClick={() => addSet(idx)} style={{ ...mono, fontSize: 9, color: 'hsl(var(--dim))', background: 'none', border: '1px dashed hsl(var(--border))', borderRadius: 5, padding: '4px 0', width: '100%', cursor: 'pointer', marginTop: 2, marginBottom: 4 }}>
                        + Add Set
                      </button>

                      {/* Tempo */}
                      <div style={{ marginBottom: 4 }}>
                        <label style={{ ...mono, fontSize: 7, color: 'hsl(var(--dim))', textTransform: 'uppercase' }}>TEMPO</label>
                        <input value={ex.tempo || ''} placeholder="3-1-2-0"
                          onChange={e => updateExercise(idx, { tempo: e.target.value || null })}
                          style={{ ...cellBase, textAlign: 'left', padding: '4px 8px', fontSize: 11, marginTop: 2 }} />
                      </div>

                      {/* Coach notes */}
                      <div style={{ marginBottom: 4 }}>
                        <label style={{ ...mono, fontSize: 7, color: 'hsl(var(--primary))', textTransform: 'uppercase', letterSpacing: 1 }}>COACH NOTES</label>
                        <textarea value={ex.coach_notes || ''} placeholder="Coaching cues, technique notes, progressions..."
                          onChange={e => updateExercise(idx, { coach_notes: e.target.value || null })}
                          rows={2}
                          style={{ width: '100%', background: 'hsl(var(--bg3))', border: '1px solid hsla(192,91%,54%,0.2)', borderRadius: 6, padding: '6px 8px', fontSize: 11, color: 'hsl(var(--mid))', resize: 'vertical', outline: 'none', marginTop: 2, minHeight: 48 }} />
                      </div>

                      <div style={{ height: 1, background: 'hsl(var(--border))', margin: '8px 0' }} />
                    </div>
                  );
                })}

                {/* Exercise search */}
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <Search size={13} style={{ position: 'absolute', left: 10, top: 10, color: 'hsl(var(--dim))' }} />
                  <input value={searchQuery} onChange={e => handleSearch(e.target.value)}
                    placeholder="Search exercise to add..."
                    style={{ width: '100%', padding: '8px 10px 8px 30px', fontSize: 12, background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--text))', outline: 'none' }} />
                  {searchResults.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border2))', borderRadius: 8, marginTop: 4, overflow: 'hidden', maxHeight: 240, overflowY: 'auto' }}>
                      {searchResults.map(r => (
                        <button key={r.id} onClick={() => addExercise(r)}
                          style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '8px 12px', background: 'none', border: 'none', borderBottom: '1px solid hsl(var(--border))', color: 'hsl(var(--text))', cursor: 'pointer', textAlign: 'left', gap: 8 }}>
                          <div style={{ width: 3, height: 20, borderRadius: 2, background: pipColor[r.movement_pattern || ''] || 'hsl(var(--primary))', flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 500 }}>{r.name}</div>
                            <div style={{ ...mono, fontSize: 8, color: 'hsl(var(--dim))' }}>{r.muscle_group} · {r.movement_pattern}</div>
                          </div>
                          <span style={{ ...mono, fontSize: 9, color: 'hsl(var(--dim))' }}>×{r.difficulty_coefficient ?? 1}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Day notes */}
                <div>
                  <label style={{ ...mono, fontSize: 7, color: 'hsl(var(--dim))', textTransform: 'uppercase' }}>DAY NOTES</label>
                  <textarea value={editorWorkout.day_notes || ''} placeholder="General day notes..."
                    onChange={e => setEditorWorkout({ ...editorWorkout, day_notes: e.target.value })}
                    rows={2}
                    style={{ width: '100%', background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))', borderRadius: 6, padding: '6px 8px', fontSize: 11, color: 'hsl(var(--mid))', resize: 'vertical', outline: 'none', marginTop: 2 }} />
                </div>
              </div>

              {/* Sticky save */}
              <div style={{ padding: '12px 16px', borderTop: '1px solid hsl(var(--border))', background: 'hsl(var(--bg))' }}>
                <button onClick={saveWorkout} disabled={saving} style={{
                  width: '100%', padding: '12px 0', borderRadius: 8,
                  background: 'hsl(var(--primary))', color: 'hsl(220,16%,6%)',
                  fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
                  opacity: saving ? 0.6 : 1,
                }}>
                  {saving ? 'Saving...' : 'Save Workout'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminWorkoutBuilder;
