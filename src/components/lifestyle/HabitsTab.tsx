import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Check, Plus } from 'lucide-react';

const DEFAULT_HABITS = [
  { emoji: '💧', name: 'Hydration', subtitle: 'Drink 3 litres of water' },
  { emoji: '🌅', name: 'Morning Movement', subtitle: '10 mins mobility or walk' },
  { emoji: '😴', name: 'Sleep Target', subtitle: 'In bed by 10:30pm' },
  { emoji: '🥩', name: 'Protein Hit', subtitle: 'Hit daily protein target' },
  { emoji: '🚫', name: 'No Alcohol', subtitle: '' },
  { emoji: '🧊', name: 'Cold Exposure', subtitle: 'Cold shower or ice bath' },
];

interface Habit {
  id: string;
  name: string;
  emoji: string;
  is_active: boolean;
}

interface Completion {
  habit_id: string;
  date: string;
  completed: boolean;
}

const HabitsTab = () => {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('✅');

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Get Monday of current week
  const getWeekDates = useCallback(() => {
    const d = new Date(today);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d.setDate(diff));
    return Array.from({ length: 7 }, (_, i) => {
      const dt = new Date(mon);
      dt.setDate(mon.getDate() + i);
      return dt.toISOString().split('T')[0];
    });
  }, []);

  const weekDates = getWeekDates();

  const fetchData = useCallback(async () => {
    if (!user) return;

    const { data: h } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at');

    if (h && h.length === 0) {
      // Seed default habits
      const inserts = DEFAULT_HABITS.map((dh) => ({
        user_id: user.id,
        name: dh.subtitle ? `${dh.name} — ${dh.subtitle}` : dh.name,
        emoji: dh.emoji,
        is_active: true,
      }));
      const { data: seeded } = await supabase.from('habits').insert(inserts).select();
      if (seeded) setHabits(seeded);
    } else if (h) {
      setHabits(h);
    }

    // Fetch completions for this week
    const { data: c } = await supabase
      .from('habit_completions')
      .select('habit_id, date, completed')
      .eq('user_id', user.id)
      .gte('date', weekDates[0])
      .lte('date', weekDates[6]);

    if (c) setCompletions(c);
  }, [user, weekDates]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleCompletion = async (habitId: string) => {
    if (!user) return;
    const existing = completions.find((c) => c.habit_id === habitId && c.date === todayStr);
    if (existing) {
      await supabase.from('habit_completions').delete()
        .eq('habit_id', habitId).eq('date', todayStr).eq('user_id', user.id);
    } else {
      await supabase.from('habit_completions').insert({
        habit_id: habitId, user_id: user.id, date: todayStr, completed: true,
      });
    }
    fetchData();
  };

  const getStreak = (habitId: string) => {
    let streak = 0;
    const d = new Date(today);
    while (true) {
      const ds = d.toISOString().split('T')[0];
      const found = completions.find((c) => c.habit_id === habitId && c.date === ds && c.completed);
      if (!found && ds !== todayStr) break;
      if (found) streak++;
      d.setDate(d.getDate() - 1);
      if (streak > 365) break;
    }
    return streak;
  };

  const isCompleted = (habitId: string, date: string) =>
    completions.some((c) => c.habit_id === habitId && c.date === date && c.completed);

  const isTodayCompleted = (habitId: string) => isCompleted(habitId, todayStr);

  const addHabit = async () => {
    if (!user || !newName.trim()) return;
    await supabase.from('habits').insert({
      user_id: user.id, name: newName.trim(), emoji: newEmoji || '✅', is_active: true,
    });
    setNewName('');
    setNewEmoji('✅');
    setShowAdd(false);
    fetchData();
  };

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="px-4 py-5 pb-24 space-y-6">
      <h2 className="font-display text-2xl tracking-wide" style={{ color: 'hsl(var(--text))' }}>
        NON-NEGOTIABLES
      </h2>

      {/* Habit rows */}
      <div className="space-y-2">
        {habits.map((habit) => {
          const done = isTodayCompleted(habit.id);
          const streak = getStreak(habit.id);
          return (
            <button
              key={habit.id}
              onClick={() => toggleCompletion(habit.id)}
              className="w-full flex items-center gap-3 p-3 rounded-[12px] transition-all text-left"
              style={{
                background: done ? 'hsla(var(--pgb), 0.15)' : 'hsl(var(--bg3))',
                border: `1px solid ${done ? 'hsla(var(--ok), 0.3)' : 'hsl(var(--border))'}`,
              }}
            >
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                style={{
                  background: done ? 'hsl(var(--ok))' : 'transparent',
                  border: done ? 'none' : '2px solid hsl(var(--border2))',
                }}
              >
                {done && <Check size={14} style={{ color: 'hsl(var(--primary-foreground))' }} />}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm" style={{ color: 'hsl(var(--text))' }}>
                  {habit.emoji} {habit.name}
                </span>
              </div>
              {streak > 0 && (
                <span className="font-mono text-xs px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: 'hsla(var(--primary), 0.15)', color: 'hsl(var(--primary))' }}>
                  🔥 {streak}d
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Weekly grid */}
      <div className="rounded-[12px] p-4 space-y-3" style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))' }}>
        <div className="grid gap-1" style={{ gridTemplateColumns: `1fr repeat(7, 28px)` }}>
          <div />
          {dayLabels.map((d, i) => (
            <span key={i} className="text-[10px] text-center" style={{ color: 'hsl(var(--dim))' }}>{d}</span>
          ))}
          {habits.map((habit) => (
            <div key={habit.id} className="contents">
              <span className="text-[11px] truncate pr-2" style={{ color: 'hsl(var(--mid))' }}>
                {habit.emoji}
              </span>
              {weekDates.map((date, i) => {
                const done = isCompleted(habit.id, date);
                const isFuture = date > todayStr;
                return (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-sm mx-auto"
                    style={{
                      background: done
                        ? 'hsl(var(--primary))'
                        : isFuture
                          ? 'transparent'
                          : 'hsla(var(--dim), 0.2)',
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Add habit */}
      <button
        onClick={() => setShowAdd(true)}
        className="w-full py-3 rounded-[12px] text-sm font-medium flex items-center justify-center gap-2"
        style={{
          border: '2px dashed hsl(var(--border2))',
          color: 'hsl(var(--dim))',
          background: 'transparent',
        }}
      >
        <Plus size={16} /> Add Habit
      </button>

      {/* Add habit sheet */}
      {showAdd && (
        <>
          <div className="fixed inset-0 z-[60]" style={{ background: 'hsla(0,0%,0%,0.6)' }} onClick={() => setShowAdd(false)} />
          <div className="fixed left-0 right-0 bottom-[60px] z-[70] p-5 space-y-4"
            style={{ background: 'hsl(var(--bg2))', borderRadius: '20px 20px 0 0' }}>
            <div className="flex justify-center">
              <div className="rounded-full" style={{ width: 40, height: 4, background: 'hsl(var(--bg4))' }} />
            </div>
            <h3 className="font-display text-xl" style={{ color: 'hsl(var(--text))' }}>Add Habit</h3>
            <div className="flex gap-3">
              <input
                value={newEmoji}
                onChange={(e) => setNewEmoji(e.target.value)}
                className="w-14 text-center rounded-[8px] p-2 text-lg"
                style={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text))' }}
                maxLength={2}
              />
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Habit name"
                className="flex-1 rounded-[8px] p-2 text-sm"
                style={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text))' }}
              />
            </div>
            <button
              onClick={addHabit}
              className="w-full py-3 rounded-[12px] text-sm font-semibold"
              style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
            >
              Save Habit
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default HabitsTab;
