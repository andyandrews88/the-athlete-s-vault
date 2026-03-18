import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Droplets, Moon, Zap, Brain, Flame } from 'lucide-react';

/* ── Nutrition habits from Precision Nutrition ── */
const PN_HABITS = [
  'Ate slowly & mindfully',
  'Stopped at 80% full',
  'Ate lean protein with each meal',
  'Ate 5+ servings of vegetables',
  'Chose whole foods over processed',
  'Drank 2L+ of water',
  'Avoided alcohol',
] as const;

/* ── Slider config matching Master Build Doc ── */
const METRIC_SLIDERS = [
  { key: 'sleep_quality', label: 'Sleep Quality', icon: Moon, min: 1, max: 5, step: 1, lowLabel: 'terrible', highLabel: 'perfect' },
  { key: 'stress', label: 'Stress', icon: Brain, min: 1, max: 5, step: 1, lowLabel: 'very high', highLabel: 'none' },
  { key: 'energy', label: 'Energy', icon: Zap, min: 1, max: 5, step: 1, lowLabel: 'exhausted', highLabel: 'fully charged' },
  { key: 'drive', label: 'Drive / Motivation', icon: Flame, min: 1, max: 5, step: 1, lowLabel: 'zero', highLabel: 'unstoppable' },
] as const;

type MetricKey = 'sleep_quality' | 'stress' | 'energy' | 'drive';

interface CheckInValues {
  sleep_hours: number;
  sleep_quality: number;
  stress: number;
  energy: number;
  drive: number;
  hydration_litres: number;
  nutrition_habits: string[];
  note: string;
}

const DEFAULT_VALUES: CheckInValues = {
  sleep_hours: 7,
  sleep_quality: 3,
  stress: 3,
  energy: 3,
  drive: 3,
  hydration_litres: 2.0,
  nutrition_habits: [],
  note: '',
};

/* ── Readiness Score (Matthew Walker formula from spec) ── */
const calcReadiness = (v: CheckInValues): number => {
  const raw = (v.sleep_hours * 2 + v.sleep_quality + v.energy + v.drive + v.stress) / 7 * 100;
  return Math.min(Math.round(raw), 100);
};

const readinessColor = (score: number) => {
  if (score >= 80) return 'hsl(var(--ok))';
  if (score >= 60) return 'hsl(var(--warn))';
  return 'hsl(var(--bad))';
};

const CheckInTab = () => {
  const { user } = useAuth();
  const [values, setValues] = useState<CheckInValues>({ ...DEFAULT_VALUES });
  const [existingId, setExistingId] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [saving, setSaving] = useState(false);

  const today = new Date();
  const dayName = today.toLocaleDateString('en-GB', { weekday: 'long' });
  const todayStr = today.toISOString().split('T')[0];

  const readiness = useMemo(() => calcReadiness(values), [values]);

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
            sleep_hours: (data as any).sleep_hours ?? 7,
            sleep_quality: data.sleep ?? 3,
            stress: data.stress ?? 3,
            energy: data.energy ?? 3,
            drive: (data as any).drive ?? 3,
            hydration_litres: (data as any).hydration_litres ?? 2.0,
            nutrition_habits: (data as any).nutrition_habits ?? [],
            note: data.note || '',
          });
          setExistingId(data.id);
          setReadOnly(true);
        }
      });
  }, [user, todayStr]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const payload = {
      sleep: values.sleep_quality,
      energy: values.energy,
      stress: values.stress,
      mood: values.sleep_quality,
      soreness: values.drive,
      sleep_hours: values.sleep_hours,
      drive: values.drive,
      hydration_litres: values.hydration_litres,
      nutrition_habits: values.nutrition_habits,
      note: values.note,
    };

    if (existingId) {
      await supabase.from('daily_checkins').update(payload).eq('id', existingId);
    } else {
      const { data } = await supabase.from('daily_checkins').insert({
        user_id: user.id,
        date: todayStr,
        ...payload,
      }).select().single();
      if (data) setExistingId(data.id);
    }
    setReadOnly(true);
    setSaving(false);
    toast({ title: 'Check-in saved ✓' });
  };

  const updateValue = <K extends keyof CheckInValues>(key: K, val: CheckInValues[K]) => {
    setValues((v) => ({ ...v, [key]: val }));
  };

  const toggleHabit = (habit: string) => {
    setValues((v) => ({
      ...v,
      nutrition_habits: v.nutrition_habits.includes(habit)
        ? v.nutrition_habits.filter((h) => h !== habit)
        : [...v.nutrition_habits, habit],
    }));
  };

  return (
    <div className="px-4 py-5 pb-24 space-y-6">
      <h2 className="font-display text-2xl tracking-wide" style={{ color: 'hsl(var(--text))' }}>
        Today, {dayName}
      </h2>

      {/* ── Readiness Score — simple large number card ── */}
      <div
        className="text-center"
        style={{
          background: 'hsla(192,91%,54%,0.06)',
          border: '1px solid hsla(192,91%,54%,0.15)',
          borderRadius: 10,
          padding: 11,
          marginBottom: 7,
        }}
      >
        <div className="font-mono" style={{ fontSize: 8, color: 'hsl(var(--dim))', marginBottom: 3, letterSpacing: '0.1em' }}>
          Readiness Score
        </div>
        <div
          className="font-display"
          style={{
            fontSize: 42,
            letterSpacing: 2,
            lineHeight: 1,
            color: readinessColor(readiness),
          }}
        >
          {readiness}
        </div>
        <div style={{ fontSize: 7, color: 'hsl(var(--dim))', marginTop: 3 }}>
          Matthew Walker weighted formula
        </div>
      </div>

      {/* ── Sleep Hours ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon size={14} style={{ color: 'hsl(var(--primary))' }} />
            <span className="text-sm" style={{ color: 'hsl(var(--mid))' }}>Sleep Hours</span>
          </div>
          <span className="font-mono text-sm font-semibold" style={{ color: 'hsl(var(--primary))' }}>
            {values.sleep_hours}h
          </span>
        </div>
        <input
          type="range"
          min={0} max={14} step={0.5}
          value={values.sleep_hours}
          disabled={readOnly}
          onChange={(e) => updateValue('sleep_hours', Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer disabled:opacity-60"
          style={{
            background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${(values.sleep_hours / 14) * 100}%, hsl(var(--bg4)) ${(values.sleep_hours / 14) * 100}%, hsl(var(--bg4)) 100%)`,
          }}
        />
        <div className="flex justify-between text-[10px]" style={{ color: 'hsl(var(--dim))' }}>
          <span>0h</span><span>14h</span>
        </div>
      </div>

      {/* ── 1-5 Metric Sliders ── */}
      <div className="space-y-4">
        {METRIC_SLIDERS.map((s) => {
          const val = values[s.key as MetricKey];
          return (
            <div key={s.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <s.icon size={14} style={{ color: 'hsl(var(--primary))' }} />
                  <span className="text-sm" style={{ color: 'hsl(var(--mid))' }}>{s.label}</span>
                </div>
                <span className="font-mono text-sm font-semibold" style={{ color: 'hsl(var(--primary))' }}>
                  {val}/5
                </span>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    disabled={readOnly}
                    onClick={() => updateValue(s.key as MetricKey, n)}
                    className="flex-1 h-9 rounded-lg text-xs font-mono font-semibold transition-all disabled:opacity-60"
                    style={{
                      background: val === n ? 'hsl(var(--primary))' : 'hsl(var(--bg3))',
                      color: val === n ? 'hsl(var(--primary-foreground))' : 'hsl(var(--dim))',
                      border: `1px solid ${val === n ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-[10px]" style={{ color: 'hsl(var(--dim))' }}>
                <span>{s.lowLabel}</span><span>{s.highLabel}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Hydration ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets size={14} style={{ color: 'hsl(var(--primary))' }} />
            <span className="text-sm" style={{ color: 'hsl(var(--mid))' }}>Hydration</span>
          </div>
          <span className="font-mono text-sm font-semibold" style={{ color: 'hsl(var(--primary))' }}>
            {values.hydration_litres}L
          </span>
        </div>
        <input
          type="range"
          min={0} max={5} step={0.25}
          value={values.hydration_litres}
          disabled={readOnly}
          onChange={(e) => updateValue('hydration_litres', Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer disabled:opacity-60"
          style={{
            background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${(values.hydration_litres / 5) * 100}%, hsl(var(--bg4)) ${(values.hydration_litres / 5) * 100}%, hsl(var(--bg4)) 100%)`,
          }}
        />
        <div className="flex justify-between text-[10px]" style={{ color: 'hsl(var(--dim))' }}>
          <span>0L</span><span>5L</span>
        </div>
      </div>

      {/* ── Nutrition Habits Checklist ── */}
      <div className="space-y-3">
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: 'hsl(var(--primary))' }}>
          NUTRITION HABITS
        </span>
        <div
          style={{
            background: 'hsl(var(--bg2))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          {PN_HABITS.map((habit, idx) => {
            const checked = values.nutrition_habits.includes(habit);
            return (
              <button
                key={habit}
                disabled={readOnly}
                onClick={() => toggleHabit(habit)}
                className="w-full text-left disabled:opacity-60"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 12px',
                  borderBottom: idx < PN_HABITS.length - 1 ? '1px solid hsl(var(--border))' : 'none',
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 3,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    background: checked ? 'hsl(var(--ok))' : 'hsl(var(--bg3))',
                    border: checked ? 'none' : '1.5px solid hsl(var(--border2))',
                    color: checked ? 'white' : 'transparent',
                  }}
                >
                  {checked && '✓'}
                </div>
                <span
                  style={{
                    fontSize: 8,
                    color: checked ? 'hsl(var(--dim))' : 'hsl(var(--mid))',
                    textDecoration: checked ? 'line-through' : 'none',
                  }}
                >
                  {habit}
                </span>
              </button>
            );
          })}
        </div>
        <div className="text-right">
          <span className="text-[10px] font-mono" style={{ color: 'hsl(var(--dim))' }}>
            {values.nutrition_habits.length}/{PN_HABITS.length} habits
          </span>
        </div>
      </div>

      {/* ── Note ── */}
      <textarea
        value={values.note}
        disabled={readOnly}
        onChange={(e) => updateValue('note', e.target.value)}
        placeholder="Optional note..."
        rows={3}
        className="w-full rounded-xl p-3 text-sm resize-none disabled:opacity-60"
        style={{
          background: 'hsl(var(--bg3))',
          border: '1px solid hsl(var(--border))',
          color: 'hsl(var(--text))',
        }}
      />

      {/* ── Save / Edit ── */}
      {readOnly ? (
        <button
          onClick={() => setReadOnly(false)}
          className="w-full py-3 rounded-xl text-sm font-semibold tracking-wider"
          style={{ background: 'hsl(var(--bg3))', color: 'hsl(var(--primary))', border: '1px solid hsl(var(--border))' }}
        >
          Edit Check-In
        </button>
      ) : (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl text-sm font-semibold tracking-wider disabled:opacity-50"
          style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
        >
          {saving ? 'Saving...' : 'Save Check-In'}
        </button>
      )}
    </div>
  );
};

export default CheckInTab;