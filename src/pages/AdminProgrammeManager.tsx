import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { toast } from '@/hooks/use-toast';
import { ChevronDown, ChevronUp, Save } from 'lucide-react';

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
}

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };
const bebas: React.CSSProperties = { fontFamily: "'Bebas Neue', cursive" };

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
      return (data || []) as ProgrammeTemplate[];
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

const TemplateEditor = ({
  template,
  isExpanded,
  onToggle,
  onSaved,
}: {
  template: ProgrammeTemplate;
  isExpanded: boolean;
  onToggle: () => void;
  onSaved: () => void;
}) => {
  const [form, setForm] = useState({ ...template });
  const [saving, setSaving] = useState(false);

  const sampleWeek = (form.sample_week || DAYS.map(d => ({ day: d, focus: '' }))) as { day: string; focus: string }[];
  // Ensure all 7 days
  const fullWeek = DAYS.map(d => sampleWeek.find(s => s.day === d) || { day: d, focus: '' });

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('programme_templates')
      .update({
        name: form.name,
        tagline: form.tagline,
        description: form.description,
        who_its_for: form.who_its_for,
        what_to_expect: form.what_to_expect,
        days_per_week: form.days_per_week,
        duration_weeks: form.duration_weeks,
        difficulty: form.difficulty,
        tags: form.tags,
        display_order: form.display_order,
        required_tier: form.required_tier,
        is_active: form.is_active,
        sample_week: fullWeek,
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
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between"
        style={{ padding: '14px 16px' }}
      >
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
          <div className="space-y-4">
            <Field label="Name" value={form.name} onChange={v => setForm({ ...form, name: v })} inputStyle={inputStyle} labelStyle={labelStyle} />
            <Field label="Tagline" value={form.tagline || ''} onChange={v => setForm({ ...form, tagline: v })} inputStyle={inputStyle} labelStyle={labelStyle} />

            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                value={form.description || ''}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={labelStyle}>Who It's For</label>
              <textarea
                value={form.who_its_for || ''}
                onChange={e => setForm({ ...form, who_its_for: e.target.value })}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={labelStyle}>What To Expect</label>
              <textarea
                value={form.what_to_expect || ''}
                onChange={e => setForm({ ...form, what_to_expect: e.target.value })}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
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
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => setForm({ ...form, is_active: e.target.checked })}
                style={{ accentColor: 'hsl(var(--primary))' }}
              />
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

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center justify-center gap-2"
              style={{
                width: '100%', background: 'hsl(var(--primary))', color: 'hsl(220,16%,6%)',
                fontWeight: 700, fontSize: 12, padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
              }}
            >
              <Save size={14} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

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
