import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';

interface Goal {
  id: string;
  title: string;
  metric: string | null;
  current_value: number;
  target_value: number;
  unit: string | null;
}

interface TrainingSession {
  id: string;
  date: string;
  completed: boolean;
}

interface ActiveProgramme {
  id: string;
  name: string;
  weeks: number | null;
  days_per_week: number | null;
  created_at: string | null;
}

interface UpdateItem {
  icon: string;
  title: string;
  sub: string;
}

const getGreeting = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'GOOD MORNING';
  if (h >= 12 && h < 17) return 'GOOD AFTERNOON';
  if (h >= 17 && h < 23) return 'GOOD EVENING';
  return 'GOOD EVENING';
};

const getWeekDates = () => {
  const now = new Date();
  const day = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
};

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const formatVolume = (v: number) => {
  if (v >= 1000) return (v / 1000).toFixed(1) + 'k';
  return String(Math.round(v));
};

const HomeDashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const firstName = profile?.full_name?.split(' ')[0] || 'Athlete';

  const [goals, setGoals] = useState<Goal[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', metric: '', current_value: 0, target_value: 0 });
  const [coachNote, setCoachNote] = useState<string | null>(null);
  const [weeklyReview, setWeeklyReview] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<{ id: string; content: string } | null>(null);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);

  // Readiness state
  const [checkin, setCheckin] = useState<{ sleep: number; energy: number; stress: number; mood: number; hasCheckin: boolean } | null>(null);

  // Programme state
  const [activeProgramme, setActiveProgramme] = useState<ActiveProgramme | null>(null);
  const [todayExerciseCount, setTodayExerciseCount] = useState(0);

  // Stats state
  const [weekVolume, setWeekVolume] = useState(0);
  const [weekAvgRir, setWeekAvgRir] = useState<number | null>(null);

  // Updates state
  const [updates, setUpdates] = useState<UpdateItem[]>([]);

  const weekDates = useMemo(() => getWeekDates(), []);
  const today = new Date().toISOString().split('T')[0];
  const todayFormatted = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const dayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();

  // Calculate current week of programme
  const currentProgrammeWeek = useMemo(() => {
    if (!activeProgramme?.created_at) return 1;
    const start = new Date(activeProgramme.created_at);
    const now = new Date();
    const diffWeeks = Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
    return Math.min(diffWeeks, activeProgramme.weeks ?? diffWeeks);
  }, [activeProgramme]);

  // Current day of week (1=Mon)
  const currentDayOfWeek = useMemo(() => {
    const d = new Date().getDay();
    return d === 0 ? 7 : d;
  }, []);

  useEffect(() => {
    if (!user) return;
    const uid = user.id;
    const mondayStr = weekDates[0].toISOString().split('T')[0];
    const sundayStr = weekDates[6].toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    // Goals
    supabase.from('goals').select('*').eq('user_id', uid).then(({ data }) => {
      if (data) setGoals(data.map(g => ({ ...g, current_value: Number(g.current_value) || 0, target_value: Number(g.target_value) || 0 })));
    });

    // Sessions this week
    supabase.from('training_sessions').select('*').eq('user_id', uid)
      .gte('date', mondayStr).lte('date', sundayStr)
      .then(({ data }) => { if (data) setSessions(data); });

    // Coach note
    supabase.from('coaching_notes').select('content').eq('user_id', uid).eq('is_pinned', true)
      .order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => { if (data?.[0]) setCoachNote(data[0].content); });

    // Weekly review
    supabase.from('weekly_reviews').select('summary').eq('user_id', uid)
      .order('generated_at', { ascending: false }).limit(1)
      .then(({ data }) => { if (data?.[0]) setWeeklyReview(data[0].summary); });

    // Readiness from today's check-in
    supabase.from('daily_checkins').select('sleep, energy, stress, mood')
      .eq('user_id', uid).eq('date', todayStr).limit(1).single()
      .then(({ data }) => {
        if (data) {
          setCheckin({ sleep: data.sleep ?? 5, energy: data.energy ?? 5, stress: data.stress ?? 5, mood: data.mood ?? 5, hasCheckin: true });
        } else {
          setCheckin({ sleep: 0, energy: 0, stress: 0, mood: 0, hasCheckin: false });
        }
      });

    // Active programme
    supabase.from('training_programmes').select('id, name, weeks, days_per_week, created_at')
      .eq('user_id', uid).eq('is_active', true).limit(1).single()
      .then(({ data }) => {
        if (data) {
          setActiveProgramme(data);
          // Get today's workout exercise count
          supabase.from('programme_workouts').select('prescribed_exercises')
            .eq('programme_id', data.id)
            .then(({ data: workouts }) => {
              if (workouts) {
                const todayDow = new Date().getDay() === 0 ? 7 : new Date().getDay();
                const todayWorkout = workouts.find((w: any) => w.day_number === todayDow);
                if (todayWorkout && Array.isArray(todayWorkout.prescribed_exercises)) {
                  setTodayExerciseCount((todayWorkout.prescribed_exercises as any[]).length);
                }
              }
            });
        }
      });

    // Volume + RIR this week
    supabase.from('training_sessions').select('id').eq('user_id', uid)
      .gte('date', mondayStr).lte('date', sundayStr).eq('completed', true)
      .then(({ data: weekSessions }) => {
        if (!weekSessions || weekSessions.length === 0) {
          setWeekVolume(0);
          setWeekAvgRir(null);
          return;
        }
        const sessionIds = weekSessions.map(s => s.id);
        supabase.from('session_exercises').select('id').in('session_id', sessionIds)
          .then(({ data: sesExercises }) => {
            if (!sesExercises || sesExercises.length === 0) { setWeekVolume(0); setWeekAvgRir(null); return; }
            const seIds = sesExercises.map(se => se.id);
            // Chunk if needed
            const chunks: string[][] = [];
            for (let i = 0; i < seIds.length; i += 100) chunks.push(seIds.slice(i, i + 100));
            Promise.all(chunks.map(chunk =>
              supabase.from('exercise_sets').select('reps, weight_kg, rir').in('session_exercise_id', chunk)
            )).then(results => {
              let totalVol = 0;
              let rirSum = 0;
              let rirCount = 0;
              results.forEach(({ data: sets }) => {
                if (!sets) return;
                sets.forEach(s => {
                  totalVol += (s.reps ?? 0) * (s.weight_kg ?? 0);
                  if (s.rir != null) { rirSum += s.rir; rirCount++; }
                });
              });
              setWeekVolume(totalVol);
              setWeekAvgRir(rirCount > 0 ? Math.round((rirSum / rirCount) * 10) / 10 : null);
            });
          });
      });

    // Announcement
    supabase.from('announcements').select('id, content').eq('is_active', true).limit(1).single()
      .then(({ data }) => {
        if (data) {
          const dismissedId = localStorage.getItem('dismissed_announcement');
          if (dismissedId === data.id) setAnnouncementDismissed(true);
          setAnnouncement(data as { id: string; content: string });
        }
      });

    // Latest updates
    const buildUpdates = async () => {
      const items: UpdateItem[] = [];
      // PRs this week
      const { data: prs } = await supabase.from('personal_records').select('weight_kg, achieved_at, exercise_id')
        .eq('user_id', uid).gte('achieved_at', mondayStr).order('achieved_at', { ascending: false }).limit(1);
      if (prs && prs.length > 0) {
        const { data: ex } = await supabase.from('exercises').select('name').eq('id', prs[0].exercise_id).single();
        items.push({ icon: '🏆', title: `New PR: ${ex?.name ?? 'Exercise'}`, sub: `${prs[0].weight_kg}kg — ${prs[0].achieved_at}` });
      }
      // Streak check
      const { data: streakData } = await supabase.from('training_sessions').select('date').eq('user_id', uid).eq('completed', true)
        .order('date', { ascending: false }).limit(30);
      if (streakData) {
        const dates = [...new Set(streakData.map(d => d.date))].sort().reverse();
        let s = 0;
        const check = new Date();
        for (const dateStr of dates) {
          const expected = check.toISOString().split('T')[0];
          if (dateStr === expected) { s++; check.setDate(check.getDate() - 1); }
          else break;
        }
        if (s >= 7) items.push({ icon: '🔥', title: `${s} day streak!`, sub: 'Consistency is everything' });
      }
      if (items.length > 0) setUpdates(items.slice(0, 3));
    };
    buildUpdates();
  }, [user, weekDates]);

  const completedThisWeek = sessions.filter(s => s.completed).length;
  const completedDates = new Set(sessions.filter(s => s.completed).map(s => s.date));

  // Readiness score
  const readinessScore = useMemo(() => {
    if (!checkin?.hasCheckin) return 0;
    return Math.round((checkin.sleep + checkin.energy + (10 - checkin.stress) + checkin.mood) / 40 * 100);
  }, [checkin]);

  const handleAddGoal = async () => {
    if (!user || !newGoal.title) return;
    const { error } = await supabase.from('goals').insert({
      user_id: user.id,
      title: newGoal.title,
      metric: newGoal.metric || null,
      current_value: newGoal.current_value,
      target_value: newGoal.target_value,
    });
    if (error) { toast.error('Failed to save goal'); return; }
    toast.success('Goal added');
    setSheetOpen(false);
    setNewGoal({ title: '', metric: '', current_value: 0, target_value: 0 });
    const { data } = await supabase.from('goals').select('*').eq('user_id', user.id);
    if (data) setGoals(data.map(g => ({ ...g, current_value: Number(g.current_value) || 0, target_value: Number(g.target_value) || 0 })));
  };

  const circumference = 2 * Math.PI * 22;
  const scoreOffset = checkin?.hasCheckin ? circumference - (readinessScore / 100) * circumference : circumference;
  const scoreColor = !checkin?.hasCheckin ? 'hsl(var(--dim))' : readinessScore > 70 ? 'hsl(var(--ok))' : readinessScore > 40 ? 'hsl(var(--warn))' : 'hsl(var(--bad))';
  const strokeColor = !checkin?.hasCheckin ? 'hsl(var(--bg4))' : 'hsl(var(--primary))';

  const stressColor = (v: number) => v <= 3 ? 'text-vault-ok' : v <= 6 ? 'text-vault-warn' : 'text-vault-bad';

  return (
    <div className="min-h-screen bg-vault-bg pt-12 pb-24">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-2">

        {/* Announcement banner */}
        {announcement && !announcementDismissed && (
          <div className="flex items-start gap-2 rounded-lg px-[14px] py-[10px] mb-2" style={{ background: 'hsla(192,91%,54%,0.07)', border: '1px solid hsla(192,91%,54%,0.2)' }}>
            <span className="text-sm shrink-0">📢</span>
            <p className="text-[12px] flex-1 text-vault-mid">{announcement.content}</p>
            <button onClick={() => { setAnnouncementDismissed(true); localStorage.setItem('dismissed_announcement', announcement.id); }} className="p-0.5 shrink-0 text-vault-dim">
              <X size={14} />
            </button>
          </div>
        )}

        {/* GREETING */}
        <div className="mb-2">
          <p className="font-mono text-[10px] text-vault-dim uppercase tracking-[2px] mb-1">{dayLabel} · TODAY</p>
          <h1 className="font-display text-5xl tracking-[2px] leading-none">{getGreeting()}, {firstName.toUpperCase()}</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-vault-dim text-xs font-mono">{todayFormatted}</span>
            {profile?.audit_tier && (
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary uppercase tracking-wider">
                {profile.audit_tier}
              </span>
            )}
          </div>
        </div>

        {/* SECTION 1 — READINESS */}
        <div className="rounded-[10px] p-[11px]" style={{ background: 'linear-gradient(135deg, hsla(192,91%,54%,0.07), hsla(192,91%,54%,0.02))', border: '1px solid hsla(192,91%,54%,0.2)' }}>
          <div className="flex items-center justify-between mb-2.5">
            <span className="font-mono text-[8px] text-vault-dim uppercase tracking-[1px]">READINESS</span>
            {checkin?.hasCheckin ? (
              <span className="font-mono text-[8px] px-2 py-0.5 rounded bg-vault-ok/10 text-vault-ok border border-vault-ok/20">READY</span>
            ) : (
              <span className="font-mono text-[8px] px-2 py-0.5 rounded bg-vault-bg4 text-vault-dim">TODAY</span>
            )}
          </div>

          {checkin?.hasCheckin ? (
            <div className="flex items-center gap-[10px]">
              {/* Score ring */}
              <div className="relative w-14 h-14 flex-shrink-0">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="hsl(var(--bg4))" strokeWidth="5" />
                  <circle cx="28" cy="28" r="22" fill="none" stroke={strokeColor} strokeWidth="5" strokeDasharray={circumference} strokeDashoffset={scoreOffset} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-mono text-[16px] font-semibold text-primary leading-none">{readinessScore}%</span>
                </div>
              </div>
              {/* 2×2 metric tiles */}
              <div className="grid grid-cols-2 gap-1.5 flex-1">
                <div className="bg-vault-bg3 rounded-md p-[5px] text-center">
                  <p className="font-mono text-[11px] text-primary">{(checkin.sleep * 0.8).toFixed(1)}h</p>
                  <p className="text-[7px] text-vault-dim">🌙 Sleep</p>
                </div>
                <div className="bg-vault-bg3 rounded-md p-[5px] text-center">
                  <p className="font-mono text-[11px] text-primary">{checkin.energy}/10</p>
                  <p className="text-[7px] text-vault-dim">⚡ Energy</p>
                </div>
                <div className="bg-vault-bg3 rounded-md p-[5px] text-center">
                  <p className={`font-mono text-[11px] ${stressColor(checkin.stress)}`}>{checkin.stress}/10</p>
                  <p className="text-[7px] text-vault-dim">🧠 Stress</p>
                </div>
                <div className="bg-vault-bg3 rounded-md p-[5px] text-center">
                  <p className="font-mono text-[11px] text-primary">{checkin.mood}/10</p>
                  <p className="text-[7px] text-vault-dim">🔥 Drive</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-3">
              <div className="relative w-14 h-14 mb-3">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="hsl(var(--bg4))" strokeWidth="5" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-mono text-[16px] font-semibold text-vault-dim leading-none">0%</span>
                </div>
              </div>
              <button onClick={() => navigate('/lifestyle')} className="w-full py-2 border rounded-lg font-mono text-[10px] text-primary uppercase tracking-widest" style={{ borderColor: 'hsla(192,91%,54%,0.3)' }}>
                Log Today's Check-In →
              </button>
            </div>
          )}
        </div>

        {/* SECTION 2 — TODAY'S PROGRAMME */}
        <div className="bg-vault-bg2 border border-vault-border rounded-[10px] p-[11px]">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[8px] text-vault-dim uppercase tracking-[1px]">TODAY'S PROGRAMME</span>
            <span className="font-mono text-[8px] px-2 py-0.5 rounded bg-vault-pg text-primary" style={{ border: '1px solid hsla(192,91%,54%,0.25)' }}>
              W{currentProgrammeWeek} D{currentDayOfWeek}
            </span>
          </div>
          {activeProgramme ? (
            <>
              <p className="text-[12px] font-semibold mb-0.5">{activeProgramme.name}</p>
              <p className="font-mono text-[8px] text-vault-dim mb-3">
                {todayExerciseCount} EXERCISES · ~45 MIN
              </p>
              <button onClick={() => navigate('/train')} className="w-full bg-primary text-[hsl(220,16%,6%)] font-bold text-[11px] py-2 rounded-lg">
                Start Workout →
              </button>
            </>
          ) : (
            <>
              <p className="text-[12px] text-vault-dim mb-3">No programme assigned yet</p>
              <button onClick={() => navigate('/library')} className="w-full bg-primary text-[hsl(220,16%,6%)] font-bold text-[11px] py-2 rounded-lg">
                Browse Programmes →
              </button>
            </>
          )}
        </div>

        {/* SECTION 3 — STATS ROW */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-vault-bg3 border border-vault-border rounded-lg p-2 text-center">
            <p className="font-mono text-[15px] font-semibold text-foreground leading-none">{completedThisWeek}</p>
            <p className="font-mono text-[7px] text-vault-dim uppercase tracking-widest mt-1">SESSIONS</p>
            <p className="font-mono text-[7px] text-vault-dim">this week</p>
          </div>
          <div className="bg-vault-bg3 border border-vault-border rounded-lg p-2 text-center">
            <p className="font-mono text-[15px] font-semibold text-primary leading-none">{formatVolume(weekVolume)}</p>
            <p className="font-mono text-[7px] text-vault-dim uppercase tracking-widest mt-1">VOLUME</p>
            <p className="font-mono text-[7px] text-vault-dim">kg total</p>
          </div>
          <div className="bg-vault-bg3 border border-vault-border rounded-lg p-2 text-center">
            <p className={`font-mono text-[15px] font-semibold leading-none ${weekAvgRir !== null ? 'text-vault-warn' : 'text-vault-dim'}`}>{weekAvgRir !== null ? weekAvgRir : '—'}</p>
            <p className="font-mono text-[7px] text-vault-dim uppercase tracking-widest mt-1">AVG RIR</p>
            <p className="font-mono text-[7px] text-vault-dim">this week</p>
          </div>
        </div>

        {/* SECTION 4 — MY COACHING (only if not free) */}
        {profile?.tier && profile.tier !== 'free' && (
          <div className="rounded-[10px] p-[11px]" style={{ background: 'linear-gradient(135deg, hsla(192,91%,54%,0.07), hsla(192,91%,54%,0.02))', border: '1px solid hsla(192,91%,54%,0.2)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[8px] text-vault-dim uppercase tracking-[1px]">MY COACHING</span>
              <span className="font-mono text-[8px] px-2 py-0.5 rounded bg-vault-gold/10 text-vault-gold border border-vault-gold/20">ACTIVE</span>
            </div>
            <p className="text-[10px] font-semibold mb-0.5">1-on-1 Online Coaching</p>
            <p className="font-mono text-[8px] text-vault-dim mb-3">
              Week {currentProgrammeWeek} of {activeProgramme?.weeks ?? '—'} · {activeProgramme?.name ?? 'Programme'}
            </p>
            <div className="flex gap-2">
              <button onClick={() => navigate('/community')} className="flex-1 bg-primary text-[hsl(220,16%,6%)] font-bold text-[9px] py-[7px] rounded-lg">
                Message Andy
              </button>
              <button onClick={() => navigate('/my-coaching')} className="flex-1 border border-primary/30 text-primary font-bold text-[9px] py-[7px] rounded-lg">
                View Programme
              </button>
            </div>
          </div>
        )}

        {/* TODAY'S FOCUS */}
        <div className="rounded-2xl p-5 border border-vault-border2 bg-vault-bg2">
          <p className="font-mono text-[10px] text-primary uppercase tracking-[2px] mb-2">TODAY'S FOCUS</p>
          <p className="text-sm text-vault-mid leading-relaxed mb-4">Complete your first training session and daily check-in to start building your performance profile.</p>
          <button onClick={() => navigate('/train')} className="w-full bg-primary text-primary-foreground font-bold text-xs py-3.5 rounded-xl uppercase tracking-widest">View Today's Session →</button>
        </div>

        {/* THIS WEEK strip */}
        <div>
          <p className="font-mono text-[10px] text-vault-dim uppercase tracking-widest mb-3">THIS WEEK</p>
          <div className="flex justify-between">
            {weekDates.map((d, i) => {
              const dateStr = d.toISOString().split('T')[0];
              const isToday = dateStr === today;
              const completed = completedDates.has(dateStr);
              return (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <span className="font-mono text-[9px] text-vault-dim">{DAY_LABELS[i]}</span>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-mono text-xs ${isToday ? 'bg-primary text-primary-foreground font-bold' : 'text-foreground'}`}>{d.getDate()}</div>
                  <div className="h-2">{completed && <div className="w-2 h-2 rounded-full bg-primary mx-auto" />}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* MY GOALS */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-[10px] text-vault-dim uppercase tracking-widest">MY GOALS</p>
            <button onClick={() => setSheetOpen(true)} className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
              <Plus className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
          {goals.length === 0 ? (
            <div className="bg-vault-bg2 border border-vault-border rounded-2xl p-5 text-center">
              <p className="text-sm text-vault-dim">No goals yet. Tap + to add your first.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {goals.map(g => {
                const pct = g.target_value > 0 ? Math.min(100, Math.round((g.current_value / g.target_value) * 100)) : 0;
                return (
                  <div key={g.id} className="bg-vault-bg2 border border-vault-border rounded-2xl p-4">
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-sm font-medium">{g.title}</span>
                      <span className="font-mono text-xs text-primary">{g.current_value}/{g.target_value} {g.metric}</span>
                    </div>
                    <Progress value={pct} className="h-1.5 bg-vault-bg3" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 5 — LATEST UPDATES */}
        {updates.length > 0 && (
          <div className="bg-vault-bg2 border border-vault-border rounded-[10px] p-[11px]">
            <span className="font-mono text-[8px] text-vault-dim uppercase tracking-[1px]">LATEST UPDATES</span>
            <div className="mt-2">
              {updates.map((u, i) => (
                <div key={i} className={`flex items-start gap-1.5 py-[5px] ${i < updates.length - 1 ? 'border-b border-vault-border' : ''}`}>
                  <span className="text-[12px] shrink-0">{u.icon}</span>
                  <div>
                    <p className="text-[9px] font-semibold">{u.title}</p>
                    <p className="text-[8px] text-vault-dim">{u.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* WEEKLY AI REVIEW */}
        <div className="bg-vault-bg2 border border-vault-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">✨</span>
            <p className="font-mono text-[10px] text-primary uppercase tracking-[2px]">WEEKLY AI REVIEW</p>
          </div>
          <p className="text-sm text-vault-mid leading-relaxed">{weeklyReview || "Your first weekly review generates after 7 days of training data."}</p>
        </div>

        {/* FROM ANDY */}
        <div className="bg-vault-bg2 border border-vault-border rounded-2xl p-5">
          <p className="font-mono text-[10px] text-primary uppercase tracking-[2px] mb-3">FROM ANDY</p>
          <p className="text-sm text-vault-mid leading-relaxed">{coachNote || "Andy will add a personalised note after reviewing your first week."}</p>
        </div>
      </div>

      {/* Add Goal Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="bg-vault-bg2 border-t border-vault-border rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="font-display text-xl text-foreground">ADD GOAL</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4 px-1">
            <div>
              <label className="font-mono text-[10px] text-vault-dim uppercase tracking-widest">Goal name</label>
              <input className="w-full mt-1 bg-vault-bg3 border border-vault-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-vault-dim focus:outline-none focus:border-primary" placeholder="e.g. Back Squat PR" value={newGoal.title} onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <label className="font-mono text-[10px] text-vault-dim uppercase tracking-widest">Metric</label>
              <input className="w-full mt-1 bg-vault-bg3 border border-vault-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-vault-dim focus:outline-none focus:border-primary" placeholder="e.g. kg, reps, minutes" value={newGoal.metric} onChange={e => setNewGoal(p => ({ ...p, metric: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-mono text-[10px] text-vault-dim uppercase tracking-widest">Current</label>
                <input type="number" className="w-full mt-1 bg-vault-bg3 border border-vault-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary" value={newGoal.current_value} onChange={e => setNewGoal(p => ({ ...p, current_value: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="font-mono text-[10px] text-vault-dim uppercase tracking-widest">Target</label>
                <input type="number" className="w-full mt-1 bg-vault-bg3 border border-vault-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary" value={newGoal.target_value} onChange={e => setNewGoal(p => ({ ...p, target_value: Number(e.target.value) }))} />
              </div>
            </div>
            <button onClick={handleAddGoal} className="w-full bg-primary text-primary-foreground font-bold text-xs py-3.5 rounded-xl uppercase tracking-widest mt-2">Save Goal</button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default HomeDashboard;
