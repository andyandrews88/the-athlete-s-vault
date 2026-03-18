import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subWeeks, startOfWeek } from 'date-fns';

/* ─── Shared card wrapper ─── */
const ChartCard = ({ label, badge, children }: { label: string; badge?: React.ReactNode; children: React.ReactNode }) => (
  <div style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))', borderRadius: 10, padding: 14, marginBottom: 8 }}>
    <div className="flex items-center justify-between mb-3">
      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: 'hsl(var(--dim))', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</p>
      {badge}
    </div>
    {children}
  </div>
);

/* ─── Movement pattern colors ─── */
const MOVEMENT_COLORS: Record<string, string> = {
  Hinge: 'hsl(0,72%,51%)',
  Squat: 'hsl(262,60%,55%)',
  Push: 'hsl(var(--primary))',
  Pull: 'hsl(var(--ok))',
  'Single Leg': 'hsl(38,92%,50%)',
  Core: 'hsl(215,14%,50%)',
  Carry: 'hsl(38,92%,50%)',
  Olympic: 'hsl(var(--gold))',
  Isolation: 'hsl(215,14%,50%)',
  Plyometric: 'hsl(var(--gold))',
  Rotational: 'hsl(var(--primary))',
};

const PATTERN_ABBREV: Record<string, string> = {
  Hinge: 'HNG', Squat: 'SQT', Push: 'PSH', Pull: 'PLL',
  'Single Leg': 'SL', Carry: 'CRY', Core: 'COR', Olympic: 'OLY',
  Isolation: 'ISO', Plyometric: 'PLY', Rotational: 'ROT',
};

interface WeekData {
  week: string;
  weekStart: string;
  ntu: number;
  avgRir: number;
  sessionCount: number;
  patternVolume: Record<string, number>;
  maxWeight: Record<string, number>;
  // Per-session RIR data for proximity chart
  sessionRirs: { avgRir: number }[];
}

/* ─── Heatmap cell data ─── */
interface HeatmapDay {
  hasSession: boolean;
  ntu: number;
}

export const AnalyticsTab = () => {
  const { user } = useAuth();
  const [weeklyData, setWeeklyData] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStrengthExercise, setSelectedStrengthExercise] = useState<string>('');
  const [availableExercises, setAvailableExercises] = useState<string[]>([]);
  const [showExPicker, setShowExPicker] = useState(false);
  // Heatmap: 12 weeks × 7 days
  const [heatmapData, setHeatmapData] = useState<HeatmapDay[][]>([]);

  useEffect(() => {
    if (!user) return;
    loadExerciseOptions();
    loadData();
  }, [user]);

  const loadExerciseOptions = async () => {
    if (!user) return;
    const { data: prs } = await supabase
      .from('personal_records')
      .select('exercise_id, achieved_at, exercises(name)')
      .eq('user_id', user.id)
      .order('achieved_at', { ascending: false }) as any;
    if (prs?.length) {
      const names = Array.from(new Set(prs.map((pr: any) => pr.exercises?.name).filter(Boolean))) as string[];
      setAvailableExercises(names.sort());
      if (!selectedStrengthExercise) {
        setSelectedStrengthExercise(prs[0].exercises?.name || names[0] || 'Back Squat');
      }
    } else {
      if (!selectedStrengthExercise) setSelectedStrengthExercise('Back Squat');
    }
  };

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const twelveWeeksAgo = format(startOfWeek(subWeeks(new Date(), 11), { weekStartsOn: 1 }), 'yyyy-MM-dd');

    const { data: sessions } = await supabase
      .from('training_sessions')
      .select('id, date, total_ntu')
      .eq('user_id', user.id)
      .eq('completed', true)
      .gte('date', twelveWeeksAgo)
      .order('date');

    if (!sessions?.length) {
      setWeeklyData(buildEmptyWeeks());
      setHeatmapData(buildEmptyHeatmap());
      setLoading(false);
      return;
    }

    const sessionIds = sessions.map(s => s.id);
    const { data: seData } = await supabase
      .from('session_exercises')
      .select('id, session_id, exercises(name, movement_pattern)')
      .in('session_id', sessionIds) as any;

    let setRows: any[] = [];
    if (seData?.length) {
      const seIds = seData.map((se: any) => se.id);
      const chunks: string[][] = [];
      for (let i = 0; i < seIds.length; i += 100) chunks.push(seIds.slice(i, i + 100));
      const results = await Promise.all(
        chunks.map(chunk =>
          supabase.from('exercise_sets').select('session_exercise_id, reps, weight_kg, rir, completed').in('session_exercise_id', chunk)
        )
      );
      setRows = results.flatMap(r => r.data || []);
    }

    const seLookup: Record<string, { session_id: string; pattern: string; exerciseName: string }> = {};
    const exerciseNames = new Set<string>();
    seData?.forEach((se: any) => {
      const name = se.exercises?.name || '';
      seLookup[se.id] = { session_id: se.session_id, pattern: se.exercises?.movement_pattern || 'Other', exerciseName: name };
      if (name) exerciseNames.add(name);
    });
    setAvailableExercises(Array.from(exerciseNames).sort());

    const sessionDateMap: Record<string, string> = {};
    sessions.forEach(s => { sessionDateMap[s.id] = s.date; });

    // Week map
    const weekMap: Record<string, { ntu: number; rirSum: number; rirCount: number; sessionIds: Set<string>; patternVolume: Record<string, number>; maxWeight: Record<string, number>; sessionRirMap: Record<string, { sum: number; count: number }> }> = {};
    for (let i = 11; i >= 0; i--) {
      const ws = format(startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      weekMap[ws] = { ntu: 0, rirSum: 0, rirCount: 0, sessionIds: new Set(), patternVolume: {}, maxWeight: {}, sessionRirMap: {} };
    }

    sessions.forEach(s => {
      const ws = format(startOfWeek(new Date(s.date + 'T00:00:00'), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      if (weekMap[ws]) {
        weekMap[ws].ntu += Number(s.total_ntu) || 0;
        weekMap[ws].sessionIds.add(s.id);
      }
    });

    setRows.forEach((set: any) => {
      if (!set.completed) return;
      const se = seLookup[set.session_exercise_id];
      if (!se) return;
      const sessionDate = sessionDateMap[se.session_id];
      if (!sessionDate) return;
      const ws = format(startOfWeek(new Date(sessionDate + 'T00:00:00'), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      if (!weekMap[ws]) return;

      if (set.rir !== null && set.rir !== undefined) {
        weekMap[ws].rirSum += Number(set.rir);
        weekMap[ws].rirCount++;
        if (!weekMap[ws].sessionRirMap[se.session_id]) weekMap[ws].sessionRirMap[se.session_id] = { sum: 0, count: 0 };
        weekMap[ws].sessionRirMap[se.session_id].sum += Number(set.rir);
        weekMap[ws].sessionRirMap[se.session_id].count++;
      }

      const vol = (Number(set.reps) || 0) * (Number(set.weight_kg) || 0);
      weekMap[ws].patternVolume[se.pattern] = (weekMap[ws].patternVolume[se.pattern] || 0) + vol;

      const w = Number(set.weight_kg) || 0;
      if (w > 0) {
        const exName = se.exerciseName;
        weekMap[ws].maxWeight[exName] = Math.max(weekMap[ws].maxWeight[exName] || 0, w);
      }
    });

    const weeks = Object.entries(weekMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ws, data], i) => ({
        week: `W${i + 1}`,
        weekStart: ws,
        ntu: Math.round(data.ntu),
        avgRir: data.rirCount > 0 ? Math.round((data.rirSum / data.rirCount) * 10) / 10 : 0,
        sessionCount: data.sessionIds.size,
        patternVolume: data.patternVolume,
        maxWeight: data.maxWeight,
        sessionRirs: Object.values(data.sessionRirMap).map(sr => ({ avgRir: sr.count > 0 ? Math.round((sr.sum / sr.count) * 10) / 10 : 0 })),
      }));

    setWeeklyData(weeks);

    // Build heatmap
    const heatmap: HeatmapDay[][] = [];
    const sessionDateSet = new Set(sessions.map(s => s.date));
    const sessionNtuMap: Record<string, number> = {};
    sessions.forEach(s => { sessionNtuMap[s.date] = (sessionNtuMap[s.date] || 0) + (Number(s.total_ntu) || 0); });
    for (let w = 11; w >= 0; w--) {
      const ws = startOfWeek(subWeeks(new Date(), w), { weekStartsOn: 1 });
      const weekDays: HeatmapDay[] = [];
      for (let d = 0; d < 7; d++) {
        const day = format(new Date(ws.getTime() + d * 86400000), 'yyyy-MM-dd');
        weekDays.push({ hasSession: sessionDateSet.has(day), ntu: sessionNtuMap[day] || 0 });
      }
      heatmap.push(weekDays);
    }
    setHeatmapData(heatmap);
    setLoading(false);
  };

  const buildEmptyWeeks = (): WeekData[] => Array.from({ length: 12 }, (_, i) => ({
    week: `W${i + 1}`, weekStart: format(startOfWeek(subWeeks(new Date(), 11 - i), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    ntu: 0, avgRir: 0, sessionCount: 0, patternVolume: {}, maxWeight: {}, sessionRirs: [],
  }));

  const buildEmptyHeatmap = (): HeatmapDay[][] => Array.from({ length: 12 }, () => Array.from({ length: 7 }, () => ({ hasSession: false, ntu: 0 })));

  const totalSessions = useMemo(() => weeklyData.reduce((s, w) => s + w.sessionCount, 0), [weeklyData]);
  const maxNtu = useMemo(() => Math.max(...weeklyData.map(d => d.ntu), 1), [weeklyData]);

  // Strength trend for selected exercise
  const strengthData = useMemo(() => {
    return weeklyData.slice(-9).map(w => ({
      week: w.week,
      weight: w.maxWeight[selectedStrengthExercise] || 0,
    }));
  }, [weeklyData, selectedStrengthExercise]);

  const strengthStart = strengthData.find(d => d.weight > 0)?.weight || 0;
  const strengthCurrent = [...strengthData].reverse().find(d => d.weight > 0)?.weight || 0;
  const strengthGain = strengthCurrent - strengthStart;
  const maxStrength = Math.max(...strengthData.map(d => d.weight), 1);

  // Pattern totals
  const patternTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    weeklyData.forEach(w => {
      Object.entries(w.patternVolume).forEach(([p, v]) => { totals[p] = (totals[p] || 0) + v; });
    });
    return Object.entries(totals).sort(([, a], [, b]) => b - a);
  }, [weeklyData]);
  const maxPatternVol = useMemo(() => Math.max(...patternTotals.map(([, v]) => v), 1), [patternTotals]);

  // Compliance
  const TARGET_SESSIONS_PER_WEEK = 4;
  const compliancePercent = useMemo(() => {
    const totalTarget = weeklyData.length * TARGET_SESSIONS_PER_WEEK;
    return totalTarget > 0 ? Math.round((totalSessions / totalTarget) * 100) : 0;
  }, [weeklyData, totalSessions]);

  // All session RIRs flattened for proximity chart
  const sessionRirList = useMemo(() => {
    return weeklyData.flatMap(w => w.sessionRirs).slice(-8);
  }, [weeklyData]);
  const currentAvgRir = sessionRirList.length > 0
    ? Math.round(sessionRirList.reduce((s, r) => s + r.avgRir, 0) / sessionRirList.length * 10) / 10
    : 0;

  // Heatmap max NTU for opacity scaling
  const heatmapMaxNtu = useMemo(() => Math.max(...heatmapData.flat().map(d => d.ntu), 1), [heatmapData]);

  // Warning for underrepresented pattern
  const patternWarning = useMemo(() => {
    if (patternTotals.length < 2) return null;
    const maxV = patternTotals[0][1];
    const weak = patternTotals.find(([, v]) => v < maxV * 0.2);
    return weak ? weak[0] : null;
  }, [patternTotals]);

  const rirBarColor = (rir: number) => {
    if (rir <= 1) return 'hsl(var(--ok))';
    if (rir <= 3) return 'hsl(var(--warn))';
    return 'hsla(38,92%,50%,0.4)';
  };

  return (
    <div className="max-w-lg mx-auto px-4 space-y-2">
      {/* 1. STRENGTH TREND */}
      <ChartCard
        label="Strength Trend"
        badge={
          <div className="relative">
            <button
              onClick={() => setShowExPicker(!showExPicker)}
              className="flex items-center gap-1"
              style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, background: 'hsl(var(--pg))', color: 'hsl(var(--primary))', padding: '2px 6px', borderRadius: 4, border: '1px solid hsla(192,91%,54%,0.25)', textTransform: 'uppercase', cursor: 'pointer' }}
            >
              {selectedStrengthExercise}
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            {showExPicker && (
              <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border2))', borderRadius: 8, maxHeight: 200, overflowY: 'auto', zIndex: 20, minWidth: 160 }}>
                {availableExercises.map((ex, idx) => (
                  <button key={ex} onClick={() => { setSelectedStrengthExercise(ex); setShowExPicker(false); }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontFamily: 'Inter, sans-serif', fontSize: 12, color: ex === selectedStrengthExercise ? 'hsl(var(--primary))' : 'hsl(var(--text))', background: 'transparent', border: 'none', borderBottom: idx < availableExercises.length - 1 ? '1px solid hsl(var(--border))' : 'none', cursor: 'pointer' }}
                  >{ex}</button>
                ))}
              </div>
            )}
          </div>
        }
      >
        {strengthData.some(d => d.weight > 0) ? (
          <>
            <div className="flex items-end gap-1" style={{ height: 80 }}>
              {strengthData.map((d, i) => {
                const h = maxStrength > 0 ? (d.weight / maxStrength) * 100 : 0;
                const isLast = i === strengthData.length - 1;
                const opacity = isLast ? 1 : 0.25 + (i / (strengthData.length - 1)) * 0.75;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                    <div style={{ width: '100%', height: `${Math.max(h, 2)}%`, background: `hsla(192,91%,54%,${opacity})`, borderRadius: '3px 3px 0 0', ...(isLast ? { filter: 'drop-shadow(0 0 4px hsl(192,91%,54%))' } : {}) }} />
                  </div>
                );
              })}
            </div>
            <div className="flex gap-1 mt-1">
              {strengthData.map((d, i) => (
                <span key={i} className="flex-1 text-center" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, color: 'hsl(var(--dim))' }}>
                  {i % 2 === 0 ? d.week : ''}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid hsl(var(--border))' }}>
              <div className="text-center flex-1">
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, color: 'hsl(var(--dim))', textTransform: 'uppercase' }}>Start</p>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'hsl(var(--dim))' }}>{strengthStart > 0 ? `${strengthStart}kg` : '—'}</p>
              </div>
              <div className="text-center flex-1">
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, color: 'hsl(var(--dim))', textTransform: 'uppercase' }}>Current</p>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'hsl(var(--primary))' }}>{strengthCurrent > 0 ? `${strengthCurrent}kg` : '—'}</p>
              </div>
              <div className="text-center flex-1">
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, color: 'hsl(var(--dim))', textTransform: 'uppercase' }}>Gain</p>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: strengthGain > 0 ? 'hsl(var(--ok))' : 'hsl(var(--dim))' }}>{strengthGain > 0 ? `+${strengthGain}kg` : '—'}</p>
              </div>
            </div>
          </>
        ) : (
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'hsl(var(--dim))', textAlign: 'center', padding: '20px 0' }}>No data yet. Log sets to see trends.</p>
        )}
      </ChartCard>

      {/* 2. WEEKLY VOLUME */}
      <ChartCard
        label="Weekly Volume"
        badge={<span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, fontWeight: 700, background: 'hsl(var(--pg))', color: 'hsl(var(--primary))', padding: '2px 6px', borderRadius: 4, border: '1px solid hsla(192,91%,54%,0.25)', display: 'inline-block' }}>NTU</span>}
      >
        {weeklyData.some(d => d.ntu > 0) ? (
          <>
            <div className="flex items-end gap-1" style={{ height: 80 }}>
              {weeklyData.slice(-8).map((d, i, arr) => {
                const h = maxNtu > 0 ? (d.ntu / maxNtu) * 100 : 0;
                const isLast = i === arr.length - 1;
                const opacity = isLast ? 1 : 0.25 + (i / (arr.length - 1)) * 0.75;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                    <div style={{ width: '100%', height: `${Math.max(h, 2)}%`, background: `hsla(192,91%,54%,${opacity})`, borderRadius: '3px 3px 0 0', ...(isLast ? { filter: 'drop-shadow(0 0 4px hsl(192,91%,54%))' } : {}) }} />
                  </div>
                );
              })}
            </div>
            <div className="flex gap-1 mt-1">
              {weeklyData.slice(-8).map((_, i, arr) => {
                const weeksBack = arr.length - 1 - i;
                const label = weeksBack === 0 ? 'This wk' : weeksBack === 1 ? '1 wk' : `${weeksBack} wks`;
                return <span key={i} className="flex-1 text-center" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, color: 'hsl(var(--dim))' }}>{i === 0 || i === arr.length - 1 || i === Math.floor(arr.length / 2) ? label : ''}</span>;
              })}
            </div>
          </>
        ) : (
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'hsl(var(--dim))', textAlign: 'center', padding: '20px 0' }}>No data yet.</p>
        )}
      </ChartCard>

      {/* 3. PROXIMITY TO FAILURE */}
      <ChartCard
        label="Proximity to Failure (Avg RIR)"
        badge={sessionRirList.length > 0 ? <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'hsl(var(--warn))', fontWeight: 600 }}>{currentAvgRir}</span> : undefined}
      >
        {sessionRirList.length > 0 ? (
          <>
            <div className="flex items-end gap-1" style={{ height: 60 }}>
              {sessionRirList.map((sr, i) => {
                const h = sr.avgRir > 0 ? Math.max((sr.avgRir / 5) * 100, 8) : 2;
                return (
                  <div key={i} className="flex-1 flex items-end justify-center h-full">
                    <div style={{ width: '100%', height: `${h}%`, background: rirBarColor(sr.avgRir), borderRadius: '3px 3px 0 0' }} />
                  </div>
                );
              })}
            </div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, color: 'hsl(var(--dim))', marginTop: 8 }}>
              RIR 0-1 = Failure zone · 2-3 = Performance zone · 4+ = Too easy
            </p>
          </>
        ) : (
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'hsl(var(--dim))', textAlign: 'center', padding: '20px 0' }}>No RIR data yet.</p>
        )}
      </ChartCard>

      {/* 4. MOVEMENT BALANCE */}
      <ChartCard label="Movement Balance (12 wks)">
        {patternTotals.length > 0 ? (
          <div className="space-y-2">
            {patternTotals.map(([pattern, vol]) => {
              const pct = (vol / maxPatternVol) * 100;
              const color = MOVEMENT_COLORS[pattern] || 'hsl(var(--dim))';
              const abbrev = PATTERN_ABBREV[pattern] || pattern.slice(0, 3).toUpperCase();
              return (
                <div key={pattern} className="flex items-center gap-2">
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: 'hsl(var(--dim))', width: 28, textAlign: 'right', flexShrink: 0 }}>{abbrev}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'hsl(var(--bg4))' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: 'hsl(var(--text))', width: 40, textAlign: 'right' }}>{Math.round(vol).toLocaleString()}</span>
                </div>
              );
            })}
            {patternWarning && (
              <div style={{ background: 'hsla(38,92%,50%,0.06)', border: '1px solid hsla(38,92%,50%,0.15)', borderRadius: 6, padding: '6px 8px', marginTop: 6 }}>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: 'hsl(var(--warn))' }}>⚠ {patternWarning} is underrepresented ({'<'}20% of max)</p>
              </div>
            )}
          </div>
        ) : (
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'hsl(var(--dim))', textAlign: 'center', padding: '20px 0' }}>No data yet.</p>
        )}
      </ChartCard>

      {/* 5. WORKOUT COMPLIANCE */}
      <ChartCard label="Workout Compliance">
        <div className="flex items-center gap-6">
          <div className="relative w-20 h-20 shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--bg4))" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--primary))" strokeWidth="3"
                strokeDasharray={`${compliancePercent} ${100 - compliancePercent}`} strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: 'hsl(var(--primary))', fontWeight: 700 }}>{compliancePercent}%</span>
          </div>
          <div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'hsl(var(--text))' }}>{totalSessions} sessions</p>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'hsl(var(--dim))' }}>of {weeklyData.length * TARGET_SESSIONS_PER_WEEK} target ({TARGET_SESSIONS_PER_WEEK}/wk)</p>
          </div>
        </div>
      </ChartCard>

      {/* 6. TRAINING CONSISTENCY — HEATMAP */}
      <ChartCard label="Training Consistency (12 wks)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2 }}>
          {heatmapData.map((week, wi) =>
            week.map((day, di) => {
              const opacity = day.hasSession ? Math.max(0.3, day.ntu / heatmapMaxNtu) : 0;
              return (
                <div
                  key={`${wi}-${di}`}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 2,
                    background: day.hasSession ? `hsla(192,91%,54%,${opacity})` : 'hsl(var(--bg4))',
                  }}
                />
              );
            })
          )}
        </div>
        {/* Legend */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, color: 'hsl(var(--dim))' }}>Less</span>
          <div style={{ width: 60, height: 4, borderRadius: 2, background: 'linear-gradient(to right, hsl(var(--bg4)), hsl(var(--primary)))' }} />
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, color: 'hsl(var(--dim))' }}>More</span>
        </div>
      </ChartCard>
    </div>
  );
};
