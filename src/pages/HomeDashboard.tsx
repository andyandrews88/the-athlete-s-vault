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

  return (
    <div className="min-h-screen bg-background pt-12 pb-[80px]">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Greeting */}
        <div>
          <h1 className="font-display text-4xl tracking-wide text-foreground">
            {getGreeting()}, {firstName.toUpperCase()}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-muted-foreground text-sm">{todayFormatted}</span>
            {profile?.audit_tier && (
              <span className={`font-mono text-[10px] px-2 py-0.5 rounded ${getTierColor(profile.audit_tier)}`}>
                {profile.audit_tier.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Today's Priority */}
        <div className="bg-card rounded-xl p-5" style={{ border: '1px solid hsla(192,91%,54%,0.2)' }}>
          <p className="font-mono text-[10px] text-primary uppercase tracking-wider mb-2">TODAY'S FOCUS</p>
          <p className="text-sm text-foreground leading-relaxed mb-4">
            Complete your first training session and daily check-in to start building your performance profile.
          </p>
          <button
            onClick={() => navigate('/train')}
            className="w-full bg-primary text-primary-foreground font-bold text-xs py-3 rounded-lg uppercase tracking-wider"
          >
            View Today's Session
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'STREAK', value: streak, unit: 'days' },
            { label: 'THIS WEEK', value: completedThisWeek, unit: 'sessions' },
            { label: 'TOTAL PRS', value: 0, unit: 'logged' },
          ].map(s => (
            <div key={s.label} className="bg-secondary border border-border rounded-xl p-3 text-center">
              <p className="font-mono text-2xl text-primary">{s.value}</p>
              <p className="font-mono text-[8px] text-muted-foreground uppercase tracking-wider mt-1">{s.unit}</p>
              <p className="font-mono text-[8px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Week Strip */}
        <div>
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-3">THIS WEEK</p>
          <div className="flex justify-between">
            {weekDates.map((d, i) => {
              const dateStr = d.toISOString().split('T')[0];
              const isToday = dateStr === today;
              const completed = completedDates.has(dateStr);
              const planned = plannedDates.has(dateStr);
              return (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <span className="font-mono text-[9px] text-muted-foreground">{DAY_LABELS[i]}</span>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-mono ${
                    isToday ? 'bg-primary text-primary-foreground font-bold' : 'text-foreground'
                  }`}>
                    {d.getDate()}
                  </div>
                  <div className="h-1.5">
                    {completed && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    {!completed && planned && <div className="w-1.5 h-1.5 rounded-full border border-primary" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Goals */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">MY GOALS</p>
            <button onClick={() => setSheetOpen(true)} className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
              <Plus className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
          {goals.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-5 text-center">
              <p className="text-sm text-muted-foreground">No goals set yet. Tap + to add.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {goals.map(g => {
                const pct = g.target_value > 0 ? Math.min(100, Math.round((g.current_value / g.target_value) * 100)) : 0;
                return (
                  <div key={g.id} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-sm font-medium text-foreground">{g.title}</span>
                      <span className="font-mono text-xs text-primary">{g.current_value}/{g.target_value} {g.metric}</span>
                    </div>
                    <Progress value={pct} className="h-2 bg-secondary" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Weekly Review */}
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="font-mono text-[10px] text-primary uppercase tracking-wider mb-2">WEEKLY REVIEW</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {weeklyReview || "Your first weekly review generates after 7 days of training data."}
          </p>
        </div>

        {/* Coaching Panel */}
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="font-mono text-[10px] text-primary uppercase tracking-wider mb-2">FROM ANDY</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {coachNote || "Andy will add a note after reviewing your first week."}
          </p>
        </div>
      </div>

      {/* Add Goal Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="bg-card border-t border-border rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="font-display text-xl text-foreground">ADD GOAL</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4 px-1">
            <div>
              <label className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Goal name</label>
              <input
                className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                placeholder="e.g. Back Squat PR"
                value={newGoal.title}
                onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Metric</label>
              <input
                className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                placeholder="e.g. kg, reps, minutes"
                value={newGoal.metric}
                onChange={e => setNewGoal(p => ({ ...p, metric: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Current</label>
                <input
                  type="number"
                  className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
                  value={newGoal.current_value}
                  onChange={e => setNewGoal(p => ({ ...p, current_value: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Target</label>
                <input
                  type="number"
                  className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
                  value={newGoal.target_value}
                  onChange={e => setNewGoal(p => ({ ...p, target_value: Number(e.target.value) }))}
                />
              </div>
            </div>
            <button
              onClick={handleAddGoal}
              className="w-full bg-primary text-primary-foreground font-bold text-xs py-3 rounded-lg uppercase tracking-wider mt-2"
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
