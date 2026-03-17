import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const pipColor: Record<string, string> = {
  'Hinge': 'hsl(0,72%,51%)',
  'Squat': 'hsl(262,60%,55%)',
  'Push': 'hsl(192,91%,54%)',
  'Pull': 'hsl(142,71%,45%)',
  'Single Leg': 'hsl(38,92%,50%)',
  'Carry': 'hsl(38,92%,50%)',
  'Core': 'hsl(215,14%,50%)',
  'Olympic': 'hsl(45,93%,58%)',
  'Conditioning': 'hsl(38,92%,50%)',
  'Isolation': 'hsl(215,14%,50%)',
};

const tierColors: Record<string, { bg: string; color: string; border: string }> = {
  free: { bg: 'hsla(215,14%,50%,0.1)', color: 'hsl(var(--dim))', border: 'hsla(215,14%,50%,0.3)' },
  basic: { bg: 'hsla(192,91%,54%,0.1)', color: 'hsl(var(--primary))', border: 'hsla(192,91%,54%,0.3)' },
  pro: { bg: 'hsla(38,92%,50%,0.1)', color: 'hsl(var(--warn))', border: 'hsla(38,92%,50%,0.3)' },
  elite: { bg: 'hsla(45,93%,58%,0.1)', color: 'hsl(var(--gold))', border: 'hsla(45,93%,58%,0.3)' },
};

const stressColor = (v: number) => {
  if (v <= 4) return 'hsl(var(--ok))';
  if (v <= 7) return 'hsl(var(--warn))';
  return 'hsl(var(--bad))';
};

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };
const sectionLabel = (color: string): React.CSSProperties => ({
  ...mono, fontSize: 8, color, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10,
});
const cardStyle: React.CSSProperties = {
  background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))', borderRadius: 10, padding: 14, marginBottom: 12,
};

const AdminClientProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const notesRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [sessionsWk, setSessionsWk] = useState<number | null>(null);
  const [volumeKg, setVolumeKg] = useState<number | null>(null);
  const [prsWk, setPrsWk] = useState<number | null>(null);
  const [latestCheckin, setLatestCheckin] = useState<any>(null);
  const [patternVolume, setPatternVolume] = useState<Record<string, number>>({});
  const [rirTrend, setRirTrend] = useState<number[]>([]);
  const [reflection, setReflection] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [dmText, setDmText] = useState('');
  const [noteText, setNoteText] = useState('');
  const [sending, setSending] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [compliancePct, setCompliancePct] = useState(0);
  const [streak, setStreak] = useState(0);
  const [programmeName, setProgrammeName] = useState('');
  const [daysPerWk, setDaysPerWk] = useState(0);

  const now = useMemo(() => new Date(), []);
  const getMonday = (d: Date) => {
    const dt = new Date(d); const day = dt.getDay();
    dt.setDate(dt.getDate() - day + (day === 0 ? -6 : 1));
    dt.setHours(0, 0, 0, 0); return dt;
  };
  const monday = useMemo(() => getMonday(now), [now]);
  const mondayStr = monday.toISOString().slice(0, 10);
  const thirtyDaysAgo = useMemo(() => {
    const d = new Date(now); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10);
  }, [now]);

  useEffect(() => { if (userId) loadAll(); }, [userId]);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadProfile(), loadStats(), loadCheckin(), loadPatternVolume(), loadRirTrend(), loadReflection(), loadNotes(), loadMeta()]);
    setLoading(false);
  };

  const loadProfile = async () => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId!).single();
      setProfile(data);
    } catch { setProfile(null); }
  };

  const loadStats = async () => {
    try {
      const { count } = await supabase.from('training_sessions').select('*', { count: 'exact', head: true }).eq('user_id', userId!).gte('date', mondayStr);
      setSessionsWk(count ?? 0);
    } catch { setSessionsWk(null); }

    try {
      const { data: sessions } = await supabase.from('training_sessions').select('id').eq('user_id', userId!).gte('date', mondayStr);
      if (sessions && sessions.length > 0) {
        const sIds = sessions.map(s => s.id);
        const { data: exs } = await supabase.from('session_exercises').select('id').in('session_id', sIds);
        if (exs && exs.length > 0) {
          const eIds = exs.map(e => e.id);
          let totalVol = 0;
          for (let i = 0; i < eIds.length; i += 50) {
            const chunk = eIds.slice(i, i + 50);
            const { data: sets } = await supabase.from('exercise_sets').select('weight_kg, reps').in('session_exercise_id', chunk).eq('completed', true);
            if (sets) sets.forEach(s => { totalVol += (Number(s.weight_kg) || 0) * (s.reps || 1); });
          }
          setVolumeKg(Math.round(totalVol));
        } else { setVolumeKg(0); }
      } else { setVolumeKg(0); }
    } catch { setVolumeKg(null); }

    try {
      const { count } = await supabase.from('personal_records').select('*', { count: 'exact', head: true }).eq('user_id', userId!).gte('achieved_at', mondayStr);
      setPrsWk(count ?? 0);
    } catch { setPrsWk(null); }
  };

  const loadCheckin = async () => {
    try {
      const { data } = await supabase.from('daily_checkins').select('*').eq('user_id', userId!).order('date', { ascending: false }).limit(1);
      setLatestCheckin(data?.[0] ?? null);
    } catch { setLatestCheckin(null); }
  };

  const loadPatternVolume = async () => {
    try {
      const { data: sessions } = await supabase.from('training_sessions').select('id').eq('user_id', userId!).gte('date', thirtyDaysAgo).eq('completed', true);
      if (!sessions || sessions.length === 0) { setPatternVolume({}); return; }
      const sIds = sessions.map(s => s.id);
      const { data: exs } = await supabase.from('session_exercises').select('id, exercise_id').in('session_id', sIds);
      if (!exs || exs.length === 0) { setPatternVolume({}); return; }
      const exIds = [...new Set(exs.map(e => e.exercise_id))];
      const { data: exercises } = await supabase.from('exercises').select('id, movement_pattern').in('id', exIds);
      const patternMap: Record<string, string> = {};
      exercises?.forEach(e => { if (e.movement_pattern) patternMap[e.id] = e.movement_pattern; });
      const seIds = exs.map(e => e.id);
      const vol: Record<string, number> = {};
      for (let i = 0; i < seIds.length; i += 50) {
        const chunk = seIds.slice(i, i + 50);
        const { data: sets } = await supabase.from('exercise_sets').select('session_exercise_id, weight_kg, reps').in('session_exercise_id', chunk).eq('completed', true);
        sets?.forEach(s => {
          const se = exs.find(e => e.id === s.session_exercise_id);
          if (se) {
            const p = patternMap[se.exercise_id] || 'Other';
            vol[p] = (vol[p] || 0) + (Number(s.weight_kg) || 0) * (s.reps || 1);
          }
        });
      }
      setPatternVolume(vol);
    } catch { setPatternVolume({}); }
  };

  const loadRirTrend = async () => {
    try {
      const { data: sessions } = await supabase.from('training_sessions').select('id, date').eq('user_id', userId!).eq('completed', true).order('date', { ascending: false }).limit(7);
      if (!sessions || sessions.length === 0) { setRirTrend([]); return; }
      const avgs: number[] = [];
      for (const s of sessions) {
        const { data: exs } = await supabase.from('session_exercises').select('id').eq('session_id', s.id);
        if (!exs || exs.length === 0) { avgs.push(-1); continue; }
        const { data: sets } = await supabase.from('exercise_sets').select('rir').in('session_exercise_id', exs.map(e => e.id)).not('rir', 'is', null);
        if (sets && sets.length > 0) {
          const avg = sets.reduce((a, s) => a + (s.rir ?? 0), 0) / sets.length;
          avgs.push(Math.round(avg * 10) / 10);
        } else { avgs.push(-1); }
      }
      setRirTrend(avgs.reverse());
    } catch { setRirTrend([]); }
  };

  const loadReflection = async () => {
    try {
      const { data } = await supabase.from('weekly_reflections').select('*').eq('user_id', userId!).gte('week_start', mondayStr).limit(1);
      setReflection(data?.[0] ?? null);
    } catch { setReflection(null); }
  };

  const loadNotes = async () => {
    try {
      const { data } = await supabase.from('coaching_notes').select('*').eq('user_id', userId!).order('created_at', { ascending: false }).limit(20);
      setNotes(data ?? []);
    } catch { setNotes([]); }
  };

  const loadMeta = async () => {
    try {
      const { data: prog } = await supabase.from('training_programmes').select('name').eq('user_id', userId!).eq('is_active', true).limit(1);
      setProgrammeName(prog?.[0]?.name ?? '');
    } catch { setProgrammeName(''); }
    try {
      const sevenAgo = new Date(now); sevenAgo.setDate(sevenAgo.getDate() - 7);
      const { count: comp } = await supabase.from('training_sessions').select('*', { count: 'exact', head: true }).eq('user_id', userId!).eq('completed', true).gte('date', sevenAgo.toISOString().slice(0, 10));
      const { count: tot } = await supabase.from('training_sessions').select('*', { count: 'exact', head: true }).eq('user_id', userId!).gte('date', sevenAgo.toISOString().slice(0, 10));
      setCompliancePct(tot && tot > 0 ? Math.round(((comp ?? 0) / tot) * 100) : 0);
      setDaysPerWk(comp ?? 0);
    } catch { setCompliancePct(0); setDaysPerWk(0); }
    try {
      const { data: sess } = await supabase.from('training_sessions').select('date').eq('user_id', userId!).eq('completed', true).order('date', { ascending: false }).limit(60);
      if (sess && sess.length > 0) {
        let s = 0; let prev = new Date(now.toISOString().slice(0, 10));
        for (const r of sess) {
          const d = new Date(r.date);
          const diff = (prev.getTime() - d.getTime()) / 86400000;
          if (diff <= 2) { s++; prev = d; } else break;
        }
        setStreak(s);
      } else { setStreak(0); }
    } catch { setStreak(0); }
  };

  const sendDm = async () => {
    if (!dmText.trim() || !user) return;
    setSending(true);
    try {
      await supabase.from('coaching_notes').insert({ user_id: userId!, coach_id: user.id, content: dmText.trim(), is_pinned: false });
      setDmText('');
      loadNotes();
    } catch { /* silent */ }
    setSending(false);
  };

  const saveNote = async () => {
    if (!noteText.trim() || !user) return;
    setSavingNote(true);
    try {
      await supabase.from('coaching_notes').insert({ user_id: userId!, coach_id: user.id, content: noteText.trim(), is_pinned: false });
      setNoteText('');
      loadNotes();
    } catch { /* silent */ }
    setSavingNote(false);
  };

  const suspendClient = async () => {
    try {
      await supabase.from('profiles').update({ role: 'suspended' }).eq('id', userId!);
      loadProfile();
    } catch { /* silent */ }
  };

  const deleteClient = async () => {
    try {
      await supabase.from('profiles').update({ role: 'deleted' }).eq('id', userId!);
      navigate('/admin');
    } catch { /* silent */ }
  };

  const updateTier = async (tier: string) => {
    try {
      await supabase.from('profiles').update({ tier }).eq('id', userId!);
      setProfile((p: any) => ({ ...p, tier }));
    } catch { /* silent */ }
  };

  const initials = (name: string) => name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';

  const readiness = latestCheckin
    ? Math.round(Math.max(0, Math.min(100, ((10 - (latestCheckin.stress || 5)) + ((latestCheckin.sleep_hours || 7) / 8) * 5) / 15 * 100)))
    : null;

  const isActive = sessionsWk !== null && sessionsWk > 0;
  const tc = tierColors[profile?.tier || 'free'] || tierColors.free;
  const maxVol = Math.max(...Object.values(patternVolume), 1);
  const lowPatterns = Object.entries(patternVolume).filter(([, v]) => v < maxVol * 0.1).map(([k]) => k);

  if (!loading && !profile) {
    return (
      <div style={{ background: 'hsl(var(--bg))', minHeight: '100vh', padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ ...mono, fontSize: 14, color: 'hsl(var(--dim))' }}>Client not found</div>
        <button onClick={() => navigate('/admin')} style={{ ...mono, fontSize: 11, color: 'hsl(var(--primary))', background: 'none', border: 'none', cursor: 'pointer' }}>← Back to Admin</button>
      </div>
    );
  }

  return (
    <div style={{ background: 'hsl(var(--bg))', minHeight: '100vh', padding: 16, paddingBottom: 80 }}>
      {/* TOP BAR */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button onClick={() => navigate('/admin')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <ArrowLeft size={20} style={{ color: 'hsl(var(--dim))' }} />
        </button>
        {loading ? <Skeleton className="h-8 w-48 rounded" /> : (
          <>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', background: 'hsl(var(--bg3))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              ...mono, fontSize: 11, color: 'hsl(var(--dim))', flexShrink: 0,
            }}>{initials(profile?.full_name || '')}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'hsl(var(--text))' }}>{profile?.full_name || 'Unknown'}</div>
              <div style={{ ...mono, fontSize: 9, color: 'hsl(var(--dim))', marginTop: 1 }}>
                {programmeName || 'No programme'} · {daysPerWk}x/wk · Compliance {compliancePct}% · Streak {streak}d
              </div>
            </div>
            <span style={{ ...mono, fontSize: 8, padding: '2px 6px', borderRadius: 3, background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`, flexShrink: 0 }}>
              {(profile?.tier || 'free').toUpperCase()}
            </span>
            <span style={{
              ...mono, fontSize: 8, padding: '2px 6px', borderRadius: 3, flexShrink: 0,
              background: isActive ? 'hsla(142,71%,45%,0.1)' : 'hsla(0,72%,51%,0.1)',
              color: isActive ? 'hsl(var(--ok))' : 'hsl(var(--bad))',
              border: `1px solid ${isActive ? 'hsla(142,71%,45%,0.3)' : 'hsla(0,72%,51%,0.3)'}`,
            }}>{isActive ? 'ACTIVE' : 'INACTIVE'}</span>
          </>
        )}
      </div>

      {/* STAT CARDS */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-[70px] rounded-[10px]" />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'SESSIONS', value: sessionsWk },
            { label: 'VOLUME KG', value: volumeKg !== null ? volumeKg.toLocaleString() : '—' },
            { label: 'PRS', value: prsWk },
          ].map((s, i) => (
            <div key={i} style={cardStyle}>
              <div style={{ ...mono, fontSize: 20, color: 'hsl(var(--primary))', lineHeight: 1 }}>{s.value ?? '—'}</div>
              <div style={{ ...mono, fontSize: 7, color: 'hsl(var(--dim))', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* READINESS & LIFESTYLE */}
      <div style={cardStyle}>
        <div style={sectionLabel('hsl(var(--dim))')}>READINESS & LIFESTYLE</div>
        {loading ? <Skeleton className="h-10 w-full rounded" /> : latestCheckin ? (
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ ...mono, fontSize: 18, color: 'hsl(var(--primary))' }}>{latestCheckin.sleep_hours ?? '—'}h</div>
              <div style={{ ...mono, fontSize: 7, color: 'hsl(var(--dim))', textTransform: 'uppercase', letterSpacing: 1 }}>Sleep</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ ...mono, fontSize: 18, color: stressColor(latestCheckin.stress || 5) }}>{latestCheckin.stress ?? '—'}/10</div>
              <div style={{ ...mono, fontSize: 7, color: 'hsl(var(--dim))', textTransform: 'uppercase', letterSpacing: 1 }}>Stress</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ ...mono, fontSize: 18, color: 'hsl(var(--primary))' }}>{readiness ?? '—'}%</div>
              <div style={{ ...mono, fontSize: 7, color: 'hsl(var(--dim))', textTransform: 'uppercase', letterSpacing: 1 }}>Readiness</div>
            </div>
          </div>
        ) : (
          <div style={{ ...mono, fontSize: 11, color: 'hsl(var(--dim))' }}>No check-in data</div>
        )}
      </div>

      {/* AI CLIENT REPORT */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={sectionLabel('hsl(var(--dim))')}>AI CLIENT REPORT</div>
          <button disabled style={{
            ...mono, fontSize: 10, padding: '3px 10px', borderRadius: 4, cursor: 'not-allowed', opacity: 0.5,
            background: 'hsla(192,91%,54%,0.1)', color: 'hsl(var(--primary))', border: '1px solid hsla(192,91%,54%,0.2)',
          }}>Generate →</button>
        </div>
        {[
          { label: 'TRAINING', color: 'hsl(var(--primary))', text: 'Complete more sessions to generate AI training analysis.' },
          { label: 'LIFESTYLE', color: 'hsl(var(--warn))', text: 'Check-in data will appear here after 7 days.' },
          { label: 'RECOMMENDATION', color: 'hsl(var(--ok))', text: 'AI recommendations activate in Phase 4.' },
        ].map((s, i) => (
          <div key={i} style={{ borderLeft: `3px solid ${s.color}`, paddingLeft: 10, marginBottom: 10 }}>
            <div style={{ ...mono, fontSize: 9, color: s.color, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 12, color: 'hsl(var(--mid))' }}>{s.text}</div>
          </div>
        ))}
      </div>

      {/* SEND DM */}
      <div style={cardStyle}>
        <div style={sectionLabel('hsl(var(--dim))')}>SEND DM TO {(profile?.full_name || 'CLIENT').toUpperCase()}</div>
        <input
          value={dmText} onChange={e => setDmText(e.target.value)}
          placeholder="Write a message..."
          style={{
            width: '100%', background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border2))',
            borderRadius: 8, padding: 10, fontSize: 12, color: 'hsl(var(--text))', outline: 'none', marginBottom: 8, boxSizing: 'border-box',
          }}
        />
        <button onClick={sendDm} disabled={sending || !dmText.trim()} style={{
          width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: 'hsl(var(--primary))', color: 'hsl(220,16%,6%)', fontWeight: 700, fontSize: 12,
          opacity: sending || !dmText.trim() ? 0.5 : 1,
        }}>Send Message</button>
      </div>

      {/* WEEKLY REVIEW */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: 'hsl(var(--text))', margin: '0 0 2px 0' }}>WEEKLY REVIEW</h2>
        <div style={{ ...mono, fontSize: 9, color: 'hsl(var(--dim))', marginBottom: 14 }}>Coach's view — All data in one place</div>

        {/* VOLUME BY PATTERN */}
        <div style={cardStyle}>
          <div style={sectionLabel('hsl(var(--dim))')}>VOLUME BY PATTERN (NTU)</div>
          {Object.keys(patternVolume).length === 0 ? (
            <div style={{ ...mono, fontSize: 11, color: 'hsl(var(--dim))' }}>No data yet</div>
          ) : (
            <>
              {Object.entries(patternVolume).sort((a, b) => b[1] - a[1]).map(([pattern, vol]) => (
                <div key={pattern} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ ...mono, fontSize: 8, color: 'hsl(var(--dim))', width: 60, textAlign: 'right', flexShrink: 0 }}>{pattern}</div>
                  <div style={{ flex: 1, height: 8, background: 'hsl(var(--bg3))', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${(vol / maxVol) * 100}%`, height: '100%', borderRadius: 4, background: pipColor[pattern] || 'hsl(var(--primary))' }} />
                  </div>
                  <div style={{ ...mono, fontSize: 8, color: 'hsl(var(--dim))', width: 40, flexShrink: 0 }}>{Math.round(vol)}</div>
                </div>
              ))}
              {lowPatterns.length > 0 && (
                <div style={{ marginTop: 8, padding: '6px 8px', borderRadius: 6, background: 'hsla(38,92%,50%,0.06)', border: '1px solid hsla(38,92%,50%,0.15)' }}>
                  {lowPatterns.map(p => (
                    <div key={p} style={{ ...mono, fontSize: 9, color: 'hsl(var(--warn))' }}>⚠ {p} volume significantly low</div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* AVG RIR TREND */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={sectionLabel('hsl(var(--dim))')}>AVG RIR TREND</div>
            {rirTrend.length > 0 && (
              <span style={{
                ...mono, fontSize: 8, padding: '1px 5px', borderRadius: 3,
                background: 'hsla(38,92%,50%,0.1)', color: 'hsl(var(--warn))',
              }}>{(rirTrend.filter(r => r >= 0).reduce((a, b) => a + b, 0) / Math.max(rirTrend.filter(r => r >= 0).length, 1)).toFixed(1)} avg</span>
            )}
          </div>
          {rirTrend.length === 0 ? (
            <div style={{ ...mono, fontSize: 11, color: 'hsl(var(--dim))' }}>No session data</div>
          ) : (
            <div style={{ display: 'flex', gap: 4 }}>
              {rirTrend.map((r, i) => (
                <div key={i} style={{
                  width: 28, height: 28, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  ...mono, fontSize: 9, color: 'hsl(var(--text))',
                  background: r < 0 ? 'hsl(var(--bg3))' : r <= 1 ? 'hsl(var(--ok))' : r <= 3 ? 'hsl(var(--warn))' : 'hsla(38,92%,50%,0.4)',
                }}>{r >= 0 ? r.toFixed(0) : '—'}</div>
              ))}
            </div>
          )}
        </div>

        {/* WEEKLY REFLECTION */}
        <div style={cardStyle}>
          <div style={sectionLabel('hsl(var(--dim))')}>WEEKLY REFLECTION</div>
          {reflection ? (
            <>
              {[
                { q: 'What went well?', a: reflection.wins },
                { q: "What didn't go to plan?", a: reflection.challenges },
                { q: 'What do you need help with?', a: reflection.focus_next_week },
              ].map((item, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ ...mono, fontSize: 8, color: 'hsl(var(--dim))', textTransform: 'uppercase', marginBottom: 2 }}>{item.q}</div>
                  <div style={{ fontSize: 12, color: 'hsl(var(--mid))' }}>{item.a || '—'}</div>
                </div>
              ))}
              <button onClick={() => notesRef.current?.scrollIntoView({ behavior: 'smooth' })} style={{
                ...mono, fontSize: 10, color: 'hsl(var(--primary))', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4,
              }}>Add Coaching Note ↓</button>
            </>
          ) : (
            <div style={{ ...mono, fontSize: 11, color: 'hsl(var(--dim))' }}>No reflection submitted this week</div>
          )}
        </div>
      </div>

      {/* COACHING NOTES */}
      <div ref={notesRef} style={{ marginBottom: 16 }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: 'hsl(var(--text))', margin: '0 0 2px 0' }}>COACHING NOTES</h2>
        <div style={{ ...mono, fontSize: 9, color: 'hsl(var(--dim))', marginBottom: 14 }}>Private — {profile?.full_name || 'client'} cannot see these</div>

        <textarea
          value={noteText} onChange={e => setNoteText(e.target.value)}
          placeholder="Add a coaching note..."
          rows={3}
          style={{
            width: '100%', background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border2))',
            borderRadius: 8, padding: 10, fontSize: 12, color: 'hsl(var(--text))', outline: 'none', resize: 'vertical', marginBottom: 8, boxSizing: 'border-box',
          }}
        />
        <button onClick={saveNote} disabled={savingNote || !noteText.trim()} style={{
          width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: 'hsl(var(--primary))', color: 'hsl(220,16%,6%)', fontWeight: 700, fontSize: 12,
          opacity: savingNote || !noteText.trim() ? 0.5 : 1, marginBottom: 16,
        }}>Save Note</button>

        {/* TOUCHPOINT HISTORY */}
        {notes.length === 0 ? (
          <div style={{ ...mono, fontSize: 11, color: 'hsl(var(--dim))' }}>No notes yet</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notes.map((n) => (
              <div key={n.id} style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: '1px solid hsl(var(--border))' }}>
                <span style={{
                  ...mono, fontSize: 7, padding: '2px 5px', borderRadius: 3, flexShrink: 0, height: 'fit-content',
                  background: 'hsla(38,92%,50%,0.15)', color: 'hsl(var(--warn))',
                }}>NOTE</span>
                <div style={{ flex: 1, fontSize: 12, color: 'hsl(var(--mid))' }}>{n.content}</div>
                <div style={{ ...mono, fontSize: 9, color: 'hsl(var(--dim))', flexShrink: 0 }}>
                  {new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CLIENT SETTINGS */}
      <div style={{ marginBottom: 16 }}>
        <div style={sectionLabel('hsl(var(--dim))')}>CLIENT SETTINGS</div>

        {/* Tier selector */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ ...mono, fontSize: 7, color: 'hsl(var(--dim))', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>SUBSCRIPTION TIER</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['free', 'basic', 'pro', 'elite'].map(t => {
              const active = profile?.tier === t;
              const c = tierColors[t];
              return (
                <button key={t} onClick={() => updateTier(t)} style={{
                  ...mono, fontSize: 9, padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                  background: active ? c.bg : 'transparent',
                  color: active ? c.color : 'hsl(var(--dim))',
                  border: `1px solid ${active ? c.border : 'hsl(var(--border))'}`,
                }}>{t.toUpperCase()}</button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button style={{
                flex: 1, padding: '10px 0', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: 'transparent', border: '1px solid hsl(var(--bad))', color: 'hsl(var(--bad))',
              }}>Suspend</button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Suspend client?</AlertDialogTitle>
                <AlertDialogDescription>This will set the client's role to suspended. They won't be able to access the app.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={suspendClient}>Suspend</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button style={{
                flex: 1, padding: '10px 0', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: 'hsl(var(--bad))', border: 'none', color: 'hsl(var(--text))',
              }}>Delete</button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete client?</AlertDialogTitle>
                <AlertDialogDescription>This cannot be undone. The client's role will be set to deleted.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteClient}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
};

export default AdminClientProfile;
