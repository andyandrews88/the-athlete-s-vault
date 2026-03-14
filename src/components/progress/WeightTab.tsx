import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Plus, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { format, subDays } from 'date-fns';

interface WeightLog { id: string; date: string; weight_kg: number; }

const WeightTab = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [weight, setWeight] = useState('');
  const [adding, setAdding] = useState(false);

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
    const today = format(new Date(), 'yyyy-MM-dd');
    await (supabase.from('body_weight_logs' as any) as any).upsert({
      user_id: user.id, date: today, weight_kg: parseFloat(weight),
    }, { onConflict: 'user_id,date' });
    setWeight('');
    setAdding(false);
    fetchLogs();
    toast({ title: 'Weight logged ✓' });
  };

  // Weekly average
  const last7 = logs.filter(l => new Date(l.date) >= subDays(new Date(), 7));
  const weekAvg = last7.length ? (last7.reduce((s, l) => s + l.weight_kg, 0) / last7.length).toFixed(1) : null;
  const trend = logs.length >= 2 ? logs[0].weight_kg - logs[1].weight_kg : 0;

  // Simple sparkline
  const chartData = [...logs].reverse().slice(-30);
  const maxW = Math.max(...chartData.map(d => d.weight_kg), 1);
  const minW = Math.min(...chartData.map(d => d.weight_kg), 0);
  const range = maxW - minW || 1;

  return (
    <div className="px-4 py-5 pb-24 space-y-5">
      {/* Input */}
      <div className="flex gap-3">
        <input
          type="number" step="0.1" placeholder="Weight (kg)"
          value={weight} onChange={(e) => setWeight(e.target.value)}
          className="flex-1 h-11 rounded-xl px-3 text-sm font-mono"
          style={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text))' }}
        />
        <button
          onClick={handleAdd} disabled={adding || !weight}
          className="h-11 px-4 rounded-xl text-xs font-semibold tracking-wider disabled:opacity-50 flex items-center gap-1.5"
          style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
        >
          <Plus size={14} /> LOG
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Latest', val: logs[0]?.weight_kg ? `${logs[0].weight_kg} kg` : '—' },
          { label: '7d Avg', val: weekAvg ? `${weekAvg} kg` : '—' },
          { label: 'Trend', val: trend !== 0 ? `${trend > 0 ? '+' : ''}${trend.toFixed(1)} kg` : '—', icon: trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
            <span className="text-[9px] font-mono tracking-wider block mb-1" style={{ color: 'hsl(var(--dim))' }}>{s.label}</span>
            <div className="flex items-center justify-center gap-1">
              {s.icon && <s.icon size={12} style={{ color: 'hsl(var(--primary))' }} />}
              <span className="text-sm font-mono font-semibold" style={{ color: 'hsl(var(--text))' }}>{s.val}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="rounded-xl p-4" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
          <span className="text-[9px] font-mono tracking-wider block mb-3" style={{ color: 'hsl(var(--primary))' }}>LAST 30 DAYS</span>
          <svg viewBox={`0 0 ${chartData.length * 12} 80`} className="w-full h-20">
            <polyline
              fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              stroke="hsl(var(--primary))"
              points={chartData.map((d, i) => `${i * 12},${80 - ((d.weight_kg - minW) / range) * 70}`).join(' ')}
            />
            {chartData.map((d, i) => (
              <circle key={i} cx={i * 12} cy={80 - ((d.weight_kg - minW) / range) * 70} r="2.5" fill="hsl(var(--primary))" />
            ))}
          </svg>
          <div className="flex justify-between text-[9px] font-mono mt-1" style={{ color: 'hsl(var(--dim))' }}>
            <span>{chartData[0]?.date?.slice(5)}</span>
            <span>{chartData[chartData.length - 1]?.date?.slice(5)}</span>
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
              <span className="text-sm font-mono font-semibold" style={{ color: 'hsl(var(--text))' }}>{l.weight_kg} kg</span>
            </div>
          ))}
          {logs.length === 0 && <p className="text-xs text-center py-6" style={{ color: 'hsl(var(--dim))' }}>No entries yet</p>}
        </div>
      </div>
    </div>
  );
};

export default WeightTab;
