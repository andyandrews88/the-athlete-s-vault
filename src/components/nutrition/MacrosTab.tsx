import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MessageCircle, X, Camera } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const MACROS = [
  { key: 'protein_g', label: 'Protein', unit: 'g', color: 'hsl(var(--primary))' },
  { key: 'carbs_g', label: 'Carbs', unit: 'g', color: 'hsl(var(--warn))' },
  { key: 'fat_g', label: 'Fat', unit: 'g', color: 'hsl(var(--ok))' },
] as const;

type MacroKey = typeof MACROS[number]['key'];

interface MacroLog {
  id: string;
  meal: string;
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MEALS = ['Breakfast', 'Lunch', 'Dinner'] as const;

const MacrosTab = () => {
  const { user } = useAuth();
  const [targets, setTargets] = useState({ protein_g: 150, carbs_g: 200, fat_g: 70, calories: 2400 });
  const [logs, setLogs] = useState<MacroLog[]>([]);
  const [showAI, setShowAI] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const dayName = DAY_NAMES[new Date().getDay()];

  const fetchData = useCallback(async () => {
    if (!user) return;
    const { data: t } = await supabase
      .from('nutrition_targets')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (t) setTargets({ protein_g: t.protein_g ?? 150, carbs_g: t.carbs_g ?? 200, fat_g: t.fat_g ?? 70, calories: t.calories ?? 2400 });

    const { data: l } = await supabase
      .from('macro_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', todayStr)
      .order('meal');
    if (l) setLogs(l as MacroLog[]);
  }, [user, todayStr]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totals = logs.reduce(
    (acc, l) => ({
      protein_g: acc.protein_g + (l.protein_g || 0),
      carbs_g: acc.carbs_g + (l.carbs_g || 0),
      fat_g: acc.fat_g + (l.fat_g || 0),
      calories: acc.calories + (l.calories || 0),
    }),
    { protein_g: 0, carbs_g: 0, fat_g: 0, calories: 0 },
  );

  const deleteLog = async (id: string) => {
    await supabase.from('macro_logs').delete().eq('id', id);
    fetchData();
    toast({ title: 'Entry removed' });
  };

  const grouped = logs.reduce<Record<string, MacroLog[]>>((acc, l) => {
    (acc[l.meal] = acc[l.meal] || []).push(l);
    return acc;
  }, {});

  return (
    <div className="px-4 py-5 pb-24 space-y-4">
      {/* Daily Summary Card */}
      <div style={{
        background: 'hsla(192,91%,54%,0.06)',
        border: '1px solid hsla(192,91%,54%,0.15)',
        borderRadius: 10,
        padding: 11,
      }}>
        {/* Header row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}>
          <span style={{ fontSize: 9, fontWeight: 600, color: 'hsl(var(--text))' }}>
            {dayName}
          </span>
          <span style={{
            display: 'inline-flex',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8,
            background: totals.calories === 0
              ? 'hsl(var(--bg4))'
              : totals.calories >= targets.calories
                ? 'hsl(var(--bad) / 0.1)'
                : 'hsl(var(--ok) / 0.1)',
            color: totals.calories === 0
              ? 'hsl(var(--dim))'
              : totals.calories >= targets.calories
                ? 'hsl(var(--bad))'
                : 'hsl(var(--ok))',
            border: totals.calories === 0
              ? '1px solid hsl(var(--border2))'
              : totals.calories >= targets.calories
                ? '1px solid hsl(var(--bad) / 0.2)'
                : '1px solid hsl(var(--ok) / 0.2)',
            borderRadius: 4,
            padding: '2px 6px',
          }}>
            {Math.round(totals.calories).toLocaleString()} / {targets.calories.toLocaleString()} kcal
          </span>
        </div>

        {/* 3-column macro summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {MACROS.map(m => {
            const current = Math.round(totals[m.key]);
            const target = targets[m.key];
            const pct = Math.min((current / target) * 100, 100);
            return (
              <div key={m.key}>
                <div style={{ fontSize: 7, color: 'hsl(var(--dim))', marginBottom: 2 }}>
                  {m.label}
                </div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13,
                  fontWeight: 600,
                  color: m.color,
                }}>
                  {current}{m.unit}
                </div>
                <div style={{
                  height: 3,
                  borderRadius: 2,
                  background: 'hsl(var(--bg4))',
                  marginTop: 4,
                  marginBottom: 2,
                }}>
                  <div style={{
                    height: '100%',
                    borderRadius: 2,
                    width: `${pct}%`,
                    background: m.color,
                    transition: 'width 0.4s',
                  }} />
                </div>
                <div style={{ fontSize: 7, color: 'hsl(var(--dim))' }}>
                  / {target}{m.unit}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Food Search Row */}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="text"
          placeholder="🔍 Search food..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            background: 'hsl(var(--bg3))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 7,
            padding: '5px 8px',
            fontSize: 9,
            color: 'hsl(var(--text))',
            outline: 'none',
          }}
        />
        <button style={{
          background: 'hsl(var(--primary))',
          color: 'hsl(220,16%,6%)',
          borderRadius: 7,
          padding: '5px 7px',
          fontSize: 10,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
        }}>
          <Camera size={12} />
        </button>
      </div>

      {/* Meal Sections */}
      {MEALS.map(meal => {
        const entries = grouped[meal] || [];
        return (
          <div key={meal} style={{
            background: 'hsl(var(--bg2))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 10,
            padding: 11,
          }}>
            <div style={{
              fontSize: 9,
              fontWeight: 600,
              color: 'hsl(var(--text))',
              marginBottom: 7,
            }}>
              {meal}
            </div>

            {entries.map((entry, i) => (
              <div key={entry.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 0',
                borderBottom: i < entries.length - 1
                  ? '1px solid hsl(var(--border))'
                  : 'none',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 500, color: 'hsl(var(--text))' }}>
                    {entry.food_name}
                  </div>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 8,
                    color: 'hsl(var(--dim))',
                  }}>
                    {Math.round(entry.calories)} kcal · P{Math.round(entry.protein_g)} C{Math.round(entry.carbs_g)} F{Math.round(entry.fat_g)}
                  </div>
                </div>
                <button
                  onClick={() => deleteLog(entry.id)}
                  style={{
                    color: 'hsl(var(--dim))',
                    fontSize: 10,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 2,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}

            {/* Add to meal button */}
            <button style={{
              width: '100%',
              marginTop: entries.length > 0 ? 8 : 0,
              border: '1px solid hsla(192,91%,54%,0.3)',
              color: 'hsl(var(--primary))',
              background: 'transparent',
              padding: 5,
              fontSize: 8,
              borderRadius: 8,
              cursor: 'pointer',
            }}>
              + Add to {meal}
            </button>
          </div>
        );
      })}

      {/* AI FAB */}
      <button
        onClick={() => setShowAI(true)}
        className="fixed bottom-[80px] right-4 w-12 h-12 rounded-full flex items-center justify-center z-30 shadow-lg"
        style={{ background: 'hsl(var(--primary))' }}
      >
        <MessageCircle size={20} style={{ color: 'hsl(var(--primary-foreground))' }} />
      </button>

      {/* AI sheet */}
      {showAI && (
        <>
          <div className="fixed inset-0 z-[60]" style={{ background: 'hsla(0,0%,0%,0.6)' }} onClick={() => setShowAI(false)} />
          <div className="fixed left-0 right-0 bottom-[60px] z-[70] p-5 space-y-4"
            style={{ background: 'hsl(var(--bg2))', borderRadius: '20px 20px 0 0' }}>
            <div className="flex justify-between items-center">
              <h3 className="font-display text-xl" style={{ color: 'hsl(var(--text))' }}>AI Nutrition Coach</h3>
              <button onClick={() => setShowAI(false)}>
                <X size={20} style={{ color: 'hsl(var(--dim))' }} />
              </button>
            </div>
            <div className="rounded-[12px] p-4 text-sm" style={{ background: 'hsl(var(--bg3))', color: 'hsl(var(--mid))' }}>
              AI Nutrition Coach activates in Phase 4 when Anthropic API is connected
            </div>
            <input
              placeholder="Ask anything about your nutrition..."
              disabled
              className="w-full rounded-[12px] p-3 text-sm"
              style={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--dim))' }}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default MacrosTab;
