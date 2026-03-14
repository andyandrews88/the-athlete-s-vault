import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

const SLIDERS = [
  { key: 'sleep', label: 'Sleep Quality', low: 'terrible', high: 'perfect' },
  { key: 'energy', label: 'Energy Level', low: 'exhausted', high: 'fully energised' },
  { key: 'stress', label: 'Stress Level', low: 'very stressed', high: 'no stress' },
  { key: 'mood', label: 'Mood', low: 'very low', high: 'excellent' },
  { key: 'soreness', label: 'Soreness', low: 'very sore', high: 'no soreness' },
] as const;

type SliderKey = typeof SLIDERS[number]['key'];

const CheckInTab = () => {
  const { user } = useAuth();
  const [values, setValues] = useState<Record<SliderKey, number>>({
    sleep: 5, energy: 5, stress: 5, mood: 5, soreness: 5,
  });
  const [note, setNote] = useState('');
  const [existingId, setExistingId] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [saving, setSaving] = useState(false);

  const today = new Date();
  const dayName = today.toLocaleDateString('en-GB', { weekday: 'long' });
  const todayStr = today.toISOString().split('T')[0];

  useEffect(() => {
    if (!user) return;
    supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', todayStr)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setValues({
            sleep: data.sleep, energy: data.energy,
            stress: data.stress, mood: data.mood, soreness: data.soreness,
          });
          setNote(data.note || '');
          setExistingId(data.id);
          setReadOnly(true);
        }
      });
  }, [user, todayStr]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    if (existingId) {
      await supabase.from('daily_checkins').update({ ...values, note }).eq('id', existingId);
    } else {
      const { data } = await supabase.from('daily_checkins').insert({
        user_id: user.id, date: todayStr, ...values, note,
      }).select().single();
      if (data) setExistingId(data.id);
    }
    setReadOnly(true);
    setSaving(false);
    toast({ title: 'Check-in saved ✓' });
  };

  return (
    <div className="px-4 py-5 pb-24 space-y-6">
      <h2 className="font-display text-2xl tracking-wide" style={{ color: 'hsl(var(--text))' }}>
        Today, {dayName}
      </h2>

      <div className="space-y-5">
        {SLIDERS.map((s) => (
          <div key={s.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'hsl(var(--mid))' }}>{s.label}</span>
              <span className="font-mono text-sm" style={{ color: 'hsl(var(--primary))' }}>
                {values[s.key]}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={values[s.key]}
              disabled={readOnly}
              onChange={(e) => setValues((v) => ({ ...v, [s.key]: Number(e.target.value) }))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer disabled:opacity-60"
              style={{
                background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${((values[s.key] - 1) / 9) * 100}%, hsl(var(--bg4)) ${((values[s.key] - 1) / 9) * 100}%, hsl(var(--bg4)) 100%)`,
                accentColor: 'hsl(var(--primary))',
              }}
            />
            <div className="flex justify-between text-[10px]" style={{ color: 'hsl(var(--dim))' }}>
              <span>{s.low}</span>
              <span>{s.high}</span>
            </div>
          </div>
        ))}
      </div>

      <textarea
        value={note}
        disabled={readOnly}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note..."
        rows={3}
        className="w-full rounded-[12px] p-3 text-sm resize-none disabled:opacity-60"
        style={{
          background: 'hsl(var(--bg3))',
          border: '1px solid hsl(var(--border))',
          color: 'hsl(var(--text))',
        }}
      />

      {readOnly ? (
        <button
          onClick={() => setReadOnly(false)}
          className="w-full py-3 rounded-[12px] text-sm font-semibold tracking-wider"
          style={{ background: 'hsl(var(--bg3))', color: 'hsl(var(--primary))', border: '1px solid hsl(var(--border))' }}
        >
          Edit Check-In
        </button>
      ) : (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-[12px] text-sm font-semibold tracking-wider disabled:opacity-50"
          style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
        >
          {saving ? 'Saving...' : 'Save Check-In'}
        </button>
      )}
    </div>
  );
};

export default CheckInTab;
