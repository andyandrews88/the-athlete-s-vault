import { useState, useEffect, useRef } from 'react';
import { useNutritionData, classifyFood, getPortionCount, PN, type PNCategory, type FoodLog, type FoodResult } from '@/hooks/useNutritionData';
import { ChevronDown, ChevronUp, Loader2, Search } from 'lucide-react';

const MEALS = ['Breakfast', 'Lunch', 'Dinner'] as const;
const CATEGORIES: PNCategory[] = ['protein', 'veggies', 'carbs', 'fats'];

interface Props {
  selectedDate: string;
}

const HandPortionsTab = ({ selectedDate }: Props) => {
  const {
    logs, logsByMeal, pnDailyTotals,
    searchResults, searching, searchFood, clearSearchResults,
    addFood, deleteLog,
  } = useNutritionData(selectedDate);

  const [guideOpen, setGuideOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodResult | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<string>('Breakfast');
  const [servingSize, setServingSize] = useState(100);
  const [isAdding, setIsAdding] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchFood(searchQuery);
        setShowResults(true);
      } else {
        clearSearchResults();
        setShowResults(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelectFood = (food: FoodResult) => {
    setSelectedFood(food);
    setServingSize(100);
    setShowResults(false);
    setSearchQuery('');
  };

  const handleAdd = async () => {
    if (!selectedFood) return;
    setIsAdding(true);
    await addFood(selectedFood, selectedMeal, servingSize);
    setSelectedFood(null);
    setSearchQuery('');
    setIsAdding(false);
  };

  const focusSearchWithMeal = (meal: string) => {
    setSelectedMeal(meal);
    inputRef.current?.focus();
    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Compute meal-level PN summaries
  const mealPNSummary = (foods: FoodLog[]) => {
    const sums = { protein: 0, carbs: 0, fats: 0, veggies: 0 };
    foods.forEach(f => {
      const cat = classifyFood(f);
      sums[cat] += getPortionCount(f, cat);
    });
    return sums;
  };

  return (
    <div className="px-4 py-5 pb-24 space-y-4">
      {/* PN Guide Card */}
      <button
        onClick={() => setGuideOpen(!guideOpen)}
        style={{
          width: '100%',
          background: 'hsl(var(--bg3))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 8,
          padding: '10px 14px',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: 'hsl(var(--primary))',
            letterSpacing: 1,
          }}>
            🤜 PRECISION NUTRITION METHOD
          </span>
          {guideOpen ? <ChevronUp size={14} style={{ color: 'hsl(var(--dim))' }} /> : <ChevronDown size={14} style={{ color: 'hsl(var(--dim))' }} />}
        </div>
        {guideOpen && (
          <div style={{ marginTop: 10 }} onClick={e => e.stopPropagation()}>
            {([
              { emoji: '🤜', label: 'Palm = Protein', detail: '~24g per portion' },
              { emoji: '👊', label: 'Fist = Vegetables', detail: '~85g per portion' },
              { emoji: '🤲', label: 'Cupped hand = Carbs', detail: '~25g per portion' },
              { emoji: '👍', label: 'Thumb = Fats', detail: '~9g per portion' },
            ]).map(r => (
              <div key={r.emoji} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>{r.emoji}</span>
                <span style={{ fontSize: 11, color: 'hsl(var(--mid))' }}>
                  {r.label} <span style={{ color: 'hsl(var(--dim))' }}>{r.detail}</span>
                </span>
              </div>
            ))}
            <div style={{ fontSize: 10, color: 'hsl(var(--dim))', fontStyle: 'italic', marginTop: 8 }}>
              Aim for 1–2 of each category per meal
            </div>
          </div>
        )}
      </button>

      {/* Daily Summary */}
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
          {CATEGORIES.map(cat => (
            <div key={cat} style={{
              background: 'hsl(var(--bg3))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 6,
              padding: 6,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 14, marginBottom: 2 }}>{PN[cat].emoji}</div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 14,
                color: 'hsl(var(--primary))',
                fontWeight: 700,
              }}>
                {pnDailyTotals[cat]}
              </div>
              <div style={{ fontSize: 7, color: 'hsl(var(--dim))' }}>{PN[cat].plural}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Food Search */}
      <div ref={searchRef} style={{ position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'hsl(var(--dim))',
          }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search food to log..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'hsl(var(--bg3))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
              padding: '10px 14px 10px 32px',
              fontSize: 12,
              color: 'hsl(var(--text))',
              outline: 'none',
            }}
          />
          {searching && (
            <Loader2 size={14} className="animate-spin" style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              color: 'hsl(var(--primary))',
            }} />
          )}
        </div>

        {/* Results dropdown */}
        {showResults && (
          <div style={{
            position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4,
            background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))',
            borderRadius: 8, maxHeight: 200, overflowY: 'auto', zIndex: 100,
            boxShadow: '0 8px 24px hsla(0,0%,0%,0.3)',
          }}>
            {searching ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'hsl(var(--dim))', fontSize: 10 }}>
                <Loader2 size={14} className="animate-spin" style={{ margin: '0 auto 4px', display: 'block', color: 'hsl(var(--primary))' }} />
                Searching...
              </div>
            ) : searchResults.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'hsl(var(--dim))', fontSize: 10 }}>
                No results for "{searchQuery}"
              </div>
            ) : (
              searchResults.map(food => (
                <button
                  key={food.fdcId}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => handleSelectFood(food)}
                  style={{
                    display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left',
                    background: 'transparent', border: 'none',
                    borderBottom: '1px solid hsl(var(--border))', cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--text))', marginBottom: 2 }}>
                    {food.name}
                  </div>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'hsl(var(--dim))',
                  }}>
                    {food.calories}cal · P:{food.protein_g}g C:{food.carbs_g}g F:{food.fat_g}g
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Meal + Serving selector */}
      {selectedFood && (
        <div style={{
          background: 'hsl(var(--bg2))',
          border: '1px solid hsl(var(--primary) / 0.3)',
          borderRadius: 10, padding: 12,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text))', marginBottom: 8 }}>
            {selectedFood.name}
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {[...MEALS, 'Snack' as const].map(m => (
              <button key={m} onClick={() => setSelectedMeal(m)} style={{
                fontSize: 9, padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontWeight: 600,
                background: selectedMeal === m ? 'hsl(var(--primary))' : 'hsl(var(--bg3))',
                color: selectedMeal === m ? 'hsl(220,16%,6%)' : 'hsl(var(--dim))',
              }}>
                {m}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <input
              type="number"
              value={servingSize}
              onChange={e => setServingSize(Math.max(1, Number(e.target.value) || 0))}
              style={{
                width: 60, background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))',
                borderRadius: 6, padding: '4px 6px', fontSize: 12, color: 'hsl(var(--text))',
                textAlign: 'center', outline: 'none',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            />
            <span style={{ fontSize: 10, color: 'hsl(var(--dim))' }}>g</span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'hsl(var(--mid))', marginLeft: 'auto',
            }}>
              {Math.round(selectedFood.calories * servingSize / 100)}cal · P{Math.round(selectedFood.protein_g * servingSize / 100 * 10) / 10}g C{Math.round(selectedFood.carbs_g * servingSize / 100 * 10) / 10}g F{Math.round(selectedFood.fat_g * servingSize / 100 * 10) / 10}g
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleAdd} disabled={isAdding} style={{
              flex: 1, padding: 8, borderRadius: 8, border: 'none',
              background: 'hsl(var(--primary))', color: 'hsl(220,16%,6%)',
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
              opacity: isAdding ? 0.6 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              {isAdding && <Loader2 size={12} className="animate-spin" />}
              {isAdding ? 'Adding...' : 'Add Food'}
            </button>
            <button onClick={() => setSelectedFood(null)} style={{
              padding: '8px 12px', borderRadius: 8, border: 'none',
              background: 'transparent', color: 'hsl(var(--dim))',
              fontSize: 11, cursor: 'pointer',
            }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Meal Cards */}
      {MEALS.map(meal => {
        const foods = logsByMeal[meal] || [];
        const summary = mealPNSummary(foods);

        // Group foods by PN category
        const byCategory: Record<PNCategory, FoodLog[]> = { protein: [], veggies: [], carbs: [], fats: [] };
        foods.forEach(f => { byCategory[classifyFood(f)].push(f); });

        return (
          <div key={meal} style={{
            background: 'hsl(var(--bg2))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 10, padding: 14, marginBottom: 0,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: foods.length > 0 ? 10 : 0 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text))' }}>{meal}</span>
              {foods.length > 0 && (
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'hsl(var(--dim))' }}>
                  {CATEGORIES.map(c => `${PN[c].emoji}${Math.round(summary[c] * 10) / 10}`).join(' ')}
                </span>
              )}
            </div>

            {foods.length > 0 ? (
              CATEGORIES.filter(cat => byCategory[cat].length > 0).map(cat => (
                <div key={cat} style={{ marginBottom: 8 }}>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'hsl(var(--primary))',
                    marginBottom: 4,
                  }}>
                    {PN[cat].emoji} {cat.charAt(0).toUpperCase() + cat.slice(1)} · {Math.round(byCategory[cat].reduce((s, f) => s + getPortionCount(f, cat), 0) * 10) / 10} {PN[cat].plural}
                  </div>
                  {byCategory[cat].map(f => (
                    <div key={f.id} style={{
                      display: 'flex', alignItems: 'center', padding: '6px 0',
                      borderBottom: '1px solid hsl(var(--border))',
                    }}>
                      <span style={{ flex: 1, fontSize: 11, color: 'hsl(var(--text))' }}>{f.food_name}</span>
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'hsl(var(--dim))',
                        marginRight: 8,
                      }}>
                        {getPortionCount(f, cat)} {PN[cat].plural}
                      </span>
                      <button onClick={() => deleteLog(f.id)} style={{
                        color: 'hsl(var(--dim))', fontSize: 10, background: 'none',
                        border: 'none', cursor: 'pointer', padding: 2,
                      }}>✕</button>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <button onClick={() => focusSearchWithMeal(meal)} style={{
                fontSize: 11, color: 'hsl(var(--dim))', background: 'none',
                border: 'none', cursor: 'pointer', padding: 0,
              }}>
                + Log food for {meal}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default HandPortionsTab;
