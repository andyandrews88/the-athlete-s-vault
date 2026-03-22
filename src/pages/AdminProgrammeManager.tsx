import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { toast } from '@/hooks/use-toast';
import { ChevronDown, ChevronUp, Save, Plus, Trash2, Play } from 'lucide-react';
import { ExerciseSearch } from '@/components/train/ExerciseSearch';

interface ProgrammeTemplate {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  who_its_for: string | null;
  what_to_expect: string | null;
  sample_week: { day: string; focus: string }[] | null;
  days_per_week: number;
  duration_weeks: number;
  difficulty: string;
  tags: string[] | null;
  is_active: boolean;
  required_tier: string;
  display_order: number;
  video_url: string | null;
}

interface ProgrammeWorkout {
  id: string;
  template_id: string;
  week_number: number;
  day_number: number;
  name: string;
  prescribed_exercises: any[];
}

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };
const bebas: React.CSSProperties = { fontFamily: "'Bebas Neue', cursive" };
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const extractYouTubeId = (url: string): string | null => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/);
  return match ? match[1] : null;
};

const AdminProgrammeManager = () => {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['adminProgrammeTemplates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programme_templates')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return (data || []) as unknown as ProgrammeTemplate[];
    },
  });

  return (
    <AdminLayout>
      <div style={{ padding: '12px 16px', paddingTop: 60 }}>
        <h1 style={{ ...bebas, fontSize: 28, color: 'hsl(var(--text))', letterSpacing: 2, marginBottom: 16 }}>
          PROGRAMME MANAGER
        </h1>

        {isLoading ? (
          <p style={{ ...mono, fontSize: 11, color: 'hsl(var(--dim))' }}>Loading...</p>
        ) : (
          templates.map(t => (
            <TemplateEditor
              key={t.id}
              template={t}
              isExpanded={expandedId === t.id}
              onToggle={() => setExpandedId(expandedId === t.id ? null : t.id)}
              onSaved={() => queryClient.invalidateQueries({ queryKey: ['adminProgrammeTemplates'] })}
            />
          ))
        )}
      </div>
    </AdminLayout>
  );
};

/* ─── Template Editor ─── */
const TemplateEditor = ({
  template, isExpanded, onToggle, onSaved,
}: {
  template: ProgrammeTemplate; isExpanded: boolean; onToggle: () => void; onSaved: () => void;
}) => {
  const [form, setForm] = useState({ ...template });
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'details' | 'workouts'>('details');

  const sampleWeek = (form.sample_week || DAYS.map(d => ({ day: d, focus: '' }))) as { day: string; focus: string }[];
  const fullWeek = DAYS.map(d => sampleWeek.find(s => s.day === d) || { day: d, focus: '' });

  const videoId = form.video_url ? extractYouTubeId(form.video_url) : null;

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('programme_templates')
      .update({
        name: form.name, tagline: form.tagline, description: form.description,
        who_its_for: form.who_its_for, what_to_expect: form.what_to_expect,
        days_per_week: form.days_per_week, duration_weeks: form.duration_weeks,
        difficulty: form.difficulty, tags: form.tags, display_order: form.display_order,
        required_tier: form.required_tier, is_active: form.is_active,
        sample_week: fullWeek, video_url: form.video_url,
      } as any)
      .eq('id', template.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message });
    } else {
      toast({ title: 'Saved', description: `${form.name} updated.` });
      onSaved();
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))',
    borderRadius: 8, padding: '8px 12px', color: 'hsl(var(--text))',
    fontFamily: 'Inter, sans-serif', fontSize: 13,
  };
  const labelStyle: React.CSSProperties = {
    ...mono, fontSize: 9, color: 'hsl(var(--dim))', textTransform: 'uppercase',
    letterSpacing: 1, marginBottom: 4, display: 'block',
  };

  return (
    <div style={{
      background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))',
      borderRadius: 12, marginBottom: 10, overflow: 'hidden',
    }}>
      <button onClick={onToggle} className="w-full flex items-center justify-between" style={{ padding: '14px 16px' }}>
        <div className="text-left">
          <span style={{ ...bebas, fontSize: 20, color: 'hsl(var(--text))', letterSpacing: 1 }}>{template.name.toUpperCase()}</span>
          <span style={{ ...mono, fontSize: 8, color: template.is_active ? 'hsl(var(--ok))' : 'hsl(var(--dim))', marginLeft: 8 }}>
            {template.is_active ? 'ACTIVE' : 'INACTIVE'}
          </span>
        </div>
        {isExpanded ? <ChevronUp size={16} style={{ color: 'hsl(var(--dim))' }} /> : <ChevronDown size={16} style={{ color: 'hsl(var(--dim))' }} />}
      </button>

      {isExpanded && (
        <div style={{ padding: '0 16px 16px' }}>
          {/* Section tabs */}
          <div className="flex gap-2 mb-4">
            {(['details', 'workouts'] as const).map(s => (
              <button key={s} onClick={() => setActiveSection(s)} style={{
                ...mono, fontSize: 9, fontWeight: 700, padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: activeSection === s ? 'hsl(var(--primary))' : 'hsl(var(--bg3))',
                color: activeSection === s ? 'hsl(220,16%,6%)' : 'hsl(var(--dim))',
              }}>
                {s.toUpperCase()}
              </button>
            ))}
          </div>

          {activeSection === 'details' && (
            <div className="space-y-4">
              <Field label="Name" value={form.name} onChange={v => setForm({ ...form, name: v })} inputStyle={inputStyle} labelStyle={labelStyle} />
              <Field label="Tagline" value={form.tagline || ''} onChange={v => setForm({ ...form, tagline: v })} inputStyle={inputStyle} labelStyle={labelStyle} />

              {/* Video URL */}
              <div>
                <label style={labelStyle}>YouTube URL</label>
                <input
                  value={form.video_url || ''}
                  onChange={e => setForm({ ...form, video_url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                  style={inputStyle}
                />
                {videoId && (
                  <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', aspectRatio: '16/9', maxWidth: 300 }}>
                    <img
                      src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                      alt="Video thumbnail"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div>
                <label style={labelStyle}>Who It's For</label>
                <textarea value={form.who_its_for || ''} onChange={e => setForm({ ...form, who_its_for: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div>
                <label style={labelStyle}>What To Expect</label>
                <textarea value={form.what_to_expect || ''} onChange={e => setForm({ ...form, what_to_expect: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Days/Week" value={String(form.days_per_week)} onChange={v => setForm({ ...form, days_per_week: parseInt(v) || 5 })} inputStyle={inputStyle} labelStyle={labelStyle} type="number" />
                <Field label="Weeks" value={String(form.duration_weeks)} onChange={v => setForm({ ...form, duration_weeks: parseInt(v) || 12 })} inputStyle={inputStyle} labelStyle={labelStyle} type="number" />
                <Field label="Difficulty" value={form.difficulty} onChange={v => setForm({ ...form, difficulty: v })} inputStyle={inputStyle} labelStyle={labelStyle} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Display Order" value={String(form.display_order)} onChange={v => setForm({ ...form, display_order: parseInt(v) || 0 })} inputStyle={inputStyle} labelStyle={labelStyle} type="number" />
                <Field label="Required Tier" value={form.required_tier} onChange={v => setForm({ ...form, required_tier: v })} inputStyle={inputStyle} labelStyle={labelStyle} />
              </div>

              <Field label="Tags (comma separated)" value={(form.tags || []).join(', ')} onChange={v => setForm({ ...form, tags: v.split(',').map(s => s.trim()).filter(Boolean) })} inputStyle={inputStyle} labelStyle={labelStyle} />

              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} style={{ accentColor: 'hsl(var(--primary))' }} />
                <span style={{ ...mono, fontSize: 10, color: 'hsl(var(--text))' }}>Active</span>
              </div>

              {/* Sample week */}
              <div>
                <label style={labelStyle}>Sample Week</label>
                <div className="space-y-1">
                  {fullWeek.map((d, i) => (
                    <div key={d.day} className="flex items-center gap-2">
                      <span style={{ ...mono, fontSize: 9, color: 'hsl(var(--primary))', width: 80, flexShrink: 0, fontWeight: 600 }}>{d.day}</span>
                      <input
                        value={d.focus}
                        onChange={e => {
                          const updated = [...fullWeek];
                          updated[i] = { ...d, focus: e.target.value };
                          setForm({ ...form, sample_week: updated });
                        }}
                        style={{ ...inputStyle, padding: '6px 10px', fontSize: 12 }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleSave} disabled={saving} className="flex items-center justify-center gap-2"
                style={{ width: '100%', background: 'hsl(var(--primary))', color: 'hsl(220,16%,6%)', fontWeight: 700, fontSize: 12, padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
                <Save size={14} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          {activeSection === 'workouts' && (
            <WorkoutBuilder templateId={template.id} durationWeeks={template.duration_weeks} />
          )}
        </div>
      )}
    </div>
  );
};

/* ─── Workout Builder ─── */
const WorkoutBuilder = ({ templateId, durationWeeks }: { templateId: string; durationWeeks: number }) => {
  const queryClient = useQueryClient();
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [editingWorkout, setEditingWorkout] = useState<ProgrammeWorkout | null>(null);
  const [showNewDay, setShowNewDay] = useState<number | null>(null);

  const { data: workouts = [] } = useQuery({
    queryKey: ['templateWorkouts', templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programme_workouts')
        .select('*')
        .eq('template_id', templateId)
        .order('week_number')
        .order('day_number');
      if (error) throw error;
      return (data || []) as unknown as ProgrammeWorkout[];
    },
  });

  const weekWorkouts = workouts.filter(w => w.week_number === selectedWeek);

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))',
    borderRadius: 8, padding: '8px 12px', color: 'hsl(var(--text))',
    fontFamily: 'Inter, sans-serif', fontSize: 13,
  };

  return (
    <div>
      {/* Week tabs */}
      <div style={{ overflowX: 'auto', display: 'flex', gap: 4, marginBottom: 12, paddingBottom: 4 }} className="no-scrollbar">
        {Array.from({ length: durationWeeks }, (_, i) => i + 1).map(w => (
          <button key={w} onClick={() => setSelectedWeek(w)} style={{
            ...mono, fontSize: 9, fontWeight: 700, padding: '4px 10px', borderRadius: 6, border: 'none',
            cursor: 'pointer', flexShrink: 0,
            background: selectedWeek === w ? 'hsl(var(--primary))' : 'hsl(var(--bg3))',
            color: selectedWeek === w ? 'hsl(220,16%,6%)' : 'hsl(var(--dim))',
          }}>
            W{w}
          </button>
        ))}
      </div>

      {/* Day slots */}
      <div className="space-y-2">
        {DAYS.map((day, dayIdx) => {
          const dayNum = dayIdx + 1;
          const workout = weekWorkouts.find(w => w.day_number === dayNum);
          const isEditing = editingWorkout?.week_number === selectedWeek && editingWorkout?.day_number === dayNum;
          const isCreating = showNewDay === dayNum;

          return (
            <div key={day} style={{
              background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))',
              borderRadius: 8, padding: '10px 12px',
            }}>
              <div className="flex items-center justify-between">
                <span style={{ ...mono, fontSize: 9, color: 'hsl(var(--primary))', fontWeight: 700 }}>{day}</span>
                {workout && !isEditing ? (
                  <div className="flex items-center gap-2">
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'hsl(var(--text))' }}>{workout.name}</span>
                    <span style={{ ...mono, fontSize: 8, color: 'hsl(var(--dim))' }}>
                      {workout.prescribed_exercises?.length || 0} exercises
                    </span>
                    <button onClick={() => setEditingWorkout(workout)} style={{ ...mono, fontSize: 8, color: 'hsl(var(--primary))', background: 'none', border: 'none', cursor: 'pointer' }}>
                      Edit
                    </button>
                  </div>
                ) : !workout && !isCreating ? (
                  <button onClick={() => setShowNewDay(dayNum)} style={{
                    ...mono, fontSize: 8, color: 'hsl(var(--primary))', background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <Plus size={10} /> Add Workout
                  </button>
                ) : null}
              </div>

              {(isEditing || isCreating) && (
                <WorkoutDayEditor
                  templateId={templateId}
                  weekNumber={selectedWeek}
                  dayNumber={dayNum}
                  existing={isEditing ? editingWorkout : null}
                  inputStyle={inputStyle}
                  onSaved={() => {
                    setEditingWorkout(null);
                    setShowNewDay(null);
                    queryClient.invalidateQueries({ queryKey: ['templateWorkouts', templateId] });
                  }}
                  onCancel={() => { setEditingWorkout(null); setShowNewDay(null); }}
                  onDeleted={() => {
                    setEditingWorkout(null);
                    queryClient.invalidateQueries({ queryKey: ['templateWorkouts', templateId] });
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Workout Day Editor ─── */
const WorkoutDayEditor = ({
  templateId, weekNumber, dayNumber, existing, inputStyle, onSaved, onCancel, onDeleted,
}: {
  templateId: string; weekNumber: number; dayNumber: number;
  existing: ProgrammeWorkout | null;
  inputStyle: React.CSSProperties;
  onSaved: () => void; onCancel: () => void; onDeleted: () => void;
}) => {
  const [name, setName] = useState(existing?.name || '');
  const [exercises, setExercises] = useState<any[]>(existing?.prescribed_exercises || []);
  const [showSearch, setShowSearch] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast({ title: 'Name required' }); return; }
    setSaving(true);

    if (existing) {
      await supabase.from('programme_workouts')
        .update({ name, prescribed_exercises: exercises } as any)
        .eq('id', existing.id);
    } else {
      await supabase.from('programme_workouts')
        .insert({
          template_id: templateId,
          programme_id: templateId, // backwards compat
          week_number: weekNumber,
          day_number: dayNumber,
          name,
          prescribed_exercises: exercises,
        } as any);
    }

    setSaving(false);
    toast({ title: existing ? 'Workout updated' : 'Workout created' });
    onSaved();
  };

  const handleDelete = async () => {
    if (!existing || !window.confirm('Delete this workout?')) return;
    await supabase.from('programme_workouts').delete().eq('id', existing.id);
    toast({ title: 'Workout deleted' });
    onDeleted();
  };

  return (
    <div style={{ marginTop: 8 }} className="space-y-2">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Workout name..." style={{ ...inputStyle, fontSize: 12 }} />

      {exercises.map((ex, i) => (
        <div key={i} className="flex items-center gap-2" style={{
          background: 'hsl(var(--bg2))', borderRadius: 6, padding: '6px 8px',
        }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'hsl(var(--text))', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {ex.name}
          </span>
          <input
            value={ex.sets || ''} onChange={e => { const u = [...exercises]; u[i] = { ...ex, sets: parseInt(e.target.value) || 0 }; setExercises(u); }}
            placeholder="Sets" type="number" style={{ ...inputStyle, width: 50, padding: '4px 6px', fontSize: 10, textAlign: 'center' }}
          />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'hsl(var(--dim))' }}>×</span>
          <input
            value={ex.reps || ''} onChange={e => { const u = [...exercises]; u[i] = { ...ex, reps: e.target.value }; setExercises(u); }}
            placeholder="Reps" style={{ ...inputStyle, width: 50, padding: '4px 6px', fontSize: 10, textAlign: 'center' }}
          />
          <button onClick={() => setExercises(exercises.filter((_, j) => j !== i))} style={{ color: 'hsl(var(--bad))', background: 'none', border: 'none', cursor: 'pointer' }}>
            <Trash2 size={12} />
          </button>
        </div>
      ))}

      <button onClick={() => setShowSearch(true)} style={{
        width: '100%', border: '1px dashed hsl(var(--border2))', borderRadius: 6, padding: '6px 0',
        color: 'hsl(var(--dim))', fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
        background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
      }}>
        <Plus size={10} /> Add Exercise
      </button>

      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving} style={{
          flex: 1, background: 'hsl(var(--primary))', color: 'hsl(220,16%,6%)', fontWeight: 700,
          fontSize: 10, padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
        }}>
          {saving ? 'Saving...' : existing ? 'Update Workout' : 'Save Workout'}
        </button>
        {existing && (
          <button onClick={handleDelete} style={{
            background: 'none', border: '1px solid hsl(var(--bad))', color: 'hsl(var(--bad))',
            fontSize: 10, padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
          }}>
            Delete
          </button>
        )}
        <button onClick={onCancel} style={{
          background: 'none', border: '1px solid hsl(var(--border))', color: 'hsl(var(--dim))',
          fontSize: 10, padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
        }}>
          Cancel
        </button>
      </div>

      {showSearch && (
        <ExerciseSearch
          isOpen={showSearch}
          onClose={() => setShowSearch(false)}
          onSelectExercise={(ex) => {
            setExercises([...exercises, { name: ex.name, sets: 3, reps: '8-12', notes: '' }]);
            setShowSearch(false);
          }}
          currentSection="main"
        />
      )}
    </div>
  );
};

/* ─── Field ─── */
const Field = ({
  label, value, onChange, inputStyle, labelStyle, type = 'text',
}: {
  label: string; value: string; onChange: (v: string) => void;
  inputStyle: React.CSSProperties; labelStyle: React.CSSProperties; type?: string;
}) => (
  <div>
    <label style={labelStyle}>{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} style={inputStyle} />
  </div>
);

export default AdminProgrammeManager;
