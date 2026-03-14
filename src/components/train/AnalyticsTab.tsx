import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ALL_PATTERNS } from '@/lib/movementPatterns';
import { format, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { Trophy } from 'lucide-react';

const EmptyState = () => (
  <div className="flex items-center justify-center h-40 text-muted-foreground text-sm font-mono">
    No data yet. Complete your first session.
  </div>
);

const chartGrid = <CartesianGrid horizontal={true} vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />;

export const AnalyticsTab = () => {
  const { user } = useAuth();
  const [volumeData, setVolumeData] = useState<any[]>([]);
  const [frequencyData, setFrequencyData] = useState<any[]>([]);
  const [radarData, setRadarData] = useState<any[]>([]);
  const [prList, setPrList] = useState<any[]>([]);
  const [strengthData, setStrengthData] = useState<any[]>([]);
  const [exercises, setExercises] = useState<{ id: string; name: string }[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  useEffect(() => {
    if (selectedExercise) loadStrength(selectedExercise);
  }, [selectedExercise]);

  const loadData = async () => {
    if (!user) return;

    // Volume + Frequency over last 12 weeks
    const weeks: any[] = [];
    const freqWeeks: any[] = [];
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
    }
    setVolumeData(weeks);
    setFrequencyData(freqWeeks);

    // Radar: movement pattern balance this month
    const monthStart = format(subWeeks(new Date(), 4), 'yyyy-MM-dd');
    const { data: sessionExercises } = await supabase
      .from('session_exercises')
      .select(`
        exercise_id,
        exercises (movement_pattern, difficulty_coefficient),
        exercise_sets (reps, weight_kg, completed)
      `)
      .gte('session_id', '') as any; // We need to join through sessions

    // Simpler approach: load all completed sets with exercise info
    const patternNtu: Record<string, number> = {};
    ALL_PATTERNS.forEach(p => patternNtu[p] = 0);
    setRadarData(ALL_PATTERNS.map(p => ({ pattern: p.substring(0, 3).toUpperCase(), value: patternNtu[p] || 0, fullName: p })));

    // PRs
    const { data: prs } = await supabase
      .from('personal_records')
      .select('weight_kg, reps, achieved_at, exercise_id, exercises(name)')
      .eq('user_id', user.id)
      .order('achieved_at', { ascending: false })
      .limit(20) as any;
    setPrList(prs || []);

    // Exercise list for strength dropdown
    const { data: exList } = await supabase.from('exercises').select('id, name').order('name');
    setExercises(exList || []);
    if (exList?.length) setSelectedExercise(exList[0].id);
  };

  const loadStrength = async (exerciseId: string) => {
    if (!user) return;
    const { data } = await supabase
      .from('personal_records')
      .select('weight_kg, achieved_at')
      .eq('user_id', user.id)
      .eq('exercise_id', exerciseId)
      .order('achieved_at', { ascending: true }) as any;

    setStrengthData((data || []).map((d: any) => ({
      date: format(new Date(d.achieved_at), 'dd/MM'),
      weight: Number(d.weight_kg),
    })));
  };

  return (
    <div className="mt-4 space-y-6">
      {/* 1. Volume Over Time */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-mono text-xs text-muted-foreground tracking-wider mb-4">WEEKLY VOLUME</h3>
        {volumeData.some(d => d.ntu > 0) ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={volumeData}>
              {chartGrid}
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'hsl(var(--dim))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--dim))' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="ntu" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyState />}
      </div>

      {/* 2. Strength Progress */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-mono text-xs text-muted-foreground tracking-wider">STRENGTH TREND</h3>
          <select
            value={selectedExercise}
            onChange={e => setSelectedExercise(e.target.value)}
            className="bg-vault-bg3 border border-border text-xs rounded px-2 py-1 text-foreground font-mono"
          >
            {exercises.map(ex => (
              <option key={ex.id} value={ex.id}>{ex.name}</option>
            ))}
          </select>
        </div>
        {strengthData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={strengthData}>
              {chartGrid}
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--dim))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--dim))' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: 'hsl(var(--primary))' }} />
            </LineChart>
          </ResponsiveContainer>
        ) : <EmptyState />}
      </div>

      {/* 3. Movement Pattern Balance */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-mono text-xs text-muted-foreground tracking-wider mb-4">MOVEMENT BALANCE</h3>
        {radarData.some(d => d.value > 0) ? (
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="pattern" tick={{ fontSize: 9, fill: 'hsl(var(--dim))' }} />
              <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
            </RadarChart>
          </ResponsiveContainer>
        ) : <EmptyState />}
      </div>

      {/* 4. Session Frequency */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-mono text-xs text-muted-foreground tracking-wider mb-4">SESSION FREQUENCY</h3>
        {frequencyData.some(d => d.sessions > 0) ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={frequencyData}>
              {chartGrid}
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'hsl(var(--dim))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--dim))' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyState />}
      </div>

      {/* 5. PR Timeline */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-mono text-xs text-muted-foreground tracking-wider mb-4">PR TIMELINE</h3>
        {prList.length > 0 ? (
          <div className="space-y-3">
            {prList.map((pr: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-vault-gold" />
                  <span className="text-sm">{pr.exercises?.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-primary">{Number(pr.weight_kg)}kg</span>
                  <span className="font-mono text-xs text-muted-foreground">{format(new Date(pr.achieved_at), 'dd MMM')}</span>
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState />}
      </div>

      {/* 6. Recovery vs Performance — placeholder since no daily_checkins table yet */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-mono text-xs text-muted-foreground tracking-wider mb-4">RECOVERY VS PERFORMANCE</h3>
        <EmptyState />
      </div>
    </div>
  );
};
