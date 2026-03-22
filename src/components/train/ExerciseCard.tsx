import { useState, useCallback, useEffect, useRef } from 'react';
import { MoreVertical, ChevronDown, ChevronUp, Play, StickyNote, Check } from 'lucide-react';
import type { SessionExercise, SetData } from '@/stores/workoutStore';
import { WeightNumpad } from './WeightNumpad';
import { supabase } from '@/integrations/supabase/client';
import { queueWrite } from '@/lib/offlineQueue';

/* ─── Haptic feedback ─── */
const haptic = (pattern: number | number[]) => {
  if ('vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch {}
  }
};

/* ─── Debounced set save hook ─── */
const useDebouncedSetSave = (
  setId: string | undefined,
  data: Record<string, unknown>,
  delay = 500
) => {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (!setId || Object.keys(dataRef.current).length === 0) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (!navigator.onLine) {
        await queueWrite({ table: 'exercise_sets', operation: 'update', data: { id: setId, ...dataRef.current } });
        return;
      }
      try {
        await supabase.from('exercise_sets').update(dataRef.current).eq('id', setId);
      } catch {
        await queueWrite({ table: 'exercise_sets', operation: 'update', data: { id: setId, ...dataRef.current } });
      }
    }, delay);
    return () => clearTimeout(timerRef.current);
  }, [setId, JSON.stringify(data), delay]);
};

interface ExerciseCardProps {
  exercise: SessionExercise;
  exerciseIndex: number;
  previousSets?: Array<{ set_num: number; reps: number | null; weight_kg: number | null; rir: number | null }> | null;
  onUpdateSet: (setIndex: number, data: Partial<SetData>) => void;
  onAddSet: () => void;
  onRemoveSet: (setIndex: number) => void;
  onMarkComplete: (setIndex: number) => void;
  onMarkIncomplete: (setIndex: number) => void;
  onToggleExpand: () => void;
  onOpenActionSheet: () => void;
  onUpdateNotes: (notes: string) => void;
  onToggleNotesVisibility: () => void;
  preferredUnit: 'kg' | 'lbs';
  onToggleUnit?: () => void;
}

const LB_PER_KG = 2.20462;

const pipColor = (pattern: string) => {
  const map: Record<string, string> = {
    'Hinge': 'hsl(0,72%,51%)', 'Squat': 'hsl(262,60%,55%)',
    'Push': 'hsl(var(--primary))', 'Pull': 'hsl(var(--ok))',
    'Single Leg': 'hsl(38,92%,50%)', 'Carry': 'hsl(38,92%,50%)',
    'Core': 'hsl(215,14%,50%)', 'Olympic': 'hsl(var(--gold))',
    'Isolation': 'hsl(215,14%,50%)', 'Plyometric': 'hsl(var(--gold))',
    'Rotational': 'hsl(var(--primary))', 'Conditioning': 'hsl(var(--warn))',
  };
  return map[pattern] || 'hsl(var(--primary))';
};

export const ExerciseCard = ({
  exercise: ex,
  exerciseIndex: exIdx,
  previousSets,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  onMarkComplete,
  onMarkIncomplete,
  onToggleExpand,
  onOpenActionSheet,
  onUpdateNotes,
  onToggleNotesVisibility,
  preferredUnit,
  onToggleUnit,
}: ExerciseCardProps) => {
  const [numpadState, setNumpadState] = useState<{
    field: 'weight_kg' | 'reps' | 'rir';
    setIndex: number;
    value: number | null;
    previousValue: number | null;
  } | null>(null);

  const [showVideo, setShowVideo] = useState(false);

  const weightUnit = preferredUnit;
  const isTimed = ex.exercise.exercise_type === 'timed' || ex.exercise.exercise_type === 'conditioning';
  const completedSets = ex.sets.filter(s => s.completed);
  const allComplete = ex.sets.length > 0 && completedSets.length === ex.sets.length;

  const toDisplay = (kg: number | null) => {
    if (kg === null) return null;
    return weightUnit === 'lbs' ? Math.round(kg * LB_PER_KG * 10) / 10 : kg;
  };
  const toKg = (display: number | null) => {
    if (display === null) return null;
    return weightUnit === 'lbs' ? Math.round((display / LB_PER_KG) * 100) / 100 : display;
  };

  const setHasData = (set: SetData) => {
    if (ex.exercise.exercise_type === 'timed') return !!set.duration_secs;
    if (ex.exercise.exercise_type === 'conditioning') return !!(set.duration_secs || set.distance_m || set.calories);
    return !!(set.reps && set.weight_kg !== null);
  };

  const formatPrev = (setIdx: number) => {
    if (!previousSets) return null;
    const prev = previousSets.find(p => p.set_num === setIdx + 1) || previousSets[setIdx];
    if (!prev || prev.weight_kg === null) return null;
    const w = toDisplay(prev.weight_kg);
    return `${w}×${prev.reps ?? '–'}`;
  };

  const handleWeightTap = (setIdx: number) => {
    const set = ex.sets[setIdx];
    if (set.completed) return;
    const prev = previousSets?.find(p => p.set_num === setIdx + 1) || previousSets?.[setIdx];
    setNumpadState({
      field: 'weight_kg',
      setIndex: setIdx,
      value: toDisplay(set.weight_kg),
      previousValue: prev ? toDisplay(prev.weight_kg) : null,
    });
  };

  const handleRepsTap = (setIdx: number) => {
    const set = ex.sets[setIdx];
    if (set.completed) return;
    const prev = previousSets?.find(p => p.set_num === setIdx + 1) || previousSets?.[setIdx];
    setNumpadState({
      field: 'reps',
      setIndex: setIdx,
      value: set.reps,
      previousValue: prev?.reps ?? null,
    });
  };

  const handleRirTap = (setIdx: number) => {
    const set = ex.sets[setIdx];
    if (set.completed) return;
    const prev = previousSets?.find(p => p.set_num === setIdx + 1) || previousSets?.[setIdx];
    setNumpadState({
      field: 'rir',
      setIndex: setIdx,
      value: set.rir,
      previousValue: prev?.rir ?? null,
    });
  };

  const handleNumpadConfirm = (val: number) => {
    if (!numpadState) return;
    if (numpadState.field === 'weight_kg') {
      onUpdateSet(numpadState.setIndex, { weight_kg: toKg(val) });
    } else if (numpadState.field === 'rir') {
      onUpdateSet(numpadState.setIndex, { rir: Math.round(val) });
    } else {
      onUpdateSet(numpadState.setIndex, { reps: Math.round(val) });
    }
    haptic(30);
    setNumpadState(null);
  };

  // Summary line
  const firstReps = ex.sets[0]?.reps;
  const summaryLine = isTimed
    ? `${ex.sets.length} set${ex.sets.length > 1 ? 's' : ''} · ${ex.exercise.movement_pattern || ''}`
    : `${ex.sets.length} × ${firstReps ?? '–'} · ${ex.exercise.movement_pattern || ''}`;

  const ssColor = ex.supersetGroup ? 'border-l-2 border-l-amber-500' : '';
  const lastSetRir = ex.sets.length > 0 ? ex.sets[ex.sets.length - 1].rir : null;

  // Video embed URL
  const getEmbedUrl = (url?: string) => {
    if (!url) return null;
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^\s&]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return null;
  };

  const embedUrl = getEmbedUrl(ex.exercise.video_url);

  const cellBase: React.CSSProperties = {
    background: 'hsl(var(--bg3))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 5,
    padding: '3px 6px',
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 9,
    textAlign: 'center',
    width: '100%',
    outline: 'none',
  };

  const rirStyle: React.CSSProperties = { ...cellBase, fontSize: 8, padding: '3px 5px' };

  return (
    <div className={ssColor} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
      {/* Header */}
      <div className="flex items-center gap-[6px]" style={{ padding: '7px 0' }}>
        <button onClick={onToggleExpand} className="flex items-center gap-[6px] flex-1 min-w-0 text-left" style={{ background: 'none', border: 'none' }}>
          <div style={{ width: 3, minWidth: 3, height: 26, borderRadius: 2, flexShrink: 0, background: pipColor(ex.exercise.movement_pattern || '') }} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate" style={{ fontSize: 10, fontWeight: 500, color: 'hsl(var(--text))' }}>{ex.exercise.name}</p>
              {ex.supersetGroup && (
                <span className="font-mono" style={{ fontSize: 8, padding: '0.5px 4px', borderRadius: 9, background: 'hsla(38,92%,50%,0.1)', color: 'hsl(var(--warn))', border: '1px solid hsla(38,92%,50%,0.2)' }}>SS</span>
              )}
            </div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: 'hsl(var(--dim))', marginTop: 1 }}>{summaryLine}</p>
            {ex.coachNotes && (
              <p style={{ fontSize: 10, color: 'hsl(var(--warn))', fontStyle: 'italic', marginTop: 2 }}>→ {ex.coachNotes}</p>
            )}
          </div>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          {allComplete && (
            <div style={{ width: 18, height: 18, borderRadius: 9, background: 'hsla(142,71%,45%,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={10} style={{ color: 'hsl(var(--ok))' }} />
            </div>
          )}
          {completedSets.length > 0 && !allComplete && (
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, padding: '1px 5px', borderRadius: 9, background: 'hsla(142,71%,45%,0.1)', color: 'hsl(var(--ok))', border: '1px solid hsla(142,71%,45%,0.2)' }}>
              {completedSets.length}/{ex.sets.length}
            </span>
          )}
          {!ex.expanded && lastSetRir !== null && lastSetRir !== undefined && (
            <span style={{ background: 'hsla(38,92%,50%,0.1)', color: 'hsl(var(--warn))', fontFamily: 'JetBrains Mono, monospace', fontSize: 8, padding: '1px 3px', borderRadius: 3 }}>
              RIR {lastSetRir}
            </span>
          )}
          {ex.isPr && (
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, padding: '1px 3px', borderRadius: 3, background: 'hsl(var(--pg))', color: 'hsl(var(--primary))', border: '1px solid hsla(192,91%,54%,0.25)' }}>PR ↑</span>
          )}

          {embedUrl && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowVideo(!showVideo); }}
              style={{ background: 'none', border: 'none', color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer' }}
            >
              <Play size={10} />
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7 }}>Watch</span>
            </button>
          )}

          <button
            onClick={onOpenActionSheet}
            style={{ background: 'none', border: 'none', color: 'hsl(var(--dim))', padding: 4, cursor: 'pointer' }}
          >
            <MoreVertical size={14} />
          </button>
        </div>
      </div>

      {/* Video embed */}
      {showVideo && embedUrl && (
        <div style={{ margin: '0 0 8px 9px', borderRadius: 8, overflow: 'hidden' }}>
          <iframe
            src={embedUrl}
            style={{ width: '100%', height: 180, border: 'none', borderRadius: 8 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* Expanded content — auto-collapse when all sets complete */}
      {ex.expanded && (
        <div style={{ padding: '0 0 8px 9px' }} className="space-y-1">
          {/* Column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isTimed ? '28px 1fr 40px' : '28px 48px 1fr 1fr 40px',
            gap: 4, padding: '4px 0 0 0',
          }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, color: 'hsl(var(--dim))', textTransform: 'uppercase', textAlign: 'center' }}>Set</span>
            {!isTimed && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, color: 'hsl(var(--dim))', textTransform: 'uppercase', textAlign: 'center' }}>Prev</span>}
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, color: 'hsl(var(--dim))', textTransform: 'uppercase', textAlign: 'center' }}>
              {isTimed ? 'Secs' : 'Weight'}
            </span>
            {!isTimed && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, color: 'hsl(var(--dim))', textTransform: 'uppercase', textAlign: 'center' }}>Reps</span>}
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 7, color: 'hsl(var(--dim))', textTransform: 'uppercase', textAlign: 'center' }}>RIR</span>
          </div>

          {/* Set rows */}
          {ex.sets.map((set, setIdx) => {
            const canComplete = setHasData(set);
            const prevStr = formatPrev(setIdx);

            return (
              <div
                key={setIdx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: isTimed ? '28px 1fr 40px' : '28px 48px 1fr 1fr 40px',
                  gap: 4, marginBottom: 2,
                  opacity: set.set_type === 'warmup' ? 0.6 : 1,
                }}
              >
                {/* Set label */}
                <button
                  onClick={() => set.completed ? onMarkIncomplete(setIdx) : (canComplete ? onMarkComplete(setIdx) : null)}
                  style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 8,
                    color: set.completed ? 'hsl(var(--ok))' : set.set_type === 'warmup' ? 'hsl(var(--warn))' : 'hsl(var(--dim))',
                    textAlign: 'center', fontWeight: set.completed ? 700 : 400,
                    background: 'transparent', border: 'none',
                  }}
                >
                  {set.completed ? '✓' : set.set_type === 'warmup' ? 'W' : `S${set.set_num}`}
                </button>

                {/* Previous column */}
                {!isTimed && (
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
                    color: 'hsl(var(--dim))', textAlign: 'center',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {prevStr || '—'}
                  </div>
                )}

                {/* Weight / Duration */}
                {isTimed ? (
                  <input
                    type="number" inputMode="numeric" placeholder="sec"
                    value={set.duration_secs ?? ''} disabled={set.completed}
                    onChange={e => onUpdateSet(setIdx, { duration_secs: e.target.value ? parseInt(e.target.value) : null })}
                    style={{ ...cellBase, color: set.completed ? 'hsl(var(--ok))' : 'hsl(var(--text))' }}
                  />
                ) : (
                  <button
                    onClick={() => handleWeightTap(setIdx)}
                    disabled={set.completed}
                    style={{
                      ...cellBase,
                      color: set.completed ? 'hsl(var(--ok))' : set.weight_kg !== null ? 'hsl(var(--text))' : 'hsl(var(--dim))',
                      cursor: set.completed ? 'default' : 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    {set.weight_kg !== null ? toDisplay(set.weight_kg) : weightUnit}
                  </button>
                )}

                {/* Reps */}
                {!isTimed && (
                  <button
                    onClick={() => handleRepsTap(setIdx)}
                    disabled={set.completed}
                    style={{
                      ...cellBase,
                      color: set.completed ? 'hsl(var(--ok))' : set.reps !== null ? 'hsl(var(--text))' : 'hsl(var(--dim))',
                      cursor: set.completed ? 'default' : 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    {set.reps ?? 'reps'}
                  </button>
                )}

                {/* RIR */}
                <button
                  onClick={() => handleRirTap(setIdx)}
                  disabled={set.completed}
                  style={{
                    ...rirStyle,
                    color: set.completed ? 'hsl(var(--ok))' : set.rir !== null ? 'hsl(var(--text))' : 'hsl(var(--dim))',
                    cursor: set.completed ? 'default' : 'pointer',
                    textAlign: 'center',
                  }}
                >
                  {set.rir ?? '0-10'}
                </button>
              </div>
            );
          })}

          {/* Add Set */}
          <button
            onClick={onAddSet}
            className="w-full text-primary"
            style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, padding: '5px 0', border: '1px dashed hsla(192,91%,54%,0.2)', borderRadius: 5, background: 'transparent' }}
          >
            + Set
          </button>

          {/* Notes toggle */}
          <div>
            <button
              onClick={onToggleNotesVisibility}
              className="flex items-center gap-1.5 transition-colors"
              style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em', color: ex.showNotes ? 'hsl(var(--primary))' : 'hsl(var(--dim))', background: 'none', border: 'none' }}
            >
              <StickyNote size={10} /> {ex.showNotes ? 'Hide Notes' : 'Notes'}
            </button>
            {ex.showNotes && (
              <textarea
                value={ex.notes}
                onChange={e => onUpdateNotes(e.target.value)}
                placeholder="Exercise notes..."
                rows={2}
                className="w-full mt-1 focus:outline-none resize-none"
                style={{ background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))', borderRadius: 6, padding: '6px 8px', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'hsl(var(--text))' }}
              />
            )}
          </div>
        </div>
      )}

      {/* Weight Numpad overlay */}
      {numpadState && (
        <WeightNumpad
          value={numpadState.value}
          unit={preferredUnit}
          onConfirm={handleNumpadConfirm}
          onClose={() => setNumpadState(null)}
          onToggleUnit={numpadState.field === 'weight_kg' ? onToggleUnit : undefined}
          previousValue={numpadState.previousValue}
          label={numpadState.field === 'weight_kg' ? 'WEIGHT' : numpadState.field === 'rir' ? 'RIR' : 'REPS'}
          showBWOnly={numpadState.field === 'weight_kg'}
          maxValue={numpadState.field === 'rir' ? 10 : undefined}
        />
      )}
    </div>
  );
};
