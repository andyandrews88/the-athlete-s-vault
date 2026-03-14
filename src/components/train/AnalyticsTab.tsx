import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subWeeks, startOfWeek } from 'date-fns';

type ViewMode = 'bar' | 'line' | 'radar' | 'table';

const ChartCard = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="bg-card border border-border rounded-2xl p-5">
    <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-4">{label}</p>
    {children}
  </div>
);

const StatCard = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div className="bg-card border border-border rounded-2xl p-4 text-center">
    <p className="font-mono text-[8px] text-muted-foreground uppercase tracking-wider">{label}</p>
    <p className={`font-mono text-lg font-bold mt-1 ${accent ? 'text-primary' : 'text-foreground'}`}>{value}</p>
  </div>
);

interface WeekData {
  week: string;
  weekStart: string;
  ntu: number;
  avgRir: number;
  sessionCount: number;
  patternVolume: Record<string, number>;
}

const MOVEMENT_COLORS: Record<string, string> = {
  Hinge: 'bg-destructive',
  Squat: 'bg-primary',
  Push: 'bg-vault-warn',
  Pull: 'bg-vault-ok',
  'Single Leg': 'bg-violet-500',
  Core: 'bg-amber-400',
  Carry: 'bg-orange-500',
  Olympic: 'bg-rose-500',
  Isolation: 'bg-slate-400',
  Plyometric: 'bg-emerald-400',
  Rotational: 'bg-sky-400',
};

export const AnalyticsTab = () => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('bar');
  const [weeklyData, setWeeklyData] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const twelveWeeksAgo = format(startOfWeek(subWeeks(new Date(), 11), { weekStartsOn: 1 }), 'yyyy-MM-dd');

    // Single query: get all completed sessions in 12 weeks
    const { data: sessions } = await supabase
      .from('training_sessions')
      .select('id, date, total_ntu')
      .eq('user_id', user.id)
      .eq('completed', true)
      .gte('date', twelveWeeksAgo)
      .order('date');

    if (!sessions?.length) {
      setWeeklyData(buildEmptyWeeks());
      setLoading(false);
      return;
    }

    // Single query: get all exercise sets with RIR + movement pattern for these sessions
    const sessionIds = sessions.map(s => s.id);
    const { data: seData } = await supabase
      .from('session_exercises')
      .select('id, session_id, exercises(movement_pattern)')
      .in('session_id', sessionIds) as any;

    let setRows: any[] = [];
    if (seData?.length) {
      const seIds = seData.map((se: any) => se.id);
      // Batch in chunks of 100 to avoid query limits
      const chunks: string[][] = [];
      for (let i = 0; i < seIds.length; i += 100) chunks.push(seIds.slice(i, i + 100));
      const results = await Promise.all(
        chunks.map(chunk =>
          supabase.from('exercise_sets').select('session_exercise_id, reps, weight_kg, rir, completed').in('session_exercise_id', chunk)
        )
      );
      setRows = results.flatMap(r => r.data || []);
    }

    // Build lookup: session_exercise_id → movement_pattern + session_id
    const seLookup: Record<string, { session_id: string; pattern: string }> = {};
    seData?.forEach((se: any) => {
      seLookup[se.id] = { session_id: se.session_id, pattern: se.exercises?.movement_pattern || 'Other' };
    });

    // Build session → date lookup
    const sessionDateMap: Record<string, string> = {};
    sessions.forEach(s => { sessionDateMap[s.id] = s.date; });

    // Group everything by week
    const weekMap: Record<string, { ntu: number; rirSum: number; rirCount: number; sessionIds: Set<string>; patternVolume: Record<string, number> }> = {};

    // Initialize 12 weeks
    for (let i = 11; i >= 0; i--) {
      const ws = format(startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      weekMap[ws] = { ntu: 0, rirSum: 0, rirCount: 0, sessionIds: new Set(), patternVolume: {} };
    }

    // Aggregate sessions NTU
    sessions.forEach(s => {
      const ws = format(startOfWeek(new Date(s.date + 'T00:00:00'), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      if (weekMap[ws]) {
        weekMap[ws].ntu += Number(s.total_ntu) || 0;
        weekMap[ws].sessionIds.add(s.id);
      }
    });

    // Aggregate set-level data (RIR + pattern volume)
    setRows.forEach((set: any) => {
      if (!set.completed) return;
      const se = seLookup[set.session_exercise_id];
      if (!se) return;
      const sessionDate = sessionDateMap[se.session_id];
      if (!sessionDate) return;
      const ws = format(startOfWeek(new Date(sessionDate + 'T00:00:00'), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      if (!weekMap[ws]) return;

      // RIR
      if (set.rir !== null && set.rir !== undefined) {
        weekMap[ws].rirSum += Number(set.rir);
        weekMap[ws].rirCount++;
      }

      // Pattern volume
      const vol = (Number(set.reps) || 0) * (Number(set.weight_kg) || 0);
      weekMap[ws].patternVolume[se.pattern] = (weekMap[ws].patternVolume[se.pattern] || 0) + vol;
    });

    // Convert to array
    const weeks = Object.entries(weekMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ws, data], i) => ({
        week: `W${i + 1}`,
        weekStart: ws,
        ntu: Math.round(data.ntu),
        avgRir: data.rirCount > 0 ? Math.round((data.rirSum / data.rirCount) * 10) / 10 : 0,
        sessionCount: data.sessionIds.size,
        patternVolume: data.patternVolume,
      }));

    setWeeklyData(weeks);
    setLoading(false);
  };

  const buildEmptyWeeks = (): WeekData[] => {
    return Array.from({ length: 12 }, (_, i) => ({
      week: `W${i + 1}`,
      weekStart: format(startOfWeek(subWeeks(new Date(), 11 - i), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      ntu: 0,
      avgRir: 0,
      sessionCount: 0,
      patternVolume: {},
    }));
  };

  const totalSessions = useMemo(() => weeklyData.reduce((s, w) => s + w.sessionCount, 0), [weeklyData]);
  const totalNtu = useMemo(() => weeklyData.reduce((s, w) => s + w.ntu, 0), [weeklyData]);
  const maxNtu = useMemo(() => Math.max(...weeklyData.map(d => d.ntu), 1), [weeklyData]);

  // Aggregate movement pattern volume across all weeks
  const patternTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    weeklyData.forEach(w => {
      Object.entries(w.patternVolume).forEach(([p, v]) => {
        totals[p] = (totals[p] || 0) + v;
      });
    });
    return Object.entries(totals).sort(([, a], [, b]) => b - a);
  }, [weeklyData]);
  const maxPatternVol = useMemo(() => Math.max(...patternTotals.map(([, v]) => v), 1), [patternTotals]);

  // Compliance: sessions per week vs target (assume 4/week)
  const TARGET_SESSIONS_PER_WEEK = 4;
  const compliancePercent = useMemo(() => {
    const activeWeeks = weeklyData.filter(w => w.sessionCount > 0).length;
    if (activeWeeks === 0) return 0;
    const totalTarget = weeklyData.length * TARGET_SESSIONS_PER_WEEK;
    return Math.round((totalSessions / totalTarget) * 100);
  }, [weeklyData, totalSessions]);

  return (
    <div className="max-w-lg mx-auto px-4 space-y-4">
      {/* View toggle */}
      <div className="flex gap-2 mb-2">
        {(['bar', 'line', 'radar', 'table'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setViewMode(v)}
            className={`font-mono text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all ${
              viewMode === v
                ? 'bg-primary text-primary-foreground font-bold'
                : 'bg-secondary border border-border text-muted-foreground'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {viewMode === 'bar' ? (
        <>
          {/* Weekly Volume Bar Chart */}
          <ChartCard label="WEEKLY VOLUME (NTU)">
            {weeklyData.some(d => d.ntu > 0) ? (
              <div>
                <div className="flex items-end gap-1 h-16">
                  {weeklyData.slice(-8).map((d, i, arr) => {
                    const isLast = i === arr.length - 1;
                    const height = maxNtu > 0 ? (d.ntu / maxNtu) * 100 : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div
                          className={`w-full rounded-t-sm transition-all ${
                            isLast ? 'bg-primary shadow-[0_0_8px_hsl(192_91%_54%/0.4)]' : 'bg-primary/40'
                          }`}
                          style={{ height: `${Math.max(height, 2)}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-1 mt-1">
                  {weeklyData.slice(-8).map((d, i) => (
                    <span key={i} className="flex-1 font-mono text-[7px] text-muted-foreground text-center">{d.week}</span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="font-mono text-[10px] text-muted-foreground text-center py-8">No data yet. Complete your first session.</p>
            )}
          </ChartCard>

          {/* Proximity to Failure (Avg RIR) */}
          <ChartCard label="PROXIMITY TO FAILURE (AVG RIR)">
            {weeklyData.some(d => d.avgRir > 0) ? (
              <div>
                <div className="flex items-end gap-1 h-16">
                  {weeklyData.slice(-8).map((d, i, arr) => {
                    const isLast = i === arr.length - 1;
                    const height = d.avgRir > 0 ? Math.max((d.avgRir / 5) * 100, 8) : 2;
                    const color = d.avgRir <= 1 ? 'bg-destructive' : d.avgRir <= 2 ? 'bg-vault-warn' : 'bg-primary';
                    return (
                      <div
                        key={i}
                        className={`flex-1 rounded-t-sm transition-all ${
                          isLast ? `${color} shadow-[0_0_8px_hsl(192_91%_54%/0.4)]` : `${color}/60`
                        }`}
                        style={{ height: `${height}%` }}
                      />
                    );
                  })}
                </div>
                <div className="flex gap-1 mt-1">
                  {weeklyData.slice(-8).map((d, i) => (
                    <span key={i} className="flex-1 font-mono text-[7px] text-muted-foreground text-center">{d.week}</span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="font-mono text-[10px] text-muted-foreground text-center py-8">No RIR data yet. Log sets with RIR values.</p>
            )}
          </ChartCard>

          {/* Movement Balance */}
          <ChartCard label="MOVEMENT BALANCE (12 WKS)">
            {patternTotals.length > 0 ? (
              <div className="space-y-2">
                {patternTotals.map(([pattern, vol]) => {
                  const pct = (vol / maxPatternVol) * 100;
                  const colorClass = MOVEMENT_COLORS[pattern] || 'bg-muted-foreground';
                  return (
                    <div key={pattern} className="flex items-center gap-3">
                      <span className="font-mono text-[9px] text-muted-foreground w-20 text-right shrink-0">{pattern}</span>
                      <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="font-mono text-[9px] text-foreground w-14 text-right">{Math.round(vol).toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="font-mono text-[10px] text-muted-foreground text-center py-8">No data yet.</p>
            )}
          </ChartCard>

          {/* Workout Compliance */}
          <ChartCard label="WORKOUT COMPLIANCE">
            <div className="flex items-center gap-6">
              {/* Donut */}
              <div className="relative w-20 h-20 shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--secondary))" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.5" fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="3"
                    strokeDasharray={`${compliancePercent} ${100 - compliancePercent}`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-mono text-sm text-primary font-bold">
                  {compliancePercent}%
                </span>
              </div>
              <div>
                <p className="font-mono text-xs text-foreground">{totalSessions} sessions</p>
                <p className="font-mono text-[9px] text-muted-foreground">of {weeklyData.length * TARGET_SESSIONS_PER_WEEK} target ({TARGET_SESSIONS_PER_WEEK}/wk)</p>
              </div>
            </div>
          </ChartCard>

          {/* Training Consistency */}
          <ChartCard label="TRAINING CONSISTENCY (12 WKS)">
            <div className="flex items-end gap-1 h-16">
              {weeklyData.map((d, i, arr) => {
                const isLast = i === arr.length - 1;
                const height = d.ntu > 0 ? Math.max((d.ntu / maxNtu) * 100, 8) : 2;
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-t-sm transition-all ${
                      isLast ? 'bg-primary shadow-[0_0_8px_hsl(192_91%_54%/0.4)]' : d.ntu > 0 ? 'bg-primary/40' : 'bg-secondary'
                    }`}
                    style={{ height: `${height}%` }}
                  />
                );
              })}
            </div>
          </ChartCard>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="SESSIONS" value={`${totalSessions}`} />
            <StatCard label="VOLUME" value={`${totalNtu}`} accent />
            <StatCard label="COMPLIANCE" value={`${compliancePercent}%`} />
          </div>
        </>
      ) : (
        <ChartCard label={`${viewMode.toUpperCase()} VIEW`}>
          <p className="font-mono text-[10px] text-muted-foreground text-center py-8">
            {viewMode.toUpperCase()} VIEW — COMING SOON
          </p>
        </ChartCard>
      )}
    </div>
  );
};
