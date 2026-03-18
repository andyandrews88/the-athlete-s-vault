import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Pencil } from 'lucide-react';

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
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [editingId, setEditingId] = useState<string | null>(null);

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
    const payload: any = { user_id: user.id, date: selectedDate };
    FIELDS.forEach(f => { if (values[f.key]) payload[f.key] = parseFloat(values[f.key]); });
    await (supabase.from('body_measurements' as any) as any).upsert(payload, { onConflict: 'user_id,date' });
    setValues(Object.fromEntries(FIELDS.map(f => [f.key, ''])) as Record<FieldKey, string>);
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
    setEditingId(null);
    setSaving(false);
    fetchEntries();
    toast({ title: 'Measurements saved ✓' });
  };

  const handleEdit = (entry: Measurement) => {
    setSelectedDate(entry.date);
    setEditingId(entry.id);
    const newVals = {} as Record<FieldKey, string>;
    FIELDS.forEach(f => {
      newVals[f.key] = entry[f.key] != null ? String(entry[f.key]) : '';
    });
    setValues(newVals);
  };

  // Get change between entry and previous
  const getEntryChange = (entry: Measurement, idx: number) => {
    if (idx >= entries.length - 1) return {};
    const prev = entries[idx + 1];
    const changes: Record<string, { diff: number; prev: number }> = {};
    FIELDS.forEach(f => {
      if (entry[f.key] != null && prev[f.key] != null) {
        changes[f.key] = { diff: entry[f.key] - prev[f.key], prev: prev[f.key] };
      }
    });
    return changes;
  };

  return (
    <div className="px-4 py-5 pb-24 space-y-5">
      {/* Input form */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
        <span className="text-[9px] font-mono tracking-wider" style={{ color: 'hsl(var(--primary))' }}>LOG MEASUREMENTS (CM)</span>
        
        {/* Date selector */}
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full h-9 rounded-lg px-2.5 text-sm font-mono"
          style={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border2))', color: 'hsl(var(--text))', borderRadius: 6 }}
        />

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
          {saving ? 'Saving...' : editingId ? 'Update' : 'Save'}
        </button>
      </div>

      {/* History */}
      <div>
        <span className="text-[9px] font-mono tracking-wider block mb-2" style={{ color: 'hsl(var(--primary))' }}>HISTORY</span>
        {entries.map((e, idx) => {
          const changes = getEntryChange(e, idx);
          return (
            <div key={e.id} className="rounded-xl p-3 mb-2" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold" style={{ color: 'hsl(var(--text))' }}>
                  {format(new Date(e.date), 'dd MMM yyyy')}
                </span>
                <button onClick={() => handleEdit(e)} style={{ color: 'hsl(var(--dim))' }}>
                  <Pencil size={12} />
                </button>
              </div>
              <div className="space-y-1">
                {FIELDS.map(f => {
                  if (e[f.key] == null) return null;
                  const change = changes[f.key];
                  const diff = change?.diff;
                  return (
                    <div key={f.key} className="flex justify-between items-center py-1 px-2 rounded-md" style={{ background: 'hsl(var(--bg3))' }}>
                      <span className="text-[9px]" style={{ color: 'hsl(var(--mid))' }}>{f.label}</span>
                      <div className="flex items-center gap-2">
                        {change && (
                          <span className="text-[7px] font-mono" style={{ color: 'hsl(var(--dim))' }}>Was {change.prev}cm</span>
                        )}
                        <span
                          className="text-[11px] font-mono font-semibold"
                          style={{
                            color: diff == null || diff === 0 ? 'hsl(var(--dim))' : diff < 0 ? 'hsl(var(--ok))' : 'hsl(var(--primary))',
                          }}
                        >
                          {e[f.key]}cm{diff != null && diff !== 0 ? (diff < 0 ? ' ↓' : ' ↑') : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {entries.length === 0 && <p className="text-xs text-center py-6" style={{ color: 'hsl(var(--dim))' }}>No entries yet</p>}
      </div>
    </div>
  );
};

export default MeasurementsTab;
