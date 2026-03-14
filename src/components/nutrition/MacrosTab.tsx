import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Trash2, MessageCircle, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const MACROS = [
  { key: 'protein_g', label: 'Protein', unit: 'g' },
  { key: 'carbs_g', label: 'Carbs', unit: 'g' },
  { key: 'fat_g', label: 'Fat', unit: 'g' },
  { key: 'calories', label: 'Calories', unit: '' },
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

const MacrosTab = () => {
  const { user } = useAuth();
  const [targets, setTargets] = useState({ protein_g: 150, carbs_g: 200, fat_g: 70, calories: 2200 });
  const [logs, setLogs] = useState<MacroLog[]>([]);
  const [showAI, setShowAI] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const fetchData = useCallback(async () => {
    if (!user) return;
    // Targets
    const { data: t } = await supabase
      .from('nutrition_targets')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (t) setTargets({ protein_g: t.protein_g ?? 150, carbs_g: t.carbs_g ?? 200, fat_g: t.fat_g ?? 70, calories: t.calories ?? 2200 });

    // Logs
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

  // Group logs by meal
  const grouped = logs.reduce<Record<string, MacroLog[]>>((acc, l) => {
    (acc[l.meal] = acc[l.meal] || []).push(l);
    return acc;
  }, {});

  return (
    <div className="px-4 py-5 pb-24 space-y-6">
      {/* Targets header */}
      <div className="flex justify-around py-3 rounded-[12px]"
        style={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))' }}>
        {MACROS.map((m) => (
          <div key={m.key} className="text-center">
            <div className="font-mono text-sm" style={{ color: 'hsl(var(--primary))' }}>
              {targets[m.key]}{m.unit}
            </div>
            <div className="text-[10px]" style={{ color: 'hsl(var(--dim))' }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Search placeholder */}
      <div className="rounded-[12px] p-3 text-center text-xs"
        style={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--dim))' }}>
        Search coming soon — Nutritionix API key needed
      </div>

      {/* Progress bars */}
      <div className="space-y-3">
        {MACROS.map((m) => {
          const current = totals[m.key];
          const target = targets[m.key];
          const pct = Math.min((current / target) * 100, 100);
          const remaining = Math.max(target - current, 0);
          return (
            <div key={m.key} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span style={{ color: 'hsl(var(--mid))' }}>{m.label}</span>
                <span className="font-mono" style={{ color: 'hsl(var(--primary))' }}>
                  {Math.round(current)}{m.unit} / {remaining}{m.unit} left
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'hsl(var(--bg4))' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: 'hsl(var(--primary))' }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Meal log */}
      {Object.entries(grouped).map(([mealName, entries]) => (
        <div key={mealName} className="space-y-2">
          <h4 className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'hsl(var(--dim))' }}>
            {mealName}
          </h4>
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center gap-3 p-3 rounded-[10px]"
              style={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))' }}>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate" style={{ color: 'hsl(var(--text))' }}>{entry.food_name}</div>
                <div className="text-[10px] font-mono" style={{ color: 'hsl(var(--dim))' }}>
                  P:{Math.round(entry.protein_g)}g C:{Math.round(entry.carbs_g)}g F:{Math.round(entry.fat_g)}g · {Math.round(entry.calories)}cal
                </div>
              </div>
              <button onClick={() => deleteLog(entry.id)} className="p-1 shrink-0">
                <Trash2 size={14} style={{ color: 'hsl(var(--bad))' }} />
              </button>
            </div>
          ))}
        </div>
      ))}

      {logs.length === 0 && (
        <p className="text-center text-sm py-8" style={{ color: 'hsl(var(--dim))' }}>
          No meals logged today.
        </p>
      )}

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
