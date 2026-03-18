import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Pencil } from 'lucide-react';

const SCAN_FIELDS = [
  { key: 'weight_kg', label: 'Weight', unit: 'kg' },
  { key: 'skeletal_muscle_kg', label: 'Skeletal Muscle', unit: 'kg' },
  { key: 'body_fat_pct', label: 'Body Fat', unit: '%' },
  { key: 'body_fat_kg', label: 'Fat Mass', unit: 'kg' },
  { key: 'bmi', label: 'BMI', unit: '' },
  { key: 'basal_metabolic_rate', label: 'BMR', unit: 'kcal' },
  { key: 'total_body_water', label: 'Total Body Water', unit: 'L' },
] as const;

type FieldKey = typeof SCAN_FIELDS[number]['key'];

const InBodyTab = () => {
  const { user } = useAuth();
  const [scans, setScans] = useState<any[]>([]);
  const [values, setValues] = useState<Record<FieldKey, string>>(
    Object.fromEntries(SCAN_FIELDS.map(f => [f.key, ''])) as Record<FieldKey, string>
  );
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchScans = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('inbody_scans' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(20);
    setScans((data as any) ?? []);
  }, [user]);

  useEffect(() => { fetchScans(); }, [fetchScans]);

  const handleSave = async () => {
    if (!user) return;
    const hasAny = Object.values(values).some(v => v !== '');
    if (!hasAny) return;
    setSaving(true);
    const payload: any = { user_id: user.id, date: selectedDate, notes };
    SCAN_FIELDS.forEach(f => { if (values[f.key]) payload[f.key] = parseFloat(values[f.key]); });
    await (supabase.from('inbody_scans' as any) as any).upsert(payload, { onConflict: 'user_id,date' });
    setValues(Object.fromEntries(SCAN_FIELDS.map(f => [f.key, ''])) as Record<FieldKey, string>);
    setNotes('');
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
    setEditingId(null);
    setSaving(false);
    fetchScans();
    toast({ title: 'InBody scan saved ✓' });
  };

  const handleEdit = (scan: any) => {
    setSelectedDate(scan.date);
    setEditingId(scan.id);
    setNotes(scan.notes || '');
    const newVals = {} as Record<FieldKey, string>;
    SCAN_FIELDS.forEach(f => {
      newVals[f.key] = scan[f.key] != null ? String(scan[f.key]) : '';
    });
    setValues(newVals);
  };

  const getChange = (key: string): string | null => {
    if (scans.length < 2) return null;
    const curr = scans[0]?.[key];
    const prev = scans[1]?.[key];
    if (curr == null || prev == null) return null;
    const diff = curr - prev;
    return diff === 0 ? '—' : `${diff > 0 ? '+' : ''}${diff.toFixed(1)}`;
  };

  return (
    <div className="px-4 py-5 pb-24 space-y-5">
      {/* Input */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
        <span className="text-[9px] font-mono tracking-wider" style={{ color: 'hsl(var(--primary))' }}>LOG INBODY SCAN</span>
        
        {/* Date selector */}
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full h-9 rounded-lg px-2.5 text-sm font-mono"
          style={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border2))', color: 'hsl(var(--text))', borderRadius: 6 }}
        />

        <div className="grid grid-cols-2 gap-3">
          {SCAN_FIELDS.map(f => (
            <div key={f.key} className="space-y-1">
              <label className="text-[10px] font-mono" style={{ color: 'hsl(var(--dim))' }}>{f.label} {f.unit && `(${f.unit})`}</label>
              <input
                type="number" step="0.1" placeholder="—"
                value={values[f.key]} onChange={(e) => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                className="w-full h-9 rounded-lg px-2.5 text-sm font-mono"
                style={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text))' }}
              />
            </div>
          ))}
        </div>
        <textarea
          value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)..." rows={2}
          className="w-full rounded-lg p-2.5 text-sm resize-none"
          style={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text))' }}
        />
        <button
          onClick={handleSave} disabled={saving}
          className="w-full py-2.5 rounded-xl text-xs font-semibold tracking-wider disabled:opacity-50"
          style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
        >
          {saving ? 'Saving...' : editingId ? 'Update Scan' : 'Save Scan'}
        </button>
      </div>

      {/* Latest scan card */}
      {scans.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
          <span className="text-[9px] font-mono tracking-wider block mb-3" style={{ color: 'hsl(var(--primary))' }}>
            LATEST — {format(new Date(scans[0].date), 'dd MMM yyyy')}
          </span>
          <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
            {SCAN_FIELDS.map(f => {
              const val = scans[0]?.[f.key];
              const change = getChange(f.key);
              return val != null ? (
                <div key={f.key} className="flex justify-between items-center">
                  <span className="text-[10px] font-mono" style={{ color: 'hsl(var(--dim))' }}>{f.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-semibold" style={{ color: 'hsl(var(--text))' }}>{val}{f.unit}</span>
                    {change && <span className="text-[9px] font-mono" style={{ color: 'hsl(var(--mid))' }}>{change}</span>}
                  </div>
                </div>
              ) : null;
            })}
          </div>
          {scans[0].notes && (
            <p className="text-[10px] mt-3 pt-2" style={{ color: 'hsl(var(--mid))', borderTop: '1px solid hsl(var(--border))' }}>{scans[0].notes}</p>
          )}
        </div>
      )}

      {/* History */}
      <div>
        <span className="text-[9px] font-mono tracking-wider block mb-2" style={{ color: 'hsl(var(--primary))' }}>SCAN HISTORY</span>
        {scans.slice(1, 10).map((s: any) => (
          <div key={s.id} className="py-2 px-3 mb-1.5 rounded-lg flex items-start justify-between" style={{ background: 'hsl(var(--bg2))' }}>
            <div>
              <span className="text-[10px] font-mono block mb-1" style={{ color: 'hsl(var(--dim))' }}>{format(new Date(s.date), 'dd MMM yyyy')}</span>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {SCAN_FIELDS.map(f => s[f.key] != null && (
                  <span key={f.key} className="text-[10px] font-mono" style={{ color: 'hsl(var(--mid))' }}>
                    {f.label}: <span style={{ color: 'hsl(var(--text))' }}>{s[f.key]}{f.unit}</span>
                  </span>
                ))}
              </div>
            </div>
            <button onClick={() => handleEdit(s)} className="mt-1" style={{ color: 'hsl(var(--dim))' }}>
              <Pencil size={12} />
            </button>
          </div>
        ))}
        {scans.length === 0 && <p className="text-xs text-center py-6" style={{ color: 'hsl(var(--dim))' }}>No scans yet</p>}
      </div>
    </div>
  );
};

export default InBodyTab;
