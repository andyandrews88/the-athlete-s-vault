import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { ALL_PATTERNS } from '@/lib/movementPatterns';
import { format, subWeeks, startOfWeek, endOfWeek } from 'date-fns';

const EmptyState = () => (
  <div className="flex items-center justify-center h-32 text-muted-foreground text-xs font-mono">
    No data yet. Complete your first session.
  </div>
);

const chartGrid = <CartesianGrid horizontal vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />;

const SectionCard = ({ title, badge, children, headerRight }: { title: string; badge?: string; children: React.ReactNode; headerRight?: React.ReactNode }) => (
  <div className="bg-card border border-border rounded-lg p-4">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <h3 className="font-mono text-xs text-muted-foreground tracking-wider">{title}</h3>
        {badge && <span className="font-mono text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded">{badge}</span>}
      </div>
      {headerRight}
    </div>
    {children}
  </div>
);

export const AnalyticsTab = () => {
  const { user } = useAuth();
  const [volumeData, setVolumeData] = useState<any[]>([]);
  const [frequencyData, setFrequencyData] = useState<any[]>([]);
  const [strengthData, setStrengthData] = useState<any[]>([]);
  const [exercises, setExercises] = useState<{ id: string; name: string }[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>('');
  const [movementData, setMovementData] = useState<{ pattern: string; ntu: number; max: number }[]>([]);
  const [consistencyData, setConsistencyData] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  useEffect(() => {
    if (selectedExercise) loadStrength(selectedExercise);
  }, [selectedExercise]);

  const loadData = async () => {
    if (!user) return;

    // Volume + Frequency + Consistency over last 12 weeks
    const weeks: any[] = [];
    const freqWeeks: any[] = [];
    const consistWeeks: any[] = [];
    for (let i = 11; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
      const { data: sessions } = await supabase
        .from('training_sessions')
        .select('total_ntu')
        .eq('user_id', user.id)
        .eq('completed', true)
        .gte('date', format(weekStart, 'yyyy-MM-dd'))
        .lte('date', format(weekEnd, 'yyyy-MM-dd'));

      const totalNtu = sessions?.reduce((sum, s) => sum + (Number(s.total_ntu) || 0), 0) ?? 0;
      weeks.push({ week: `W${12 - i}`, ntu: Math.round(totalNtu) });
      freqWeeks.push({ week: `W${12 - i}`, sessions: sessions?.length ?? 0 });
      consistWeeks.push({ week: `W${12 - i}`, sessions: sessions?.length ?? 0 });
    }
    setVolumeData(weeks);
    setFrequencyData(freqWeeks);
    setConsistencyData(consistWeeks);

    // Movement balance — NTU per pattern
    const patternNtu: Record<string, number> = {};
    ALL_PATTERNS.forEach(p => { patternNtu[p] = 0; });
    const maxNtu = Math.max(...Object.values(patternNtu), 1);
    setMovementData(ALL_PATTERNS.map(p => ({
      pattern: p.substring(0, 3).toUpperCase(),
      ntu: patternNtu[p] || 0,
      max: maxNtu,
    })));

    // Exercise list for strength dropdown
    const { data: exList } = await supabase.from('exercises').select('id, name').order('name');
    setExercises(exList || []);
    if (exList?.length) {
      setSelectedExercise(exList[0].id);
      setSelectedExerciseName(exList[0].name);
    }
  };

  const loadStrength = async (exerciseId: string) => {
    if (!user) return;
    const { data } = await supabase
      .from('personal_records')
      .select('weight_kg, achieved_at')
      .eq('user_id', user.id)
      .eq('exercise_id', exerciseId)
      .order('achieved_at', { ascending: true }) as any;

    setStrengthData((data || []).map((d: any, i: number) => ({
      label: format(new Date(d.achieved_at), 'dd/MM'),
      weight: Number(d.weight_kg),
    })));
  };

  const strengthStart = strengthData.length > 0 ? strengthData[0].weight : 0;
  const strengthCurrent = strengthData.length > 0 ? strengthData[strengthData.length - 1].weight : 0;
  const strengthGain = strengthCurrent - strengthStart;

  return (
    <div className="mt-4 space-y-4">
      {/* 1. Strength Trend */}
      <SectionCard
        title="STRENGTH TREND"
        headerRight={
          <select
            value={selectedExercise}
            onChange={e => {
              setSelectedExercise(e.target.value);
              const ex = exercises.find(x => x.id === e.target.value);
              setSelectedExerciseName(ex?.name || '');
            }}
            className="bg-secondary border border-border text-[10px] font-mono rounded-full px-3 py-1 text-primary outline-none"
          >
            {exercises.map(ex => (
              <option key={ex.id} value={ex.id}>{ex.name.toUpperCase()}</option>
            ))}
          </select>
        }
      >
        {strengthData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={strengthData}>
                {chartGrid}
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'hsl(var(--dim))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--dim))' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11, fontFamily: 'monospace' }} />
                <Bar dataKey="weight" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="bg-secondary rounded-lg p-2 text-center">
                <p className="text-[10px] font-mono text-muted-foreground">START</p>
                <p className="font-mono text-sm text-foreground">{strengthStart}kg</p>
              </div>
              <div className="bg-secondary rounded-lg p-2 text-center">
                <p className="text-[10px] font-mono text-muted-foreground">CURRENT</p>
                <p className="font-mono text-sm text-primary">{strengthCurrent}kg</p>
              </div>
              <div className="bg-secondary rounded-lg p-2 text-center">
                <p className="text-[10px] font-mono text-muted-foreground">GAIN</p>
                <p className={`font-mono text-sm ${strengthGain > 0 ? 'text-[hsl(var(--ok))]' : 'text-foreground'}`}>+{strengthGain}kg</p>
              </div>
            </div>
          </>
        ) : <EmptyState />}
      </SectionCard>

      {/* 2. Weekly Volume */}
      <SectionCard title="WEEKLY VOLUME" badge={`${volumeData.reduce((s, d) => s + d.ntu, 0)} NTU`}>
        {volumeData.some(d => d.ntu > 0) ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={volumeData.slice(-4)}>
              {chartGrid}
              <XAxis dataKey="week" tick={{ fontSize: 9, fill: 'hsl(var(--dim))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--dim))' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11, fontFamily: 'monospace' }} />
              <Bar dataKey="ntu" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyState />}
      </SectionCard>

      {/* 3. Proximity to Failure (Avg RIR) — placeholder */}
      <SectionCard title="PROXIMITY TO FAILURE (AVG RIR)">
        <EmptyState />
      </SectionCard>

      {/* 4. Movement Balance — horizontal bars */}
      <SectionCard title="MOVEMENT BALANCE">
        {movementData.some(d => d.ntu > 0) ? (
          <div className="space-y-2">
            {movementData.map(d => {
              const pct = d.max > 0 ? (d.ntu / d.max) * 100 : 0;
              return (
                <div key={d.pattern} className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-muted-foreground w-8">{d.pattern}</span>
                  <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground w-12 text-right">{d.ntu} NTU</span>
                </div>
              );
            })}
          </div>
        ) : <EmptyState />}
      </SectionCard>

      {/* 5. Workout Compliance — ring placeholder */}
      <SectionCard title="WORKOUT COMPLIANCE">
        <EmptyState />
      </SectionCard>

      {/* 6. Training Consistency (12 wks) — BarChart */}
      <SectionCard title="TRAINING CONSISTENCY (12 WKS)">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={consistencyData}>
            {chartGrid}
            <XAxis dataKey="week" tick={{ fontSize: 9, fill: 'hsl(var(--dim))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--dim))' }} axisLine={false} tickLine={false} allowDecimals={false} domain={[0, 7]} />
            <Tooltip contentStyle={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11, fontFamily: 'monospace' }} />
            <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>
    </div>
  );
};
