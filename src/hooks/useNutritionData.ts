import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface FoodLog {
  id: string;
  meal: string;
  food_name: string;
  serving_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface FoodResult {
  fdcId: number;
  name: string;
  brandOwner: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  serving_g: number;
}

const PN = {
  protein: { grams: 24, emoji: '🤜', shape: 'palm', plural: 'palms' },
  carbs: { grams: 25, emoji: '🤲', shape: 'cupped hand', plural: 'hands' },
  fats: { grams: 9, emoji: '👍', shape: 'thumb', plural: 'thumbs' },
  veggies: { grams: 85, emoji: '👊', shape: 'fist', plural: 'fists' },
} as const;

export { PN };

export type PNCategory = keyof typeof PN;

export function classifyFood(log: FoodLog): PNCategory {
  const { protein_g, carbs_g, fat_g, calories } = log;
  if (calories < 50 && protein_g < 5 && carbs_g < 10) return 'veggies';
  if (protein_g >= carbs_g && protein_g >= fat_g) return 'protein';
  if (carbs_g > protein_g && carbs_g >= fat_g) return 'carbs';
  return 'fats';
}

export function getPortionCount(log: FoodLog, category: PNCategory): number {
  switch (category) {
    case 'protein': return Math.round((log.protein_g / PN.protein.grams) * 10) / 10;
    case 'carbs': return Math.round((log.carbs_g / PN.carbs.grams) * 10) / 10;
    case 'fats': return Math.round((log.fat_g / PN.fats.grams) * 10) / 10;
    case 'veggies': return Math.round(((log.serving_g || 100) / PN.veggies.grams) * 10) / 10;
    default: return 0;
  }
}

export function useNutritionData(selectedDate: string) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState({ protein_g: 150, carbs_g: 200, fat_g: 70, calories: 2400 });
  const [searchResults, setSearchResults] = useState<FoodResult[]>([]);
  const [searching, setSearching] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [{ data: logsData, error: logsErr }, { data: t }] = await Promise.all([
        supabase
          .from('macro_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', selectedDate)
          .order('meal'),
        supabase
          .from('nutrition_targets')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);
      if (logsErr) throw logsErr;
      setLogs((logsData || []) as FoodLog[]);
      if (t) {
        setTargets({
          protein_g: t.protein_g ?? 150,
          carbs_g: t.carbs_g ?? 200,
          fat_g: t.fat_g ?? 70,
          calories: t.calories ?? 2400,
        });
      }
    } catch (err) {
      console.error('fetchLogs error:', err);
      toast.error('Failed to load food logs');
    } finally {
      setLoading(false);
    }
  }, [user, selectedDate]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const searchFood = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      console.log('Searching for:', query);
      const { data, error } = await supabase.functions.invoke('food-search', {
        body: { query: query.trim() },
      });
      console.log('Search result:', data, error);
      if (error) {
        console.error('Search error:', error);
        toast.error('Food search failed');
        return;
      }
      setSearchResults(data?.foods ?? []);
    } catch (err) {
      console.error('Search exception:', err);
      toast.error('Food search unavailable');
    } finally {
      setSearching(false);
    }
  };

  const clearSearchResults = () => setSearchResults([]);

  const addFood = async (food: FoodResult, mealType: string, servingSize: number) => {
    if (!user) return;
    try {
      const scale = servingSize / (food.serving_g || 100);
      const { error } = await supabase.from('macro_logs').insert({
        user_id: user.id,
        date: selectedDate,
        meal: mealType,
        food_name: food.name,
        calories: Math.round(food.calories * scale),
        protein_g: Math.round(food.protein_g * scale * 10) / 10,
        carbs_g: Math.round(food.carbs_g * scale * 10) / 10,
        fat_g: Math.round(food.fat_g * scale * 10) / 10,
        serving_g: servingSize,
      });
      if (error) throw error;
      toast.success(food.name + ' added');
      await fetchLogs();
      setSearchResults([]);
    } catch (err) {
      console.error('addFood error:', err);
      toast.error('Failed to add food');
    }
  };

  const deleteLog = async (id: string) => {
    try {
      const { error } = await supabase.from('macro_logs').delete().eq('id', id);
      if (error) throw error;
      await fetchLogs();
      toast.success('Entry removed');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const totals = logs.reduce((acc, log) => ({
    calories: acc.calories + (log.calories || 0),
    protein_g: acc.protein_g + (log.protein_g || 0),
    carbs_g: acc.carbs_g + (log.carbs_g || 0),
    fat_g: acc.fat_g + (log.fat_g || 0),
  }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

  const logsByMeal = logs.reduce((acc, log) => {
    const meal = log.meal || 'Other';
    if (!acc[meal]) acc[meal] = [];
    acc[meal].push(log);
    return acc;
  }, {} as Record<string, FoodLog[]>);

  const pnDailyTotals = {
    protein: Math.round(totals.protein_g / 24 * 10) / 10,
    carbs: Math.round(totals.carbs_g / 25 * 10) / 10,
    fats: Math.round(totals.fat_g / 9 * 10) / 10,
    veggies: Math.round(
      logs.filter(l => classifyFood(l) === 'veggies')
        .reduce((sum, l) => sum + ((l.serving_g || 100) / 85), 0) * 10
    ) / 10,
  };

  return {
    logs, loading, targets, totals, logsByMeal, pnDailyTotals,
    searchResults, searching, searchFood, clearSearchResults,
    addFood, deleteLog, refetch: fetchLogs,
  };
}
