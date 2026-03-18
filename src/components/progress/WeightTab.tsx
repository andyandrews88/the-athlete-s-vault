import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { LineChart, Line, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, defs } from 'recharts';

interface WeightLog { id: string; date: string; weight_kg: number; }

const WeightTab = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [weight, setWeight] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('body_weight_logs' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(90);
    setLogs((data as any) ?? []);
  }, [user]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleAdd = async () => {
    if (!user || !weight) return;
    setAdding(true);

    const existing = logs.find(l => l.date === selectedDate);
    if (existing && !editingId) {
      if (!confirm('Entry exists for this date. Update it?')) {
        setAdding(false);
        return;
      }
    }

    await (supabase.from('body_weight_logs' as any) as any).upsert({
      user_id: user.id, date: selectedDate, weight_kg: parseFloat(weight),
    }, { onConflict: 'user_id,date' });
    setWeight('');
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
    setEditingId(null);
    setAdding(false);
    fetchLogs();
    toast({ title: 'Weight logged ✓' });
  };

  const handleEdit = (log: WeightLog) => {
    setWeight(String(log.weight_kg));
    setSelectedDate(log.date);
    setEditingId(log.id);
  };

  // Stats
  const last7 = logs.filter(l => new Date(l.date) >= subDays(new Date(), 7));
  const weekAvg = last7.length ? (last7.reduce((s, l) => s + l.weight_kg, 0) / last7.length).toFixed(1) : null;
  const latestWeight = logs[0]?.weight_kg;
  const startWeight = logs.length > 0 ? logs[logs.length - 1]?.weight_kg : null;
  const weightChange = logs.length >= 2 ? logs[0].weight_kg - logs[1].weight_kg : 0;

  // Chart data (last 12 weeks, ascending)
  const chartData = [...logs].reverse().slice(-84).map(d => ({
    date: d.date,
    weight: d.weight_kg,
  }));

  return (
    <div className="px-4 py-5 pb-24 space-y-5">
      {/* Log Input */}
      <div className="flex gap-2">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="h-11 rounded-lg px-2 text-xs font-mono"
          style={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border2))', color: 'hsl(var(--text))', borderRadius: 6 }}
        />
        <input
          type="number" step="0.1" placeholder="kg"
          value={weight} onChange={(e) => setWeight(e.target.value)}
          className="flex-1 h-11 rounded-xl px-3 text-sm font-mono"
          style={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text))' }}
        />
        <button
          onClick={handleAdd} disabled={adding || !weight}
          className="h-11 px-4 rounded-xl text-xs font-semibold tracking-wider disabled:opacity-50 flex items-center gap-1.5"
          style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
        >
          <Plus size={14} /> {editingId ? 'UPDATE' : 'LOG'}
        </button>
      </div>

      {/* Bodyweight Chart Card */}
      {chartData.length > 1 && (
        <div className="rounded-xl p-4" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[8px] font-mono tracking-wider" style={{ color: 'hsl(var(--dim))' }}>Bodyweight</span>
            {weightChange !== 0 && (
              <span
                className="text-[8px] font-mono px-2 py-0.5 rounded"
                style={{
                  background: weightChange < 0 ? 'hsla(var(--ok)/0.1)' : 'hsla(var(--bad)/0.1)',
                  color: weightChange < 0 ? 'hsl(var(--ok))' : 'hsl(var(--bad))',
                }}
              >
                {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)}kg {weightChange < 0 ? '↓' : '↑'}
              </span>
            )}
          </div>

          {/* Recharts Line */}
          <div style={{ height: 52, width: '100%' }}>
            <ResponsiveContainer width="100%" height={52}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsla(192,91%,54%,0.2)" />
                    <stop offset="100%" stopColor="hsla(192,91%,54%,0)" />
                  </linearGradient>
                </defs>
                <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
                <XAxis hide dataKey="date" />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 10 }}
                  labelStyle={{ color: 'hsl(var(--dim))', fontSize: 9 }}
                  itemStyle={{ color: 'hsl(var(--primary))' }}
                  formatter={(v: number) => [`${v} kg`, 'Weight']}
                  labelFormatter={(l: string) => l?.slice(5) || ''}
                />
                <Area type="monotone" dataKey="weight" fill="url(#weightGrad)" stroke="none" />
                <Line type="monotone" dataKey="weight" stroke="hsl(192,91%,54%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* X labels */}
          <div className="flex justify-between mt-1">
            {['W1', 'W4', 'W8', 'W12'].map(w => (
              <span key={w} className="text-[7px] font-mono" style={{ color: 'hsl(var(--dim))' }}>{w}</span>
            ))}
          </div>

          {/* Stats row */}
          <div className="flex justify-between mt-3 pt-3" style={{ borderTop: '1px solid hsl(var(--border))' }}>
            <div className="text-center">
              <span className="text-[7px] font-mono block" style={{ color: 'hsl(var(--dim))' }}>Start</span>
              <span className="text-xs font-mono" style={{ color: 'hsl(var(--dim))' }}>{startWeight ?? '—'}</span>
            </div>
            <div className="text-center">
              <span className="text-[7px] font-mono block" style={{ color: 'hsl(var(--dim))' }}>Current</span>
              <span className="text-xs font-mono" style={{ color: 'hsl(var(--primary))' }}>{latestWeight ?? '—'}</span>
            </div>
            <div className="text-center">
              <span className="text-[7px] font-mono block" style={{ color: 'hsl(var(--dim))' }}>7-Day Avg</span>
              <span className="text-xs font-mono" style={{ color: 'hsl(var(--ok))' }}>{weekAvg ?? '—'}</span>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      <div>
        <span className="text-[9px] font-mono tracking-wider block mb-2" style={{ color: 'hsl(var(--primary))' }}>HISTORY</span>
        <div className="space-y-1.5">
          {logs.slice(0, 20).map((l) => (
            <div key={l.id} className="flex justify-between items-center py-2 px-3 rounded-lg" style={{ background: 'hsl(var(--bg2))' }}>
              <span className="text-xs font-mono" style={{ color: 'hsl(var(--dim))' }}>{format(new Date(l.date), 'dd MMM yyyy')}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono font-semibold" style={{ color: 'hsl(var(--text))' }}>{l.weight_kg} kg</span>
                <button onClick={() => handleEdit(l)} style={{ color: 'hsl(var(--dim))' }}>
                  <Pencil size={12} />
                </button>
              </div>
            </div>
          ))}
          {logs.length === 0 && <p className="text-xs text-center py-6" style={{ color: 'hsl(var(--dim))' }}>No entries yet</p>}
        </div>
      </div>
    </div>
  );
};

export default WeightTab;
