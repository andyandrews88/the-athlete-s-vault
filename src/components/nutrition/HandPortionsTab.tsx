import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Minus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const PORTIONS = [
  { key: 'protein_portions', emoji: '🤜', name: 'Protein' },
  { key: 'carb_portions', emoji: '🤲', name: 'Carbs' },
  { key: 'fat_portions', emoji: '👍', name: 'Fats' },
  { key: 'veggie_portions', emoji: '👊', name: 'Veggies' },
] as const;

type PortionKey = typeof PORTIONS[number]['key'];

const MEALS = ['Breakfast', 'Lunch', 'Dinner'] as const;

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function dateStr(d: Date) {
  return d.toISOString().split('T')[0];
}

function formatShortDate(d: Date) {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

interface MealLog {
  protein_portions: number;
  carb_portions: number;
  fat_portions: number;
  veggie_portions: number;
}

const emptyMeal = (): MealLog => ({
  protein_portions: 0, carb_portions: 0, fat_portions: 0, veggie_portions: 0,
});

const HandPortionsTab = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [mealData, setMealData] = useState<Record<string, MealLog>>({
    Breakfast: emptyMeal(),
    Lunch: emptyMeal(),
    Dinner: emptyMeal(),
  });
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set());
  const [mealLogIds, setMealLogIds] = useState<Record<string, string | null>>({});

  const today = new Date();
  const isToday = dateStr(selectedDate) === dateStr(today);
  const dayName = DAY_NAMES[selectedDate.getDay()].toUpperCase();

  const goYesterday = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };
  const goToday = () => setSelectedDate(new Date());

  const fetchData = useCallback(async () => {
    if (!user) return;
    const ds = dateStr(selectedDate);
    const { data } = await supabase
      .from('hand_portion_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', ds);

    const newMealData: Record<string, MealLog> = {
      Breakfast: emptyMeal(), Lunch: emptyMeal(), Dinner: emptyMeal(),
    };
    const ids: Record<string, string | null> = {};
    const expanded = new Set<string>();

    if (data) {
      data.forEach((row: any) => {
        const meal = row.meal as string;
        if (newMealData[meal]) {
          newMealData[meal] = {
            protein_portions: row.protein_portions || 0,
            carb_portions: row.carb_portions || 0,
            fat_portions: row.fat_portions || 0,
            veggie_portions: row.veggie_portions || 0,
          };
          ids[meal] = row.id;
          const hasData = Object.values(newMealData[meal]).some(v => v > 0);
          if (hasData) expanded.add(meal);
        }
      });
    }

    // Auto-expand based on time of day if today
    if (isToday && expanded.size === 0) {
      const hour = today.getHours();
      if (hour < 12) expanded.add('Breakfast');
      else if (hour < 17) expanded.add('Lunch');
      else expanded.add('Dinner');
    }

    setMealData(newMealData);
    setMealLogIds(ids);
    setExpandedMeals(expanded);
  }, [user, selectedDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const upsertMeal = async (meal: string, portions: MealLog) => {
    if (!user) return;
    const ds = dateStr(selectedDate);
    const existingId = mealLogIds[meal];

    if (existingId) {
      await supabase.from('hand_portion_logs').update(portions).eq('id', existingId);
    } else {
      const { data } = await supabase.from('hand_portion_logs').insert({
        user_id: user.id, date: ds, meal, ...portions,
      }).select('id').single();
      if (data) setMealLogIds(prev => ({ ...prev, [meal]: data.id }));
    }
  };

  const updatePortion = (meal: string, key: PortionKey, delta: number) => {
    setMealData(prev => {
      const updated = {
        ...prev,
        [meal]: {
          ...prev[meal],
          [key]: Math.max(0, (prev[meal]?.[key] || 0) + delta),
        },
      };
      upsertMeal(meal, updated[meal]);
      return updated;
    });
  };

  const toggleMeal = (meal: string) => {
    setExpandedMeals(prev => {
      const next = new Set(prev);
      if (next.has(meal)) next.delete(meal); else next.add(meal);
      return next;
    });
  };

  // Daily summary totals
  const totals: Record<PortionKey, number> = {
    protein_portions: 0, carb_portions: 0, fat_portions: 0, veggie_portions: 0,
  };
  Object.values(mealData).forEach(m => {
    (Object.keys(totals) as PortionKey[]).forEach(k => {
      totals[k] += m[k] || 0;
    });
  });

  return (
    <div className="px-4 py-5 pb-24 space-y-4">
      {/* Day header */}
      <div className="text-center">
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 18,
          letterSpacing: 2,
          color: 'hsl(var(--text))',
        }}>
          {dayName}
        </div>
        <div className="flex justify-between items-center mt-1">
          <button onClick={goYesterday} style={{ fontSize: 8, color: 'hsl(var(--dim))' }}>
            ← Yesterday
          </button>
          <span style={{ fontSize: 8, color: 'hsl(var(--mid))' }}>
            {formatShortDate(selectedDate)}
          </span>
          <button onClick={goToday} style={{ fontSize: 8, color: 'hsl(var(--primary))' }}>
            Today →
          </button>
        </div>
      </div>

      {/* Daily Summary Card */}
      <div style={{
        background: 'hsla(192,91%,54%,0.06)',
        border: '1px solid hsla(192,91%,54%,0.15)',
        borderRadius: 10,
        padding: 11,
      }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 8,
          color: 'hsl(var(--dim))',
          marginBottom: 8,
        }}>
          Daily Summary
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {PORTIONS.map(p => (
            <div key={p.key} style={{
              background: 'hsl(var(--bg3))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 6,
              padding: '5px 2px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 11, marginBottom: 2 }}>{p.emoji}</div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: 'hsl(var(--primary))',
                fontWeight: 600,
              }}>
                {totals[p.key]}
              </div>
              <div style={{ fontSize: 7, color: 'hsl(var(--dim))' }}>{p.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Meal Cards */}
      {MEALS.map(meal => {
        const data = mealData[meal] || emptyMeal();
        const isExpanded = expandedMeals.has(meal);
        const hasData = Object.values(data).some(v => v > 0);

        return (
          <div key={meal} style={{
            background: 'hsl(var(--bg2))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 10,
            padding: 11,
          }}>
            {/* Meal header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: isExpanded ? 8 : 0,
            }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'hsl(var(--text))' }}>
                {meal}
              </span>
              {hasData && !isExpanded ? (
                <button onClick={() => toggleMeal(meal)} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {PORTIONS.map(p => (
                    <span key={p.key} style={{
                      fontSize: 7,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: 'hsl(var(--dim))',
                    }}>
                      {p.emoji}{data[p.key]}
                    </span>
                  ))}
                </button>
              ) : !isExpanded ? (
                <button onClick={() => toggleMeal(meal)} style={{
                  fontSize: 8,
                  color: 'hsl(var(--dim))',
                }}>
                  + Log portions
                </button>
              ) : null}
            </div>

            {/* Expanded portion tiles */}
            {isExpanded && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {PORTIONS.map((p, i) => (
                  <div key={p.key} style={{
                    background: 'hsl(var(--bg3))',
                    border: i === 0
                      ? '1px solid hsla(192,91%,54%,0.2)'
                      : '1px solid hsl(var(--border))',
                    borderRadius: 6,
                    padding: 5,
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 10, marginBottom: 2 }}>{p.emoji}</div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                    }}>
                      <button
                        onClick={() => updatePortion(meal, p.key, -1)}
                        style={{
                          background: 'hsl(var(--bg4))',
                          borderRadius: 3,
                          padding: '1px 5px',
                          fontSize: 10,
                          color: 'hsl(var(--text))',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        −
                      </button>
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 12,
                        color: 'hsl(var(--primary))',
                        fontWeight: 700,
                        width: 12,
                        textAlign: 'center',
                      }}>
                        {data[p.key]}
                      </span>
                      <button
                        onClick={() => updatePortion(meal, p.key, 1)}
                        style={{
                          background: 'hsl(var(--bg4))',
                          borderRadius: 3,
                          padding: '1px 5px',
                          fontSize: 10,
                          color: 'hsl(var(--text))',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        +
                      </button>
                    </div>
                    <div style={{ fontSize: 6, color: 'hsl(var(--dim))', marginTop: 2 }}>
                      {p.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default HandPortionsTab;
