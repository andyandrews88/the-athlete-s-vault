import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { startOfWeek, format } from 'date-fns';

const QUESTIONS = [
  { key: 'wins', label: 'What went well this week?', placeholder: 'Your biggest wins, breakthroughs, or proud moments...' },
  { key: 'challenges', label: 'What challenged you?', placeholder: 'Obstacles, setbacks, or things you struggled with...' },
  { key: 'focus_next_week', label: 'What will you focus on next week?', placeholder: 'Your top priority or intention for the coming week...' },
] as const;

type QuestionKey = typeof QUESTIONS[number]['key'];

const WeeklyReflectionTab = () => {
  const { user } = useAuth();
  const [values, setValues] = useState<Record<QuestionKey, string>>({ wins: '', challenges: '', focus_next_week: '' });
  const [existingId, setExistingId] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [saving, setSaving] = useState(false);

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekLabel = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('weekly_reflections' as any)
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          setValues({ wins: data.wins || '', challenges: data.challenges || '', focus_next_week: data.focus_next_week || '' });
          setExistingId(data.id);
          setReadOnly(true);
        }
      });
  }, [user, weekStart]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    if (existingId) {
      await (supabase.from('weekly_reflections' as any) as any).update(values).eq('id', existingId);
    } else {
      const { data } = await (supabase.from('weekly_reflections' as any) as any)
        .insert({ user_id: user.id, week_start: weekStart, ...values })
        .select()
        .single();
      if (data) setExistingId(data.id);
    }
    setReadOnly(true);
    setSaving(false);
    toast({ title: 'Reflection saved ✓' });
  };

  return (
    <div className="px-4 py-5 pb-24 space-y-6">
      <div>
        <h2 className="font-display text-2xl tracking-wide" style={{ color: 'hsl(var(--text))' }}>
          Weekly Reflection
        </h2>
        <span className="text-[10px] font-mono tracking-wider" style={{ color: 'hsl(var(--dim))' }}>
          WEEK OF {weekLabel.toUpperCase()}
        </span>
      </div>

      <div className="space-y-5">
        {QUESTIONS.map((q) => (
          <div key={q.key} className="space-y-2">
            <label className="text-sm font-medium" style={{ color: 'hsl(var(--mid))' }}>
              {q.label}
            </label>
            <textarea
              value={values[q.key]}
              disabled={readOnly}
              onChange={(e) => setValues((v) => ({ ...v, [q.key]: e.target.value }))}
              placeholder={q.placeholder}
              rows={4}
              className="w-full rounded-xl p-3 text-sm resize-none disabled:opacity-60"
              style={{
                background: 'hsl(var(--bg3))',
                border: '1px solid hsl(var(--border))',
                color: 'hsl(var(--text))',
              }}
            />
          </div>
        ))}
      </div>

      {readOnly ? (
        <button
          onClick={() => setReadOnly(false)}
          className="w-full py-3 rounded-xl text-sm font-semibold tracking-wider"
          style={{ background: 'hsl(var(--bg3))', color: 'hsl(var(--primary))', border: '1px solid hsl(var(--border))' }}
        >
          Edit Reflection
        </button>
      ) : (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl text-sm font-semibold tracking-wider disabled:opacity-50"
          style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
        >
          {saving ? 'Saving...' : 'Save Reflection'}
        </button>
      )}
    </div>
  );
};

export default WeeklyReflectionTab;
