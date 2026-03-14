import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const FIELDS = [
  { key: 'waist_cm', label: 'Waist' },
  { key: 'hips_cm', label: 'Hips' },
  { key: 'chest_cm', label: 'Chest' },
  { key: 'left_arm_cm', label: 'Left Arm' },
  { key: 'right_arm_cm', label: 'Right Arm' },
  { key: 'left_thigh_cm', label: 'Left Thigh' },
  { key: 'right_thigh_cm', label: 'Right Thigh' },
  { key: 'neck_cm', label: 'Neck' },
] as const;

type FieldKey = typeof FIELDS[number]['key'];

interface Measurement { id: string; date: string; [key: string]: any; }

const MeasurementsTab = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Measurement[]>([]);
  const [values, setValues] = useState<Record<FieldKey, string>>(
    Object.fromEntries(FIELDS.map(f => [f.key, ''])) as Record<FieldKey, string>
  );
  const [saving, setSaving] = useState(false);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('body_measurements' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(20);
    setEntries((data as any) ?? []);
  }, [user]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleSave = async () => {
    if (!user) return;
    const hasAny = Object.values(values).some(v => v !== '');
    if (!hasAny) return;
    setSaving(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    const payload: any = { user_id: user.id, date: today };
    FIELDS.forEach(f => { if (values[f.key]) payload[f.key] = parseFloat(values[f.key]); });
    await (supabase.from('body_measurements' as any) as any).upsert(payload, { onConflict: 'user_id,date' });
    setValues(Object.fromEntries(FIELDS.map(f => [f.key, ''])) as Record<FieldKey, string>);
    setSaving(false);
    fetchEntries();
    toast({ title: 'Measurements saved ✓' });
  };

  // Compute change from previous entry
  const getChange = (key: string): string | null => {
    if (entries.length < 2) return null;
    const curr = entries[0]?.[key];
    const prev = entries[1]?.[key];
    if (curr == null || prev == null) return null;
    const diff = curr - prev;
    return diff === 0 ? '—' : `${diff > 0 ? '+' : ''}${diff.toFixed(1)}`;
  };

  return (
    <div className="px-4 py-5 pb-24 space-y-5">
      {/* Input form */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
        <span className="text-[9px] font-mono tracking-wider" style={{ color: 'hsl(var(--primary))' }}>LOG MEASUREMENTS (CM)</span>
        <div className="grid grid-cols-2 gap-3">
          {FIELDS.map(f => (
            <div key={f.key} className="space-y-1">
              <label className="text-[10px] font-mono" style={{ color: 'hsl(var(--dim))' }}>{f.label}</label>
              <input
                type="number" step="0.1" placeholder="—"
                value={values[f.key]} onChange={(e) => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                className="w-full h-9 rounded-lg px-2.5 text-sm font-mono"
                style={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text))' }}
              />
            </div>
          ))}
        </div>
        <button
          onClick={handleSave} disabled={saving}
          className="w-full py-2.5 rounded-xl text-xs font-semibold tracking-wider disabled:opacity-50"
          style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Latest vs previous */}
      {entries.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
          <span className="text-[9px] font-mono tracking-wider block mb-3" style={{ color: 'hsl(var(--primary))' }}>
            LATEST — {format(new Date(entries[0].date), 'dd MMM yyyy')}
          </span>
          <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
            {FIELDS.map(f => {
              const val = entries[0]?.[f.key];
              const change = getChange(f.key);
              return val != null ? (
                <div key={f.key} className="flex justify-between items-center">
                  <span className="text-[10px] font-mono" style={{ color: 'hsl(var(--dim))' }}>{f.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-semibold" style={{ color: 'hsl(var(--text))' }}>{val}</span>
                    {change && <span className="text-[9px] font-mono" style={{ color: 'hsl(var(--mid))' }}>{change}</span>}
                  </div>
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* History */}
      <div>
        <span className="text-[9px] font-mono tracking-wider block mb-2" style={{ color: 'hsl(var(--primary))' }}>HISTORY</span>
        {entries.slice(0, 10).map(e => (
          <div key={e.id} className="py-2 px-3 mb-1.5 rounded-lg" style={{ background: 'hsl(var(--bg2))' }}>
            <span className="text-[10px] font-mono block mb-1" style={{ color: 'hsl(var(--dim))' }}>{format(new Date(e.date), 'dd MMM yyyy')}</span>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5">
              {FIELDS.map(f => e[f.key] != null && (
                <span key={f.key} className="text-[10px] font-mono" style={{ color: 'hsl(var(--mid))' }}>
                  {f.label}: <span style={{ color: 'hsl(var(--text))' }}>{e[f.key]}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
        {entries.length === 0 && <p className="text-xs text-center py-6" style={{ color: 'hsl(var(--dim))' }}>No entries yet</p>}
      </div>
    </div>
  );
};

export default MeasurementsTab;
