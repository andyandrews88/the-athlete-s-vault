import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Minus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const PORTIONS = [
  { key: 'protein_portions', emoji: '🤜', name: 'PROTEIN', desc: 'Palm-sized portions' },
  { key: 'veggie_portions', emoji: '✊', name: 'VEGGIES', desc: 'Fist-sized portions' },
  { key: 'carb_portions', emoji: '🖐', name: 'CARBS', desc: 'Cupped hand portions' },
  { key: 'fat_portions', emoji: '👍', name: 'FATS', desc: 'Thumb-sized portions' },
] as const;

type PortionKey = typeof PORTIONS[number]['key'];

const TIER_TARGETS: Record<string, Record<PortionKey, number>> = {
  free: { protein_portions: 3, veggie_portions: 2, carb_portions: 2, fat_portions: 2 },
  basic: { protein_portions: 3, veggie_portions: 2, carb_portions: 2, fat_portions: 2 },
  pro: { protein_portions: 4, veggie_portions: 3, carb_portions: 3, fat_portions: 3 },
  elite: { protein_portions: 4, veggie_portions: 3, carb_portions: 3, fat_portions: 3 },
};

const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;

const HandPortionsTab = () => {
  const { user, profile } = useAuth();
  const [totals, setTotals] = useState<Record<PortionKey, number>>({
    protein_portions: 0, veggie_portions: 0, carb_portions: 0, fat_portions: 0,
  });
  const [showLog, setShowLog] = useState(false);
  const [meal, setMeal] = useState<typeof MEALS[number]>('Lunch');
  const [mealPortions, setMealPortions] = useState<Record<PortionKey, number>>({
    protein_portions: 0, veggie_portions: 0, carb_portions: 0, fat_portions: 0,
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const tier = profile?.tier || 'free';
  const targets = TIER_TARGETS[tier] || TIER_TARGETS.free;

  const fetchTotals = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('hand_portion_logs')
      .select('protein_portions, veggie_portions, carb_portions, fat_portions')
      .eq('user_id', user.id)
      .eq('date', todayStr);

    if (data) {
      const sums: Record<PortionKey, number> = {
        protein_portions: 0, veggie_portions: 0, carb_portions: 0, fat_portions: 0,
      };
      data.forEach((row) => {
        (Object.keys(sums) as PortionKey[]).forEach((k) => {
          sums[k] += (row as any)[k] || 0;
        });
      });
      setTotals(sums);
    }
  }, [user, todayStr]);

  useEffect(() => { fetchTotals(); }, [fetchTotals]);

  const logMeal = async () => {
    if (!user) return;
    await supabase.from('hand_portion_logs').insert({
      user_id: user.id, date: todayStr, meal,
      ...mealPortions,
    });
    setShowLog(false);
    setMealPortions({ protein_portions: 0, veggie_portions: 0, carb_portions: 0, fat_portions: 0 });
    fetchTotals();
    toast({ title: 'Meal logged ✓' });
  };

  return (
    <div className="px-4 py-5 pb-32 space-y-4">
      <div>
        <h2 className="font-display text-2xl tracking-wide" style={{ color: 'hsl(var(--text))' }}>
          HAND PORTIONS
        </h2>
        <p className="text-xs mt-1" style={{ color: 'hsl(var(--dim))' }}>
          Andy's method — no counting, no weighing
        </p>
      </div>

      {/* Portion cards */}
      <div className="space-y-3">
        {PORTIONS.map((p) => {
          const done = totals[p.key];
          const target = targets[p.key];
          return (
            <div key={p.key} className="rounded-[12px] p-4 space-y-3"
              style={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))' }}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{p.emoji}</span>
                <div className="flex-1">
                  <span className="font-display text-base tracking-wide" style={{ color: 'hsl(var(--text))' }}>
                    {p.name}
                  </span>
                  <p className="text-[11px]" style={{ color: 'hsl(var(--dim))' }}>{p.desc}</p>
                </div>
                <span className="font-mono text-sm" style={{ color: 'hsl(var(--primary))' }}>
                  {done} / {target}
                </span>
              </div>
              {/* Dots */}
              <div className="flex gap-2">
                {Array.from({ length: target }, (_, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 rounded-full"
                    style={{
                      background: i < done ? 'hsl(var(--primary))' : 'hsl(var(--bg4))',
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Log Meal button */}
      <button
        onClick={() => setShowLog(true)}
        className="w-full py-3 rounded-[12px] text-sm font-semibold tracking-wider"
        style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
      >
        Log Meal
      </button>

      {/* Summary bar */}
      <div className="fixed left-0 right-0 bottom-[60px] py-3 px-4 flex justify-around z-20"
        style={{ background: 'hsl(var(--bg2))', borderTop: '1px solid hsl(var(--border))' }}>
        {PORTIONS.map((p) => (
          <div key={p.key} className="text-center">
            <span className="text-lg">{p.emoji}</span>
            <div className="font-mono text-[11px]" style={{ color: 'hsl(var(--primary))' }}>
              {totals[p.key]}/{targets[p.key]}
            </div>
          </div>
        ))}
      </div>

      {/* Log meal sheet */}
      {showLog && (
        <>
          <div className="fixed inset-0 z-[60]" style={{ background: 'hsla(0,0%,0%,0.6)' }} onClick={() => setShowLog(false)} />
          <div className="fixed left-0 right-0 bottom-[60px] z-[70] p-5 space-y-4"
            style={{ background: 'hsl(var(--bg2))', borderRadius: '20px 20px 0 0' }}>
            <div className="flex justify-center">
              <div className="rounded-full" style={{ width: 40, height: 4, background: 'hsl(var(--bg4))' }} />
            </div>
            <h3 className="font-display text-xl" style={{ color: 'hsl(var(--text))' }}>Log Meal</h3>
            {/* Meal selector */}
            <div className="flex gap-2">
              {MEALS.map((m) => (
                <button key={m} onClick={() => setMeal(m)}
                  className="flex-1 py-2 rounded-[8px] text-xs font-medium"
                  style={{
                    background: meal === m ? 'hsl(var(--primary))' : 'hsl(var(--bg3))',
                    color: meal === m ? 'hsl(var(--primary-foreground))' : 'hsl(var(--mid))',
                    border: `1px solid ${meal === m ? 'transparent' : 'hsl(var(--border))'}`,
                  }}>
                  {m}
                </button>
              ))}
            </div>
            {/* Portion counters */}
            <div className="space-y-3">
              {PORTIONS.map((p) => (
                <div key={p.key} className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'hsl(var(--text))' }}>{p.emoji} {p.name}</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setMealPortions((v) => ({ ...v, [p.key]: Math.max(0, v[p.key] - 1) }))}
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: 'hsl(var(--bg4))' }}>
                      <Minus size={14} style={{ color: 'hsl(var(--text))' }} />
                    </button>
                    <span className="font-mono text-sm w-4 text-center" style={{ color: 'hsl(var(--primary))' }}>
                      {mealPortions[p.key]}
                    </span>
                    <button onClick={() => setMealPortions((v) => ({ ...v, [p.key]: v[p.key] + 1 }))}
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: 'hsl(var(--bg4))' }}>
                      <Plus size={14} style={{ color: 'hsl(var(--text))' }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={logMeal}
              className="w-full py-3 rounded-[12px] text-sm font-semibold"
              style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
              Save
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default HandPortionsTab;
