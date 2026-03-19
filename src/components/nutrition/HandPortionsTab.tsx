import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Plus, X, Minus, Search, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

/* ── PN conversion constants ── */
const PN = {
  protein: { emoji: '🤜', label: 'Protein', shape: 'Palm-sized', unit: 'palms', protein: 24, carbs: 2, fat: 4.5, calories: 145 },
  veggies: { emoji: '👊', label: 'Veggies', shape: 'Fist-sized', unit: 'fists', protein: 1.5, carbs: 5, fat: 0, calories: 25 },
  carbs:   { emoji: '🤲', label: 'Carbs', shape: 'Cupped hand', unit: 'hands', protein: 3, carbs: 25, fat: 1, calories: 120 },
  fats:    { emoji: '👍', label: 'Fats', shape: 'Thumb-sized', unit: 'thumbs', protein: 2, carbs: 2, fat: 9, calories: 100 },
} as const;

type PNCat = keyof typeof PN;
const CATEGORIES: PNCat[] = ['protein', 'veggies', 'carbs', 'fats'];
const MEALS = ['Breakfast', 'Lunch', 'Dinner'] as const;

interface Entry {
  id: string;
  meal_type: string;
  category: string;
  portions: number;
  food_name: string | null;
  estimated_protein: number;
  estimated_carbs: number;
  estimated_fat: number;
  estimated_calories: number;
}

interface FoodResult {
  fdcId: number;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

interface Props { selectedDate: string; }

const HandPortionsTab = ({ selectedDate }: Props) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMeal, setSheetMeal] = useState<string>('Breakfast');
  const [selectedCat, setSelectedCat] = useState<PNCat | null>(null);
  const [portions, setPortions] = useState(1);
  const [saving, setSaving] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  // Food search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodResult | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hand_portion_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', selectedDate)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setEntries((data || []) as Entry[]);
    } catch { toast.error('Failed to load portions'); }
    finally { setLoading(false); }
  }, [user, selectedDate]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // Debounced food search
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { data, error } = await supabase.functions.invoke('food-search', {
          body: { query: searchQuery.trim() },
        });
        console.log('Hand portions search:', { data, error, query: searchQuery });
        if (error) {
          console.error('Search error details:', JSON.stringify(error));
          setSearchResults([]);
          return;
        }
        console.log('Search data structure:', Object.keys(data || {}));
        setSearchResults(data?.foods || data?.hints || data?.common || []);
      } catch (err) {
        console.error('Search exception:', err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const openSheet = (meal: string) => {
    setSheetMeal(meal);
    setSelectedCat(null);
    setPortions(1);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedFood(null);
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!user || !selectedCat) return;
    setSaving(true);
    const c = PN[selectedCat];
    const estProtein = Math.round(portions * c.protein * 10) / 10;
    const estCarbs = Math.round(portions * c.carbs * 10) / 10;
    const estFat = Math.round(portions * c.fat * 10) / 10;
    const estCalories = Math.round(portions * c.calories);
    const foodLabel = selectedFood?.name || null;
    const macroFoodName = foodLabel
      ? `${foodLabel} (${portions} ${c.unit})`
      : `${c.label} — ${portions} ${c.unit}`;

    try {
      // 1. Insert to hand_portion_entries
      const { error: hpError } = await supabase.from('hand_portion_entries').insert({
        user_id: user.id,
        date: selectedDate,
        meal_type: sheetMeal,
        category: selectedCat,
        portions,
        food_name: foodLabel,
        estimated_protein: estProtein,
        estimated_carbs: estCarbs,
        estimated_fat: estFat,
        estimated_calories: estCalories,
      });
      if (hpError) throw hpError;

      // 2. Also insert to macro_logs for two-way sync
      await supabase.from('macro_logs').insert({
        user_id: user.id,
        date: selectedDate,
        meal: sheetMeal,
        food_name: macroFoodName,
        serving_g: Math.round(portions * 100),
        calories: estCalories,
        protein_g: estProtein,
        carbs_g: estCarbs,
        fat_g: estFat,
        source: 'hand_portions',
      } as any);

      toast.success('Logged! 🤜');
      setSheetOpen(false);
      await fetchEntries();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const deleteEntry = async (id: string) => {
    const entry = entries.find(e => e.id === id);
    try {
      const { error } = await supabase.from('hand_portion_entries').delete().eq('id', id);
      if (error) throw error;

      // Also delete matching macro_logs entry
      if (user && entry) {
        const cat = entry.category as PNCat;
        const c = PN[cat] || PN.protein;
        const macroFoodName = entry.food_name
          ? `${entry.food_name} (${entry.portions} ${c.unit})`
          : `${c.label} — ${entry.portions} ${c.unit}`;
        await supabase.from('macro_logs')
          .delete()
          .eq('user_id', user.id)
          .eq('date', selectedDate)
          .eq('meal', entry.meal_type)
          .eq('food_name', macroFoodName);
      }

      await fetchEntries();
    } catch { toast.error('Failed to delete'); }
  };

  /* ── Computed summaries ── */
  const dailySums = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = entries.filter(e => e.category === cat).reduce((s, e) => s + e.portions, 0);
    return acc;
  }, {} as Record<PNCat, number>);

  const estTotals = entries.reduce((a, e) => ({
    protein: a.protein + (e.estimated_protein || 0),
    carbs: a.carbs + (e.estimated_carbs || 0),
    fat: a.fat + (e.estimated_fat || 0),
    calories: a.calories + (e.estimated_calories || 0),
  }), { protein: 0, carbs: 0, fat: 0, calories: 0 });

  const mealEntries = (meal: string) => entries.filter(e => e.meal_type === meal);
  const mealSummary = (meal: string) => {
    const me = mealEntries(meal);
    return CATEGORIES.reduce((acc, cat) => {
      acc[cat] = me.filter(e => e.category === cat).reduce((s, e) => s + e.portions, 0);
      return acc;
    }, {} as Record<PNCat, number>);
  };

  const liveEst = selectedCat ? {
    protein: Math.round(portions * PN[selectedCat].protein * 10) / 10,
    calories: Math.round(portions * PN[selectedCat].calories),
  } : null;

  const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

  return (
    <div className="px-4 py-5 pb-24 space-y-4">
      {/* ── DAILY SUMMARY ── */}
      <div style={{ background: 'hsla(192,91%,54%,0.06)', border: '1px solid hsla(192,91%,54%,0.15)', borderRadius: 10, padding: 12 }}>
        <div style={{ ...mono, fontSize: 8, color: 'hsl(var(--dim))', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
          Daily Summary
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {CATEGORIES.map(cat => (
            <div key={cat} style={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))', borderRadius: 6, padding: '8px 4px', textAlign: 'center' }}>
              <div style={{ fontSize: 16 }}>{PN[cat].emoji}</div>
              <div style={{ ...mono, fontSize: 14, color: 'hsl(var(--primary))', fontWeight: 700 }}>
                {dailySums[cat] || 0}
              </div>
              <div style={{ fontSize: 7, color: 'hsl(var(--dim))' }}>{PN[cat].unit}</div>
            </div>
          ))}
        </div>
        <div style={{ ...mono, fontSize: 9, color: 'hsl(var(--dim))', textAlign: 'center', marginTop: 8 }}>
          ~{Math.round(estTotals.protein)}g protein · ~{Math.round(estTotals.carbs)}g carbs · ~{Math.round(estTotals.fat)}g fat · ~{Math.round(estTotals.calories)} kcal
        </div>
      </div>

      {/* ── MEAL CARDS ── */}
      {MEALS.map(meal => {
        const me = mealEntries(meal);
        const ms = mealSummary(meal);
        return (
          <div key={meal} style={{ background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))', borderRadius: 10, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: me.length > 0 ? 10 : 0 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'hsl(var(--text))' }}>{meal}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {me.length > 0 && (
                  <span style={{ ...mono, fontSize: 9, color: 'hsl(var(--dim))' }}>
                    {CATEGORIES.filter(c => ms[c] > 0).map(c => `${PN[c].emoji}${ms[c]}`).join(' ')}
                  </span>
                )}
                <button onClick={() => openSheet(meal)} style={{
                  display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'hsl(var(--primary))',
                  background: 'none', border: '1px solid hsl(var(--primary) / 0.3)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer',
                }}>
                  <Plus size={10} /> Add
                </button>
              </div>
            </div>

            {me.length > 0 ? me.map(entry => {
              const cat = entry.category as PNCat;
              const pn = PN[cat] || PN.protein;
              return (
                <div key={entry.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid hsl(var(--border))', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{pn.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text))' }}>
                      {entry.portions} {pn.unit}
                    </div>
                    {entry.food_name && (
                      <div style={{ fontSize: 11, color: 'hsl(var(--dim))' }}>{entry.food_name}</div>
                    )}
                    <div style={{ ...mono, fontSize: 9, color: 'hsl(var(--dim))' }}>
                      ~{Math.round(entry.estimated_protein || 0)}g P · ~{Math.round(entry.estimated_calories || 0)} kcal
                    </div>
                  </div>
                  <button onClick={() => deleteEntry(entry.id)} style={{ color: 'hsl(var(--dim))', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                    <X size={14} />
                  </button>
                </div>
              );
            }) : (
              <div style={{ fontSize: 11, color: 'hsl(var(--dim))', textAlign: 'center', padding: '16px 0' }}>
                No portions logged for {meal}
              </div>
            )}
          </div>
        );
      })}

      {/* ── PN GUIDE ── */}
      <button onClick={() => setGuideOpen(!guideOpen)} style={{
        width: '100%', background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))',
        borderRadius: 8, padding: '10px 14px', cursor: 'pointer', textAlign: 'left',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ ...mono, fontSize: 9, color: 'hsl(var(--dim))', letterSpacing: 1 }}>
            📖 HOW HAND PORTIONS WORK
          </span>
          {guideOpen ? <ChevronUp size={14} style={{ color: 'hsl(var(--dim))' }} /> : <ChevronDown size={14} style={{ color: 'hsl(var(--dim))' }} />}
        </div>
      </button>
      {guideOpen && (
        <div className="space-y-1">
          {CATEGORIES.map(cat => {
            const c = PN[cat];
            return (
              <div key={cat} style={{ background: 'hsl(var(--bg3))', borderRadius: 6, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>{c.emoji}</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text))' }}>{c.label} — Use your {c.shape.toLowerCase().replace('-sized', '')}</div>
                  <div style={{ ...mono, fontSize: 9, color: 'hsl(var(--dim))' }}>
                    One {c.shape.toLowerCase().replace('-sized', '')} = ~{c.protein}g protein, ~{c.calories} kcal
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{ fontSize: 11, color: 'hsl(var(--dim))', textAlign: 'center', marginTop: 8, fontStyle: 'italic' }}>
            Aim for 1–2 of each category per meal for balanced nutrition.
          </div>
        </div>
      )}

      {/* ── ADD ENTRY SHEET ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl" style={{ background: 'hsl(var(--bg1))', maxHeight: '85vh', overflowY: 'auto' }}>
          <SheetHeader className="flex flex-row items-center justify-between pb-4">
            <SheetTitle style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 1, color: 'hsl(var(--text))' }}>
              LOG PORTIONS
            </SheetTitle>
            <span style={{ ...mono, fontSize: 9, background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))', borderRadius: 4, padding: '2px 8px', color: 'hsl(var(--dim))' }}>
              {sheetMeal}
            </span>
          </SheetHeader>

          {/* Step 1 — Category */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ ...mono, fontSize: 9, color: 'hsl(var(--dim))', marginBottom: 8 }}>Select portion type</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {CATEGORIES.map(cat => {
                const c = PN[cat];
                const active = selectedCat === cat;
                return (
                  <button key={cat} onClick={() => { setSelectedCat(cat); setPortions(1); setSelectedFood(null); setSearchQuery(''); setSearchResults([]); }}
                    style={{
                      background: active ? 'hsla(192,91%,54%,0.12)' : 'hsl(var(--bg3))',
                      border: active ? '2px solid hsl(192,91%,54%)' : '1px solid hsl(var(--border))',
                      borderRadius: 12, padding: 16, textAlign: 'center', cursor: 'pointer',
                    }}>
                    <div style={{ fontSize: 28 }}>{c.emoji}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: active ? 'hsl(192,91%,54%)' : 'hsl(var(--text))', marginTop: 4 }}>{c.label}</div>
                    <div style={{ fontSize: 9, color: active ? 'hsl(215,14%,50%)' : 'hsl(var(--dim))' }}>{c.shape}</div>
                    <div style={{ ...mono, fontSize: 8, color: active ? 'hsl(215,14%,50%)' : 'hsl(var(--dim))', marginTop: 2 }}>
                      ~{c.protein}g protein · ~{c.calories} kcal
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2 — Portions */}
          {selectedCat && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'hsl(var(--mid))', marginBottom: 10 }}>
                How many {PN[selectedCat].unit}?
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 8 }}>
                <button onClick={() => setPortions(p => Math.max(0.5, p - 0.5))} style={{
                  width: 44, height: 44, borderRadius: 8, fontSize: 20,
                  background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))',
                  color: 'hsl(var(--text))', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}><Minus size={18} /></button>
                <div style={{ textAlign: 'center', minWidth: 60 }}>
                  <div style={{ ...mono, fontSize: 32, fontWeight: 700, color: 'hsl(var(--primary))' }}>{portions}</div>
                  <div style={{ fontSize: 11, color: 'hsl(var(--dim))' }}>{PN[selectedCat].unit}</div>
                </div>
                <button onClick={() => setPortions(p => Math.min(10, p + 0.5))} style={{
                  width: 44, height: 44, borderRadius: 8, fontSize: 20,
                  background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))',
                  color: 'hsl(var(--text))', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}><Plus size={18} /></button>
              </div>
              {liveEst && (
                <div style={{ ...mono, fontSize: 10, color: 'hsl(var(--primary))', background: 'hsl(var(--pgb))', borderRadius: 6, padding: '8px 12px', textAlign: 'center' }}>
                  {portions} {PN[selectedCat].unit} ≈ {liveEst.protein}g protein · {liveEst.calories} kcal
                </div>
              )}
            </div>
          )}

          {/* Step 3 — Food search (optional) */}
          {selectedCat && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'hsl(var(--dim))', marginBottom: 6 }}>What did you eat? (optional)</div>

              {selectedFood ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'hsl(var(--pgb))', border: '1px solid hsl(var(--primary))',
                  borderRadius: 8, padding: '6px 10px',
                }}>
                  <span style={{ fontSize: 11, color: 'hsl(var(--primary))', flex: 1 }}>{selectedFood.name}</span>
                  <div style={{ ...mono, fontSize: 8, color: 'hsl(var(--dim))' }}>
                    {selectedFood.calories}cal
                  </div>
                  <button onClick={() => { setSelectedFood(null); setSearchQuery(''); }} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                  }}>
                    <X size={12} style={{ color: 'hsl(var(--primary))' }} />
                  </button>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--dim))' }} />
                    <input
                      ref={searchRef}
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search food... e.g. chicken"
                      style={{
                        width: '100%', background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))',
                        borderRadius: 8, padding: '10px 14px 10px 32px', fontSize: 12, color: 'hsl(var(--text))', outline: 'none',
                      }}
                    />
                    {searching && (
                      <Loader2 size={14} className="animate-spin" style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--primary))',
                      }} />
                    )}
                  </div>

                  {/* Results dropdown */}
                  {searchQuery.length >= 2 && (
                    <div style={{
                      background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))',
                      borderRadius: 8, maxHeight: 180, overflowY: 'auto', marginTop: 4,
                    }}>
                      {searching ? (
                        <div style={{ padding: 12, textAlign: 'center', color: 'hsl(var(--dim))', fontSize: 10 }}>
                          <Loader2 size={14} className="animate-spin" style={{ display: 'inline-block', marginRight: 6, color: 'hsl(var(--primary))' }} />
                          Searching...
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div style={{ padding: 12, textAlign: 'center', color: 'hsl(var(--dim))', fontSize: 10 }}>
                          No results found
                        </div>
                      ) : (
                        searchResults.map(food => (
                          <button
                            key={food.fdcId}
                            onClick={() => { setSelectedFood(food); setSearchQuery(''); setSearchResults([]); }}
                            style={{
                              display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
                              background: 'transparent', border: 'none', borderBottom: '1px solid hsl(var(--border))',
                              cursor: 'pointer',
                            }}
                          >
                            <div style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--text))' }}>{food.name}</div>
                            <div style={{ ...mono, fontSize: 9, color: 'hsl(var(--dim))' }}>
                              {food.calories}cal · P:{food.protein_g}g C:{food.carbs_g}g F:{food.fat_g}g
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  <button onClick={() => setSearchQuery('')} style={{
                    background: 'none', border: 'none', fontSize: 10, color: 'hsl(var(--dim))',
                    cursor: 'pointer', marginTop: 4, padding: 0,
                  }}>
                    Skip
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Save */}
          {selectedCat && (
            <button onClick={handleSave} disabled={saving} style={{
              width: '100%', padding: 14, borderRadius: 10, border: 'none',
              background: 'hsl(var(--primary))', color: 'hsl(220,16%,6%)',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1,
            }}>
              {saving ? 'Saving...' : `Log ${portions} ${PN[selectedCat].unit} of ${PN[selectedCat].label}`}
            </button>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default HandPortionsTab;
