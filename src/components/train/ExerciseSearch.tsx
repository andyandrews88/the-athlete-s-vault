import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Search } from 'lucide-react';
import type { ExerciseRow } from '@/stores/workoutStore';

const MOVEMENT_PATTERN_COLORS: Record<string, string> = {
  Hinge: 'hsl(0 72% 51%)',
  Squat: 'hsl(262 60% 55%)',
  Push: 'hsl(192 91% 54%)',
  Rotational: 'hsl(192 91% 54%)',
  Pull: 'hsl(142 71% 45%)',
  'Single Leg': 'hsl(38 92% 50%)',
  Carry: 'hsl(38 92% 50%)',
  Conditioning: 'hsl(38 92% 50%)',
  Olympic: 'hsl(45 93% 58%)',
  Plyometric: 'hsl(45 93% 58%)',
  Core: 'hsl(215 14% 50%)',
  Isolation: 'hsl(215 14% 50%)',
};

const STRENGTH_GROUPS = ['All', 'Chest', 'Back', 'Shoulders', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Biceps', 'Triceps', 'Core', 'Full Body', 'Olympic', 'Plyometrics'];
const CONDITIONING_GROUPS = ['All', 'Cardio', 'CrossFit', 'Functional'];

interface ExerciseSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: ExerciseRow) => void;
  currentSection: 'warmup' | 'exercises' | 'cooldown';
}

export const ExerciseSearch = ({ isOpen, onClose, onSelectExercise, currentSection }: ExerciseSearchProps) => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'strength' | 'conditioning'>('strength');
  const [activeMuscleGroup, setActiveMuscleGroup] = useState('All');
  const [recentExercises, setRecentExercises] = useState<ExerciseRow[]>([]);
  const [allExercises, setAllExercises] = useState<ExerciseRow[]>([]);
  const [searchResults, setSearchResults] = useState<ExerciseRow[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const pillsRef = useRef<HTMLDivElement>(null);

  // Fetch recent exercises on mount
  useEffect(() => {
    if (!isOpen || !user) return;
    const fetchRecent = async () => {
      const { data } = await supabase
        .from('session_exercises')
        .select(`
          exercise_id,
          exercises ( id, name, movement_pattern, difficulty_coefficient, exercise_type, video_url, muscle_group, equipment_type, is_timed, is_unilateral, is_plyometric )
        `)
        .order('display_order', { ascending: false })
        .limit(30);
      if (!data) return;
      const seen = new Set<string>();
      const recents: ExerciseRow[] = [];
      for (const row of data as any[]) {
        const ex = row.exercises;
        if (!ex || seen.has(ex.id)) continue;
        seen.add(ex.id);
        recents.push(ex);
        if (recents.length >= 5) break;
      }
      setRecentExercises(recents);
    };
    fetchRecent();
  }, [isOpen, user]);

  // Fetch all exercises for browsing (no query)
  useEffect(() => {
    if (!isOpen) return;
    const fetchAll = async () => {
      const { data } = await supabase
        .from('exercises')
        .select('id, name, movement_pattern, difficulty_coefficient, exercise_type, video_url, muscle_group, equipment_type, is_timed, is_unilateral, is_plyometric')
        .order('name');
      setAllExercises((data as ExerciseRow[]) || []);
    };
    fetchAll();
  }, [isOpen]);

  // Auto-focus
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSearchResults([]);
      setActiveTab('strength');
      setActiveMuscleGroup('All');
    }
  }, [isOpen]);

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (q.length < 1) { setSearchResults([]); setIsSearching(false); return; }
    setIsSearching(true);
    const { data } = await supabase
      .from('exercises')
      .select('id, name, movement_pattern, difficulty_coefficient, exercise_type, video_url, muscle_group, equipment_type, is_timed, is_unilateral, is_plyometric')
      .ilike('name', `%${q}%`)
      .limit(30);
    setSearchResults((data as ExerciseRow[]) || []);
    setIsSearching(false);
  }, []);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 150);
  };

  // Filter logic
  const filterByTab = useCallback((exercises: ExerciseRow[]) => {
    if (activeTab === 'conditioning') {
      return exercises.filter(e => ['Conditioning', 'Plyometric', 'Functional'].includes(e.movement_pattern || '') || e.exercise_type === 'conditioning');
    }
    return exercises.filter(e => !['Conditioning'].includes(e.movement_pattern || '') && e.exercise_type !== 'conditioning');
  }, [activeTab]);

  const filterByGroup = useCallback((exercises: ExerciseRow[]) => {
    if (activeMuscleGroup === 'All') return exercises;
    return exercises.filter(e => (e.muscle_group || '').toLowerCase() === activeMuscleGroup.toLowerCase());
  }, [activeMuscleGroup]);

  const filteredResults = useMemo(() => {
    const source = query.length >= 1 ? searchResults : allExercises;
    return filterByGroup(filterByTab(source));
  }, [query, searchResults, allExercises, filterByTab, filterByGroup]);

  // Group by muscle_group for browsing
  const groupedResults = useMemo(() => {
    if (query.length >= 1) return null;
    const groups: Record<string, ExerciseRow[]> = {};
    for (const ex of filteredResults) {
      const g = ex.muscle_group || 'Other';
      if (!groups[g]) groups[g] = [];
      groups[g].push(ex);
    }
    return groups;
  }, [query, filteredResults]);

  // Add custom exercise
  const handleAddCustom = async () => {
    if (!user || !query.trim()) return;
    const { data, error } = await supabase
      .from('exercises')
      .insert({
        name: query.trim(),
        movement_pattern: 'Push',
        difficulty_coefficient: 1.0,
        exercise_type: 'strength',
        status: 'pending',
        is_custom: true,
        created_by: user.id,
        submitted_by: user.id,
      } as any)
      .select('id, name, movement_pattern, difficulty_coefficient, exercise_type, video_url, muscle_group, equipment_type, is_timed, is_unilateral, is_plyometric')
      .single();
    if (data && !error) onSelectExercise(data as ExerciseRow);
  };

  const pills = activeTab === 'strength' ? STRENGTH_GROUPS : CONDITIONING_GROUPS;

  if (!isOpen) return null;

  const renderRow = (ex: ExerciseRow) => (
    <button
      key={ex.id}
      onClick={() => onSelectExercise(ex)}
      className="w-full flex items-center gap-2.5 text-left transition-colors"
      style={{ padding: '12px 16px', borderBottom: '1px solid hsl(var(--border))' }}
    >
      {/* Movement pattern pip */}
      <div
        style={{
          width: 4, height: 28, borderRadius: 2, flexShrink: 0,
          background: MOVEMENT_PATTERN_COLORS[ex.movement_pattern || ''] || 'hsl(var(--dim))',
        }}
      />
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, color: 'hsl(var(--text))' }} className="truncate">
          {ex.name}
        </div>
        <div className="flex items-center gap-1 flex-wrap mt-0.5">
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'hsl(var(--dim))' }}>
            {[ex.muscle_group, ex.equipment_type].filter(Boolean).join(' · ') || ex.movement_pattern || '—'}
          </span>
          {ex.is_unilateral && (
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, color: 'hsl(var(--warn))', background: 'hsla(38,92%,50%,0.1)', padding: '1px 5px', borderRadius: 4 }}>UNILATERAL</span>
          )}
          {ex.is_timed && (
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, color: 'hsl(var(--primary))', background: 'hsla(192,91%,54%,0.1)', padding: '1px 5px', borderRadius: 4 }}>TIMED</span>
          )}
        </div>
      </div>
      {/* Difficulty coefficient */}
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'hsl(var(--dim))', flexShrink: 0 }}>
        ×{ex.difficulty_coefficient ?? 1.0}
      </span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'hsl(var(--bg))' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-lg" style={{ color: 'hsl(var(--dim))' }}>
          <ArrowLeft size={20} />
        </button>
        <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 20, color: 'hsl(var(--primary))', letterSpacing: 1, flex: 1, textAlign: 'center' }}>
          ADD EXERCISE
        </span>
        <div className="w-9" /> {/* spacer */}
      </div>

      {/* Search input */}
      <div className="px-4 pb-2">
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--dim))' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            placeholder="Search exercises..."
            className="w-full pl-9 pr-3 focus:outline-none"
            style={{
              background: 'hsl(var(--bg3))',
              border: '1px solid hsl(var(--border2))',
              borderRadius: 10, padding: '10px 14px 10px 36px',
              fontFamily: 'Inter, sans-serif', fontSize: 13,
              color: 'hsl(var(--text))',
            }}
          />
        </div>
      </div>

      {/* Tab strip */}
      <div className="flex gap-2 px-4 pb-2">
        {(['strength', 'conditioning'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setActiveMuscleGroup('All'); }}
            style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700,
              padding: '6px 14px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: 0.5,
              background: activeTab === tab ? 'hsl(var(--primary))' : 'hsl(var(--bg3))',
              color: activeTab === tab ? 'hsl(220 16% 6%)' : 'hsl(var(--dim))',
              border: 'none',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Muscle group filter pills */}
      <div
        ref={pillsRef}
        className="flex gap-1.5 px-4 pb-3 overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {pills.map(pill => (
          <button
            key={pill}
            onClick={() => setActiveMuscleGroup(pill)}
            className="whitespace-nowrap flex-shrink-0"
            style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
              padding: '4px 12px', borderRadius: 20, border: 'none',
              background: activeMuscleGroup === pill ? 'hsl(var(--primary))' : 'hsl(var(--bg3))',
              color: activeMuscleGroup === pill ? 'hsl(220 16% 6%)' : 'hsl(var(--dim))',
            }}
          >
            {pill}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {/* Recent exercises (no query, have recents) */}
        {query.length < 1 && recentExercises.length > 0 && activeMuscleGroup === 'All' && (
          <div>
            <div className="px-4 pt-2 pb-1">
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: 'hsl(var(--dim))', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                RECENT
              </span>
            </div>
            {filterByTab(recentExercises).map(renderRow)}
            {filteredResults.length > 0 && (
              <div className="px-4 pt-3 pb-1">
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: 'hsl(var(--dim))', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                  ALL EXERCISES
                </span>
              </div>
            )}
          </div>
        )}

        {/* Browsing mode — grouped */}
        {query.length < 1 && groupedResults && (
          <>
            {Object.entries(groupedResults).map(([group, exs]) => (
              <div key={group}>
                <div className="px-4 pt-3 pb-1">
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: 'hsl(var(--dim))', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                    {group}
                  </span>
                </div>
                {exs.map(renderRow)}
              </div>
            ))}
          </>
        )}

        {/* Search results */}
        {query.length >= 1 && filteredResults.length > 0 && filteredResults.map(renderRow)}

        {/* No results */}
        {query.length >= 1 && filteredResults.length === 0 && !isSearching && (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'hsl(var(--dim))' }}>
              No results for "{query}"
            </span>
            <button
              onClick={handleAddCustom}
              className="mt-3"
              style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'hsl(var(--primary))', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              + Add "{query}" as custom exercise
            </button>
          </div>
        )}
      </div>

      {/* Hide scrollbar CSS */}
      <style>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};
