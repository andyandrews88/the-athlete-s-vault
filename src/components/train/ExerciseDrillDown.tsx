import { useState, useMemo } from 'react';
import { ArrowLeft, MoreVertical, Plus, Minus, StickyNote, Timer, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import type { SessionExercise, SetData } from '@/stores/workoutStore';
import { WeightNumpad } from './WeightNumpad';

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

interface ExerciseDrillDownProps {
  exerciseIndices: number[];
  exercises: SessionExercise[];
  previousSetsMap?: Record<string, Array<{ set_num: number; reps: number | null; weight_kg: number | null; rir: number | null }>>;
  onUpdateSet: (exIdx: number, setIdx: number, data: Partial<SetData>) => void;
  onAddSet: (exIdx: number) => void;
  onRemoveSet: (exIdx: number, setIdx: number) => void;
  onMarkComplete: (exIdx: number, setIdx: number) => void;
  onMarkIncomplete: (exIdx: number, setIdx: number) => void;
  onUpdateNotes: (exIdx: number, notes: string) => void;
  onOpenActionSheet: (exIdx: number) => void;
  onClose: () => void;
  onNavigateNext?: () => void;
  onNavigatePrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  onShowRestTimer: () => void;
  preferredUnit: 'kg' | 'lbs';
  onToggleUnit?: () => void;
  totalExercises: number;
  currentPosition: number;
}

export const ExerciseDrillDown = ({
  exerciseIndices,
  exercises,
  previousSetsMap,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  onMarkComplete,
  onMarkIncomplete,
  onUpdateNotes,
  onOpenActionSheet,
  onClose,
  onNavigateNext,
  onNavigatePrev,
  hasNext,
  hasPrev,
  onShowRestTimer,
  preferredUnit,
  onToggleUnit,
  totalExercises,
  currentPosition,
}: ExerciseDrillDownProps) => {
  const [numpadState, setNumpadState] = useState<{
    field: 'weight_kg' | 'reps' | 'rir';
    exIdx: number;
    setIndex: number;
    value: number | null;
    previousValue: number | null;
  } | null>(null);

  const isSuperset = exerciseIndices.length > 1;

  const toDisplay = (kg: number | null) => {
    if (kg === null) return null;
    return preferredUnit === 'lbs' ? Math.round(kg * LB_PER_KG * 10) / 10 : kg;
  };
  const toKg = (display: number | null) => {
    if (display === null) return null;
    return preferredUnit === 'lbs' ? Math.round((display / LB_PER_KG) * 100) / 100 : display;
  };

  const handleNumpadConfirm = (val: number) => {
    if (!numpadState) return;
    if (numpadState.field === 'weight_kg') {
      onUpdateSet(numpadState.exIdx, numpadState.setIndex, { weight_kg: toKg(val) });
    } else if (numpadState.field === 'rir') {
      onUpdateSet(numpadState.exIdx, numpadState.setIndex, { rir: Math.round(val) });
    } else {
      onUpdateSet(numpadState.exIdx, numpadState.setIndex, { reps: Math.round(val) });
    }
    if ('vibrate' in navigator) try { navigator.vibrate(30); } catch {}
    setNumpadState(null);
  };

  const openNumpad = (exIdx: number, setIdx: number, field: 'weight_kg' | 'reps' | 'rir') => {
    const set = exercises[exIdx]?.sets[setIdx];
    if (!set || set.completed) return;
    const prevSets = previousSetsMap?.[exercises[exIdx].exercise.id];
    const prev = prevSets?.find(p => p.set_num === setIdx + 1) || prevSets?.[setIdx];

    let value: number | null = null;
    let previousValue: number | null = null;

    if (field === 'weight_kg') {
      value = toDisplay(set.weight_kg);
      previousValue = prev ? toDisplay(prev.weight_kg) : null;
    } else if (field === 'reps') {
      value = set.reps;
      previousValue = prev?.reps ?? null;
    } else {
      value = set.rir;
      previousValue = prev?.rir ?? null;
    }

    setNumpadState({ field, exIdx, setIndex: setIdx, value, previousValue });
  };

  const formatPrev = (exIdx: number, setIdx: number) => {
    const prevSets = previousSetsMap?.[exercises[exIdx]?.exercise.id];
    if (!prevSets) return null;
    const prev = prevSets.find(p => p.set_num === setIdx + 1) || prevSets[setIdx];
    if (!prev || prev.weight_kg === null) return null;
    const w = toDisplay(prev.weight_kg);
    return `${w}×${prev.reps ?? '–'}`;
  };

  const getPrevSummary = (exIdx: number) => {
    const prevSets = previousSetsMap?.[exercises[exIdx]?.exercise.id];
    if (!prevSets?.length) return null;
    const setCount = prevSets.length;
    const reps = prevSets[0]?.reps;
    const w = prevSets[0]?.weight_kg !== null ? toDisplay(prevSets[0].weight_kg) : null;
    if (w === null) return null;
    return `${setCount}×${reps ?? '–'} @ ${w}${preferredUnit}`;
  };

  const setHasData = (set: SetData, exType?: string) => {
    if (exType === 'timed') return !!set.duration_secs;
    if (exType === 'conditioning') return !!(set.duration_secs || set.distance_m || set.calories);
    return !!(set.reps && set.weight_kg !== null);
  };

  const renderExerciseBlock = (exIdx: number, showSupersetLabel: boolean) => {
    const ex = exercises[exIdx];
    if (!ex) return null;
    const isTimed = ex.exercise.exercise_type === 'timed' || ex.exercise.exercise_type === 'conditioning';
    const completedSets = ex.sets.filter(s => s.completed).length;
    const prevSummary = getPrevSummary(exIdx);

    return (
      <div key={exIdx}>
        {/* Superset label */}
        {showSupersetLabel && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0 8px',
          }}>
            <div style={{ flex: 1, height: 1, background: 'hsl(var(--warn))' }} />
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700,
              color: 'hsl(var(--warn))', textTransform: 'uppercase', letterSpacing: 2,
            }}>SUPERSET</span>
            <div style={{ flex: 1, height: 1, background: 'hsl(var(--warn))' }} />
          </div>
        )}

        {/* Exercise name + pip */}
        <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
          <div style={{
            width: 4, height: 32, borderRadius: 2,
            background: pipColor(ex.exercise.movement_pattern || ''),
          }} />
          <div className="flex-1 min-w-0">
            <h2 style={{
              fontFamily: 'Inter, sans-serif', fontSize: 18, fontWeight: 700,
              color: 'hsl(var(--text))', lineHeight: 1.2,
            }}>
              {ex.exercise.name}
            </h2>
            <p style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
              color: 'hsl(var(--dim))', marginTop: 2,
            }}>
              {ex.exercise.movement_pattern || ''} · {completedSets}/{ex.sets.length} sets
            </p>
          </div>
          <button
            onClick={() => onOpenActionSheet(exIdx)}
            style={{ background: 'none', border: 'none', color: 'hsl(var(--dim))', padding: 8, cursor: 'pointer' }}
          >
            <MoreVertical size={20} />
          </button>
        </div>

        {/* Coach notes */}
        {ex.coachNotes && (
          <div style={{
            background: 'hsla(38,92%,50%,0.08)', border: '1px solid hsla(38,92%,50%,0.2)',
            borderRadius: 8, padding: '8px 12px', marginBottom: 12,
          }}>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'hsl(var(--warn))', fontStyle: 'italic' }}>
              → {ex.coachNotes}
            </p>
          </div>
        )}

        {/* Previous session card */}
        {prevSummary && (
          <div style={{
            background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))',
            borderRadius: 10, padding: '10px 14px', marginBottom: 16,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: 'hsl(var(--dim))', textTransform: 'uppercase', letterSpacing: 1 }}>LAST SESSION</p>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: 'hsl(var(--text))', fontWeight: 600, marginTop: 2 }}>{prevSummary}</p>
            </div>
          </div>
        )}

        {/* Column headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isTimed ? '40px 1fr 48px' : '40px 56px 1fr 1fr 48px 44px',
          gap: 6, padding: '0 0 6px 0',
        }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'hsl(var(--dim))', textTransform: 'uppercase', textAlign: 'center' }}>SET</span>
          {!isTimed && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'hsl(var(--dim))', textTransform: 'uppercase', textAlign: 'center' }}>PREV</span>}
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'hsl(var(--dim))', textTransform: 'uppercase', textAlign: 'center' }}>
            {isTimed ? 'SECS' : preferredUnit.toUpperCase()}
          </span>
          {!isTimed && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'hsl(var(--dim))', textTransform: 'uppercase', textAlign: 'center' }}>REPS</span>}
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'hsl(var(--dim))', textTransform: 'uppercase', textAlign: 'center' }}>RIR</span>
          {!isTimed && <span />}
        </div>

        {/* Set rows */}
        {ex.sets.map((set, setIdx) => {
          const canComplete = setHasData(set, ex.exercise.exercise_type);
          const prevStr = formatPrev(exIdx, setIdx);

          return (
            <div
              key={setIdx}
              style={{
                display: 'grid',
                gridTemplateColumns: isTimed ? '40px 1fr 48px' : '40px 56px 1fr 1fr 48px 44px',
                gap: 6, marginBottom: 4, alignItems: 'center',
                opacity: set.set_type === 'warmup' ? 0.6 : 1,
              }}
            >
              {/* Set label */}
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600,
                color: set.completed ? 'hsl(var(--ok))' : set.set_type === 'warmup' ? 'hsl(var(--warn))' : 'hsl(var(--dim))',
                textAlign: 'center',
              }}>
                {set.completed ? '✓' : set.set_type === 'warmup' ? 'W' : `${set.set_num}`}
              </div>

              {/* Previous */}
              {!isTimed && (
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                  color: 'hsl(var(--dim))', textAlign: 'center',
                }}>
                  {prevStr || '—'}
                </div>
              )}

              {/* Weight / Duration */}
              {isTimed ? (
                <input
                  type="number" inputMode="numeric" placeholder="sec"
                  value={set.duration_secs ?? ''} disabled={set.completed}
                  onChange={e => onUpdateSet(exIdx, setIdx, { duration_secs: e.target.value ? parseInt(e.target.value) : null })}
                  style={{
                    background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))',
                    borderRadius: 8, padding: '10px 8px', height: 48,
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 16, textAlign: 'center',
                    color: set.completed ? 'hsl(var(--ok))' : 'hsl(var(--text))', outline: 'none', width: '100%',
                  }}
                />
              ) : (
                <button
                  onClick={() => openNumpad(exIdx, setIdx, 'weight_kg')}
                  disabled={set.completed}
                  style={{
                    background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))',
                    borderRadius: 8, padding: '10px 8px', height: 48,
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 16, textAlign: 'center',
                    color: set.completed ? 'hsl(var(--ok))' : set.weight_kg !== null ? 'hsl(var(--text))' : 'hsl(var(--dim))',
                    cursor: set.completed ? 'default' : 'pointer', width: '100%',
                  }}
                >
                  {set.weight_kg !== null ? toDisplay(set.weight_kg) : preferredUnit}
                </button>
              )}

              {/* Reps */}
              {!isTimed && (
                <button
                  onClick={() => openNumpad(exIdx, setIdx, 'reps')}
                  disabled={set.completed}
                  style={{
                    background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))',
                    borderRadius: 8, padding: '10px 8px', height: 48,
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 16, textAlign: 'center',
                    color: set.completed ? 'hsl(var(--ok))' : set.reps !== null ? 'hsl(var(--text))' : 'hsl(var(--dim))',
                    cursor: set.completed ? 'default' : 'pointer', width: '100%',
                  }}
                >
                  {set.reps ?? 'reps'}
                </button>
              )}

              {/* RIR */}
              <button
                onClick={() => openNumpad(exIdx, setIdx, 'rir')}
                disabled={set.completed}
                style={{
                  background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))',
                  borderRadius: 8, padding: '10px 6px', height: 48,
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 14, textAlign: 'center',
                  color: set.completed ? 'hsl(var(--ok))' : set.rir !== null ? 'hsl(var(--text))' : 'hsl(var(--dim))',
                  cursor: set.completed ? 'default' : 'pointer', width: '100%',
                }}
              >
                {set.rir ?? '–'}
              </button>

              {/* Completion circle */}
              {!isTimed && (
                <button
                  onClick={() => {
                    if (set.completed) {
                      onMarkIncomplete(exIdx, setIdx);
                    } else if (canComplete) {
                      onMarkComplete(exIdx, setIdx);
                    }
                  }}
                  style={{
                    width: 36, height: 36, borderRadius: 18,
                    border: set.completed
                      ? '2px solid hsl(var(--ok))'
                      : canComplete
                        ? '2px solid hsl(var(--primary))'
                        : '2px solid hsl(var(--border))',
                    background: set.completed ? 'hsla(142,71%,45%,0.15)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: set.completed || canComplete ? 'pointer' : 'default',
                    margin: '0 auto',
                  }}
                >
                  {set.completed && <Check size={16} style={{ color: 'hsl(var(--ok))' }} />}
                </button>
              )}
            </div>
          );
        })}

        {/* Add/Remove set */}
        <div className="flex items-center justify-center gap-4" style={{ marginTop: 12 }}>
          <button
            onClick={() => {
              if (ex.sets.length > 1) {
                onRemoveSet(exIdx, ex.sets.length - 1);
              }
            }}
            disabled={ex.sets.length <= 1}
            style={{
              width: 40, height: 40, borderRadius: 20,
              background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: ex.sets.length <= 1 ? 'hsl(var(--border))' : 'hsl(var(--dim))',
              cursor: ex.sets.length <= 1 ? 'default' : 'pointer',
            }}
          >
            <Minus size={16} />
          </button>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
            color: 'hsl(var(--dim))', textTransform: 'uppercase',
          }}>
            {ex.sets.length} SET{ex.sets.length !== 1 ? 'S' : ''}
          </span>
          <button
            onClick={() => onAddSet(exIdx)}
            style={{
              width: 40, height: 40, borderRadius: 20,
              background: 'hsla(192,91%,54%,0.1)', border: '1px solid hsla(192,91%,54%,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'hsl(var(--primary))', cursor: 'pointer',
            }}
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Notes */}
        <div style={{ marginTop: 16 }}>
          <textarea
            value={ex.notes}
            onChange={e => onUpdateNotes(exIdx, e.target.value)}
            placeholder="Add exercise note..."
            rows={2}
            style={{
              width: '100%', background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))',
              borderRadius: 10, padding: '10px 14px',
              fontFamily: 'Inter, sans-serif', fontSize: 13,
              color: 'hsl(var(--text))', outline: 'none', resize: 'none',
            }}
          />
        </div>
      </div>
    );
  };

  const primaryExIdx = exerciseIndices[0];
  const primaryEx = exercises[primaryExIdx];
  if (!primaryEx) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'hsl(var(--bg))',
      overflow: 'auto',
      paddingTop: 56,
    }}>
      {/* Header */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 51,
        background: 'hsla(var(--bg), 0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid hsl(var(--border))',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        paddingTop: 'max(12px, env(safe-area-inset-top))',
      }}>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'hsl(var(--primary))', cursor: 'pointer', padding: 4 }}
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 style={{
            fontFamily: 'Inter, sans-serif', fontSize: 16, fontWeight: 700,
            color: 'hsl(var(--text))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {isSuperset ? 'Superset' : primaryEx.exercise.name}
          </h1>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'hsl(var(--dim))' }}>
            {currentPosition + 1} of {totalExercises}
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '16px 16px 120px' }}>
        {exerciseIndices.map((idx, i) => renderExerciseBlock(idx, i > 0))}
      </div>

      {/* Footer navigation */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 51,
        background: 'hsla(var(--bg), 0.95)', backdropFilter: 'blur(12px)',
        borderTop: '1px solid hsl(var(--border))',
        padding: '12px 16px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button
          onClick={onNavigatePrev}
          disabled={!hasPrev}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
            color: hasPrev ? 'hsl(var(--primary))' : 'hsl(var(--border))',
            background: 'none', border: 'none', cursor: hasPrev ? 'pointer' : 'default',
          }}
        >
          <ChevronLeft size={18} /> Back
        </button>

        <button
          onClick={onShowRestTimer}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600,
            color: 'hsl(var(--text))',
            background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))',
            borderRadius: 8, padding: '8px 16px', cursor: 'pointer',
          }}
        >
          <Timer size={14} /> Timer
        </button>

        <button
          onClick={onNavigateNext}
          disabled={!hasNext}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
            color: hasNext ? 'hsl(var(--primary))' : 'hsl(var(--border))',
            background: 'none', border: 'none', cursor: hasNext ? 'pointer' : 'default',
          }}
        >
          Next <ChevronRight size={18} />
        </button>
      </div>

      {/* Numpad overlay */}
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
