import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MessageCircle, X, Camera, Loader2 } from 'lucide-react';
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

interface FoodResult {
  fdcId: number;
  name: string;
  brandOwner: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  serving_g: number;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MEALS = ['Breakfast', 'Lunch', 'Dinner'] as const;

const MacrosTab = () => {
  const { user } = useAuth();
  const [targets, setTargets] = useState({ protein_g: 150, carbs_g: 200, fat_g: 70, calories: 2400 });
  const [logs, setLogs] = useState<MacroLog[]>([]);
  const [showAI, setShowAI] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<string>('Breakfast');
  const [selectedFood, setSelectedFood] = useState<FoodResult | null>(null);
  const [servingSize, setServingSize] = useState(100);
  const [isAdding, setIsAdding] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

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

  // Debounced food search
  const searchFood = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    setIsSearching(true);
    setShowSearchResults(true);
    try {
      const { data, error } = await supabase.functions.invoke('food-search', {
        body: { query: query.trim() },
      });
      if (error) throw error;
      setSearchResults(data?.foods ?? []);
    } catch (err) {
      console.error('Food search error:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchFood(value), 400);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelectFood = (food: FoodResult) => {
    setSelectedFood(food);
    setServingSize(100);
    setShowSearchResults(false);
    setSearchQuery('');
  };

  const handleAddFood = async () => {
    if (!user || !selectedFood) return;
    setIsAdding(true);
    try {
      const scale = servingSize / 100;
      const { error } = await supabase.from('macro_logs').insert({
        user_id: user.id,
        date: todayStr,
        meal: selectedMeal,
        food_name: selectedFood.name,
        calories: Math.round(selectedFood.calories * scale),
        protein_g: Math.round(selectedFood.protein_g * scale * 10) / 10,
        carbs_g: Math.round(selectedFood.carbs_g * scale * 10) / 10,
        fat_g: Math.round(selectedFood.fat_g * scale * 10) / 10,
        serving_g: servingSize,
      });
      if (error) throw error;
      await fetchData();
      setSelectedFood(null);
      setSearchQuery('');
      toast({ title: `Added to ${selectedMeal}` });
    } catch (err) {
      console.error('Add food error:', err);
      toast({ title: 'Failed to add food', variant: 'destructive' });
    } finally {
      setIsAdding(false);
    }
  };

  const handleMealAddButton = (meal: string) => {
    setSelectedMeal(meal);
    setSelectedFood(null);
    setSearchQuery('');
    setSearchResults([]);
    // Focus the search input
    setTimeout(() => {
      const input = document.getElementById('macro-food-search');
      if (input) {
        input.focus();
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

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
      <div ref={searchContainerRef} style={{ position: 'relative' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
          {/* Meal selector pills */}
          {MEALS.map(meal => (
            <button
              key={meal}
              onClick={() => setSelectedMeal(meal)}
              style={{
                fontSize: 8,
                padding: '3px 8px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                background: selectedMeal === meal ? 'hsl(var(--primary))' : 'hsl(var(--bg3))',
                color: selectedMeal === meal ? 'hsl(220,16%,6%)' : 'hsl(var(--dim))',
                transition: 'all 0.2s',
              }}
            >
              {meal}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              id="macro-food-search"
              type="text"
              placeholder={`🔍 Search food to add to ${selectedMeal}...`}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              style={{
                width: '100%',
                background: 'hsl(var(--bg3))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 7,
                padding: '5px 8px',
                paddingRight: isSearching ? 28 : 8,
                fontSize: 9,
                color: 'hsl(var(--text))',
                outline: 'none',
              }}
            />
            {isSearching && (
              <Loader2
                size={12}
                className="animate-spin"
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'hsl(var(--primary))',
                }}
              />
            )}
          </div>
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

        {/* Search Results Dropdown */}
        {showSearchResults && (
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '100%',
            marginTop: 4,
            background: 'hsl(var(--bg2))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 10,
            maxHeight: 260,
            overflowY: 'auto',
            zIndex: 100,
            boxShadow: '0 8px 24px hsla(0,0%,0%,0.3)',
          }}>
            {isSearching ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'hsl(var(--dim))', fontSize: 10 }}>
                <Loader2 size={16} className="animate-spin" style={{ margin: '0 auto 6px', display: 'block', color: 'hsl(var(--primary))' }} />
                Searching...
              </div>
            ) : searchResults.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'hsl(var(--dim))', fontSize: 10 }}>
                No foods found — try a different name
              </div>
            ) : (
              searchResults.map((food) => (
                <button
                  key={food.fdcId}
                  onClick={() => handleSelectFood(food)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 12px',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid hsl(var(--border))',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'hsl(var(--bg3))')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ fontSize: 10, fontWeight: 500, color: 'hsl(var(--text))', marginBottom: 2 }}>
                    {food.name}
                  </div>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 8,
                    color: 'hsl(var(--dim))',
                  }}>
                    100g · {food.calories} kcal · P{food.protein_g}g C{food.carbs_g}g F{food.fat_g}g
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Serving Size Confirmation */}
      {selectedFood && (
        <div style={{
          background: 'hsl(var(--bg2))',
          border: '1px solid hsl(var(--primary) / 0.3)',
          borderRadius: 10,
          padding: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'hsl(var(--text))' }}>
                {selectedFood.name}
              </div>
              <div style={{ fontSize: 8, color: 'hsl(var(--dim))', marginTop: 2 }}>
                Adding to {selectedMeal}
              </div>
            </div>
            <button
              onClick={() => setSelectedFood(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
            >
              <X size={14} style={{ color: 'hsl(var(--dim))' }} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <label style={{ fontSize: 9, color: 'hsl(var(--mid))' }}>Serving:</label>
            <input
              type="number"
              value={servingSize}
              onChange={(e) => setServingSize(Math.max(1, Number(e.target.value) || 0))}
              style={{
                width: 60,
                background: 'hsl(var(--bg3))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 6,
                padding: '4px 6px',
                fontSize: 10,
                color: 'hsl(var(--text))',
                textAlign: 'center',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: 9, color: 'hsl(var(--dim))' }}>g</span>
          </div>

          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: 'hsl(var(--mid))',
            marginBottom: 10,
          }}>
            {Math.round(selectedFood.calories * servingSize / 100)} kcal ·{' '}
            P{Math.round(selectedFood.protein_g * servingSize / 100 * 10) / 10}g{' '}
            C{Math.round(selectedFood.carbs_g * servingSize / 100 * 10) / 10}g{' '}
            F{Math.round(selectedFood.fat_g * servingSize / 100 * 10) / 10}g
          </div>

          <button
            onClick={handleAddFood}
            disabled={isAdding}
            style={{
              width: '100%',
              padding: 8,
              borderRadius: 8,
              border: 'none',
              background: 'hsl(var(--primary))',
              color: 'hsl(220,16%,6%)',
              fontSize: 10,
              fontWeight: 700,
              cursor: 'pointer',
              opacity: isAdding ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {isAdding ? <Loader2 size={12} className="animate-spin" /> : null}
            {isAdding ? 'Adding...' : `Add to ${selectedMeal}`}
          </button>
        </div>
      )}

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

            <button
              onClick={() => handleMealAddButton(meal)}
              style={{
                width: '100%',
                marginTop: entries.length > 0 ? 8 : 0,
                border: '1px solid hsla(192,91%,54%,0.3)',
                color: 'hsl(var(--primary))',
                background: 'transparent',
                padding: 5,
                fontSize: 8,
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
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
