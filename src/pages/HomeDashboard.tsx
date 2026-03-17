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

const getGreeting = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'GOOD MORNING';
  if (h >= 12 && h < 17) return 'GOOD AFTERNOON';
  if (h >= 17 && h < 23) return 'GOOD EVENING';
  return 'GOOD EVENING';
};

const getTierColor = (tier: string | null) => {
  switch (tier?.toLowerCase()) {
    case 'elite': return 'text-vault-gold bg-vault-gold/20';
    case 'performance': return 'text-primary bg-primary/20';
    case 'intermediate': return 'text-vault-warn bg-vault-warn/20';
    default: return 'text-vault-bad bg-vault-bad/20';
  }
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

const HomeDashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const firstName = profile?.full_name?.split(' ')[0] || 'Athlete';

  const [goals, setGoals] = useState<Goal[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [streak, setStreak] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', metric: '', current_value: 0, target_value: 0 });
  const [coachNote, setCoachNote] = useState<string | null>(null);
  const [weeklyReview, setWeeklyReview] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<{ score: number; sleep_hours: number | null; energy: number; stress: number; drive: number; hasCheckin: boolean } | null>(null);
  const [totalPrs, setTotalPrs] = useState(0);
  const [announcement, setAnnouncement] = useState<{ id: string; content: string } | null>(null);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);

  const weekDates = useMemo(() => getWeekDates(), []);
  const today = new Date().toISOString().split('T')[0];
  const todayFormatted = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  useEffect(() => {
    if (!user) return;
    const uid = user.id;

    // Fetch goals
    supabase.from('goals').select('*').eq('user_id', uid).then(({ data }) => {
      if (data) setGoals(data.map(g => ({ ...g, current_value: Number(g.current_value) || 0, target_value: Number(g.target_value) || 0 })));
    });

    // Fetch this week's sessions
    const mondayStr = weekDates[0].toISOString().split('T')[0];
    const sundayStr = weekDates[6].toISOString().split('T')[0];
    supabase.from('training_sessions').select('*').eq('user_id', uid)
      .gte('date', mondayStr).lte('date', sundayStr)
      .then(({ data }) => { if (data) setSessions(data); });

    // Calculate streak
    supabase.from('training_sessions').select('date').eq('user_id', uid).eq('completed', true)
      .order('date', { ascending: false }).limit(60)
      .then(({ data }) => {
        if (!data || data.length === 0) { setStreak(0); return; }
        const dates = [...new Set(data.map(d => d.date))].sort().reverse();
        let s = 0;
        const check = new Date();
        for (const dateStr of dates) {
          const expected = check.toISOString().split('T')[0];
          if (dateStr === expected) { s++; check.setDate(check.getDate() - 1); }
          else if (dateStr === new Date(check.getTime() - 86400000).toISOString().split('T')[0]) {
            check.setDate(check.getDate() - 1);
            s++;
            check.setDate(check.getDate() - 1);
          } else break;
        }
        setStreak(s);
      });

    // Coach note
    supabase.from('coaching_notes').select('content').eq('user_id', uid).eq('is_pinned', true)
      .order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => { if (data?.[0]) setCoachNote(data[0].content); });

    // Weekly review
    supabase.from('weekly_reviews').select('summary').eq('user_id', uid)
      .order('generated_at', { ascending: false }).limit(1)
      .then(({ data }) => { if (data?.[0]) setWeeklyReview(data[0].summary); });

    // Readiness from today's check-in
    const todayStr = new Date().toISOString().split('T')[0];
    supabase.from('daily_checkins').select('sleep_hours, energy, stress, drive, sleep, mood, soreness')
      .eq('user_id', uid).eq('date', todayStr).limit(1).single()
      .then(({ data }) => {
        if (data) {
          // Readiness = weighted average: sleep_hours contributes double
          const sleepNorm = Math.min((data.sleep_hours ?? 7) / 9, 1); // 9h = perfect
          const energyNorm = (data.energy ?? 5) / 10;
          const stressNorm = 1 - ((data.stress ?? 5) / 10); // invert: low stress = high readiness
          const driveNorm = (data.drive ?? 3) / 5;
          const sleepQNorm = (data.sleep ?? 5) / 10;
          const score = Math.round(((sleepNorm * 2 + sleepQNorm + energyNorm + driveNorm + stressNorm) / 6) * 100);
          setReadiness({ score, sleep_hours: data.sleep_hours, energy: data.energy, stress: data.stress, drive: data.drive, hasCheckin: true });
        } else {
          setReadiness({ score: 0, sleep_hours: null, energy: 0, stress: 0, drive: 0, hasCheckin: false });
        }
      });

    // Total PRs
    supabase.from('personal_records').select('id', { count: 'exact', head: true }).eq('user_id', uid)
      .then(({ count }) => { setTotalPrs(count ?? 0); });

    // Announcement
    supabase.from('announcements').select('id, content').eq('is_active', true).limit(1).single()
      .then(({ data }) => {
        if (data) {
          const dismissedId = localStorage.getItem('dismissed_announcement');
          if (dismissedId === data.id) {
            setAnnouncementDismissed(true);
          }
          setAnnouncement(data as { id: string; content: string });
        }
      });
  }, [user, weekDates]);

  const completedThisWeek = sessions.filter(s => s.completed).length;
  const completedDates = new Set(sessions.filter(s => s.completed).map(s => s.date));
  const plannedDates = new Set(sessions.filter(s => !s.completed).map(s => s.date));

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

  const dayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();

  return (
    <div className="min-h-screen bg-vault-bg pt-12 pb-24">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Announcement banner */}
        {announcement && !announcementDismissed && (
          <div className="flex items-start gap-2 rounded-lg px-[14px] py-[10px]" style={{ background: 'hsla(192,91%,54%,0.07)', border: '1px solid hsl(var(--primary)/0.2)' }}>
            <span className="text-sm shrink-0">📢</span>
            <p className="text-[12px] flex-1" style={{ color: 'hsl(var(--mid))' }}>{announcement.content}</p>
            <button onClick={() => { setAnnouncementDismissed(true); localStorage.setItem('dismissed_announcement', announcement.id); }} className="p-0.5 shrink-0" style={{ color: 'hsl(var(--dim))' }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* SECTION 1 - Greeting */}
        <div>
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

        {/* SECTION 2 - Readiness */}
        {(() => {
          const r = readiness;
          const score = r?.score ?? 0;
          const hasCheckin = r?.hasCheckin ?? false;
          const scoreColor = !hasCheckin ? 'text-vault-dim' : score > 70 ? 'text-vault-ok' : score > 40 ? 'text-vault-warn' : 'text-vault-bad';
          const strokeColor = !hasCheckin ? 'rgba(255,255,255,0.1)' : score > 70 ? 'hsl(142,71%,45%)' : score > 40 ? 'hsl(38,92%,50%)' : 'hsl(0,72%,51%)';
          const circumference = 2 * Math.PI * 26;
          const offset = hasCheckin ? circumference - (score / 100) * circumference : circumference;

          return (
            <div className="rounded-2xl p-5 border border-primary/20 bg-vault-bg2" style={{ boxShadow: '0 0 30px hsl(192 91% 54% / 0.06)' }}>
              <div className="flex items-center justify-between mb-4">
                <p className="font-mono text-[10px] text-primary uppercase tracking-[2px]">READINESS</p>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-vault-bg3 text-vault-dim">TODAY</span>
              </div>
              {hasCheckin ? (
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                      <circle cx="32" cy="32" r="26" fill="none" stroke={strokeColor} strokeWidth="4" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`font-mono text-base font-bold ${scoreColor}`}>{score}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 flex-1">
                    <div className="bg-vault-bg3 rounded-xl p-2 text-center"><p className="font-mono text-[8px] text-vault-dim mb-0.5">SLEEP</p><p className="font-mono text-sm text-foreground">{r?.sleep_hours ?? '—'}h</p></div>
                    <div className="bg-vault-bg3 rounded-xl p-2 text-center"><p className="font-mono text-[8px] text-vault-dim mb-0.5">ENERGY</p><p className="font-mono text-sm text-primary">{r?.energy ?? 0}/10</p></div>
                    <div className="bg-vault-bg3 rounded-xl p-2 text-center"><p className="font-mono text-[8px] text-vault-dim mb-0.5">STRESS</p><p className={`font-mono text-sm ${(r?.stress ?? 5) <= 4 ? 'text-vault-ok' : (r?.stress ?? 5) <= 7 ? 'text-vault-warn' : 'text-vault-bad'}`}>{r?.stress ?? 0}/10</p></div>
                    <div className="bg-vault-bg3 rounded-xl p-2 text-center"><p className="font-mono text-[8px] text-vault-dim mb-0.5">DRIVE</p><p className="font-mono text-sm text-primary">{r?.drive ?? 0}/5</p></div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-vault-dim text-center py-4">No check-in logged today</p>
              )}
              <button onClick={() => navigate('/lifestyle')} className="w-full mt-4 py-2.5 border border-primary/20 bg-vault-bg3 rounded-xl font-mono text-[10px] text-primary uppercase tracking-widest">
                {hasCheckin ? 'Update Check-In →' : 'Log Today\'s Check-In →'}
              </button>
            </div>
          );
        })()}

        {/* SECTION 3 - Today's Focus */}
        <div className="rounded-2xl p-5 border border-vault-border2 bg-vault-bg2">
          <p className="font-mono text-[10px] text-primary uppercase tracking-[2px] mb-2">TODAY'S FOCUS</p>
          <p className="text-sm text-vault-mid leading-relaxed mb-4">Complete your first training session and daily check-in to start building your performance profile.</p>
          <button onClick={() => navigate('/train')} className="w-full bg-primary text-primary-foreground font-bold text-xs py-3.5 rounded-xl uppercase tracking-widest">View Today's Session →</button>
        </div>

        {/* SECTION 4 - Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'STREAK', value: streak, unit: 'days' },
            { label: 'THIS WEEK', value: completedThisWeek, unit: 'sessions' },
            { label: 'TOTAL PRS', value: totalPrs, unit: 'logged' },
          ].map(s => (
            <div key={s.label} className="bg-vault-bg3 border border-vault-border rounded-2xl p-3 text-center">
              <p className="font-mono text-3xl text-primary leading-none">{s.value}</p>
              <p className="font-mono text-[8px] text-vault-dim uppercase tracking-widest mt-1">{s.unit}</p>
              <p className="font-mono text-[8px] text-vault-dim uppercase tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>

        {/* SECTION 5 - Week Strip */}
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

        {/* SECTION 6 - Goals */}
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

        {/* SECTION 7 - Weekly Review */}
        <div className="bg-vault-bg2 border border-vault-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">✨</span>
            <p className="font-mono text-[10px] text-primary uppercase tracking-[2px]">WEEKLY AI REVIEW</p>
          </div>
          <p className="text-sm text-vault-mid leading-relaxed">{weeklyReview || "Your first weekly review generates after 7 days of training data."}</p>
        </div>

        {/* SECTION 8 - From Andy */}
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
              <input
                className="w-full mt-1 bg-vault-bg3 border border-vault-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-vault-dim focus:outline-none focus:border-primary"
                placeholder="e.g. Back Squat PR"
                value={newGoal.title}
                onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="font-mono text-[10px] text-vault-dim uppercase tracking-widest">Metric</label>
              <input
                className="w-full mt-1 bg-vault-bg3 border border-vault-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-vault-dim focus:outline-none focus:border-primary"
                placeholder="e.g. kg, reps, minutes"
                value={newGoal.metric}
                onChange={e => setNewGoal(p => ({ ...p, metric: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-mono text-[10px] text-vault-dim uppercase tracking-widest">Current</label>
                <input
                  type="number"
                  className="w-full mt-1 bg-vault-bg3 border border-vault-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
                  value={newGoal.current_value}
                  onChange={e => setNewGoal(p => ({ ...p, current_value: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="font-mono text-[10px] text-vault-dim uppercase tracking-widest">Target</label>
                <input
                  type="number"
                  className="w-full mt-1 bg-vault-bg3 border border-vault-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
                  value={newGoal.target_value}
                  onChange={e => setNewGoal(p => ({ ...p, target_value: Number(e.target.value) }))}
                />
              </div>
            </div>
            <button
              onClick={handleAddGoal}
              className="w-full bg-primary text-primary-foreground font-bold text-xs py-3.5 rounded-xl uppercase tracking-widest mt-2"
            >
              Save Goal
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default HomeDashboard;
