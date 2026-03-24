import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, StickyNote, Timer, Plus, Minus, Clock } from 'lucide-react';
import type { SessionExercise, SetData } from '@/stores/workoutStore';
import { WeightNumpad } from './WeightNumpad';
import { RestTimer } from './RestTimer';

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

const REST_PRESETS = [30, 60, 90, 120, 150, 180];

interface ExerciseDrillDownProps {
  exercise: SessionExercise;
  exerciseIndex: number;
  totalExercises: number;
  previousSets?: Array<{ set_num: number; reps: number | null; weight_kg: number | null; rir: number | null }> | null;
  preferredUnit: 'kg' | 'lbs';
  restTimerDefault: number;
  onUpdateSet: (setIndex: number, data: Partial<SetData>) => void;
  onAddSet: () => void;
  onRemoveSet: (setIndex: number) => void;
  onMarkComplete: (setIndex: number) => void;
  onMarkIncomplete: (setIndex: number) => void;
  onUpdateNotes: (notes: string) => void;
  onToggleUnit?: () => void;
  onBack: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export const ExerciseDrillDown = ({
  exercise: ex,
  exerciseIndex,
  totalExercises,
  previousSets,
  preferredUnit,
  restTimerDefault,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  onMarkComplete,
  onMarkIncomplete,
  onUpdateNotes,
  onToggleUnit,
  onBack,
  onNext,
  onPrev,
}: ExerciseDrillDownProps) => {
  const [numpadState, setNumpadState] = useState<{
    field: 'weight_kg' | 'reps' | 'rir';
    setIndex: number;
    value: number | null;
    previousValue: number | null;
  } | null>(null);
  const [restTimerDuration, setRestTimerDuration] = useState(restTimerDefault);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [showRestPicker, setShowRestPicker] = useState(false);
  const [customRestInput, setCustomRestInput] = useState('');
  const [showNotes, setShowNotes] = useState(!!ex.notes);

  const weightUnit = preferredUnit;
  const toDisplay = (kg: number | null) => {
    if (kg === null) return null;
    return weightUnit === 'lbs' ? Math.round(kg * LB_PER_KG * 10) / 10 : kg;
  };
  const toKg = (display: number | null) => {
    if (display === null) return null;
    return weightUnit === 'lbs' ? Math.round((display / LB_PER_KG) * 100) / 100 : display;
  };

  const completedSets = ex.sets.filter(s => s.completed).length;
  const allComplete = ex.sets.length > 0 && completedSets === ex.sets.length;

  const workingMax = useMemo(() => {
    if (!previousSets?.length) return null;
    const maxWeight = Math.max(...previousSets.filter(s => s.weight_kg !== null).map(s => s.weight_kg!));
    return maxWeight > 0 ? maxWeight : null;
  }, [previousSets]);

  const lastPerformance = useMemo(() => {
    if (!previousSets?.length) return null;
    const sets = previousSets.filter(s => s.weight_kg !== null && s.reps !== null);
    if (!sets.length) return null;
    const first = sets[0];
    return `${sets.length} × ${first.reps} @ ${toDisplay(first.weight_kg)}${weightUnit}`;
  }, [previousSets, weightUnit]);

  const formatPrev = (setIdx: number) => {
    if (!previousSets) return null;
    const prev = previousSets.find(p => p.set_num === setIdx + 1) || previousSets[setIdx];
    if (!prev || prev.weight_kg === null) return null;
    return `${toDisplay(prev.weight_kg)}×${prev.reps ?? '–'}`;
  };

  const setHasData = (set: SetData) => !!(set.reps && set.weight_kg !== null);

  const handleNumpadConfirm = (val: number) => {
    if (!numpadState) return;
    if (numpadState.field === 'weight_kg') {
      onUpdateSet(numpadState.setIndex, { weight_kg: toKg(val) });
    } else if (numpadState.field === 'rir') {
      onUpdateSet(numpadState.setIndex, { rir: Math.round(val) });
    } else {
      onUpdateSet(numpadState.setIndex, { reps: Math.round(val) });
    }
    if ('vibrate' in navigator) try { navigator.vibrate(30); } catch {}
    setNumpadState(null);
  };

  const openNumpad = (field: 'weight_kg' | 'reps' | 'rir', setIdx: number) => {
    const set = ex.sets[setIdx];
    if (set.completed) return;
    const prev = previousSets?.find(p => p.set_num === setIdx + 1) || previousSets?.[setIdx];
    setNumpadState({
      field,
      setIndex: setIdx,
      value: field === 'weight_kg' ? toDisplay(set.weight_kg) : field === 'reps' ? set.reps : set.rir,
      previousValue: field === 'weight_kg' ? (prev ? toDisplay(prev.weight_kg) : null) : field === 'reps' ? (prev?.reps ?? null) : (prev?.rir ?? null),
    });
  };

  const handleComplete = (setIdx: number) => {
    onMarkComplete(setIdx);
    setShowRestTimer(true);
    if ('vibrate' in navigator) try { navigator.vibrate(50); } catch {}
  };

  const formatRestTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleCustomRestConfirm = () => {
    const parts = customRestInput.split(':');
    let totalSecs = 0;
    if (parts.length === 2) {
      totalSecs = parseInt(parts[0]) * 60 + parseInt(parts[1]);
    } else {
      totalSecs = parseInt(customRestInput);
    }
    if (totalSecs > 0 && totalSecs <= 600) {
      setRestTimerDuration(totalSecs);
      setShowRestPicker(false);
      setCustomRestInput('');
    }
  };

  const cellBase: React.CSSProperties = {
    background: 'hsl(var(--bg3))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 6,
    padding: '8px 6px',
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 13,
    textAlign: 'center',
    width: '100%',
    outline: 'none',
    cursor: 'pointer',
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: 'hsl(var(--bg))', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* Header */}
      <div style={{ padding: '56px 16px 0', flexShrink: 0 }}>
        <button
          onClick={onBack}
          className="flex items-center gap-1 mb-3"
          style={{ background: 'none', border: 'none', color: 'hsl(var(--dim))', fontFamily: 'Inter, sans-serif', fontSize: 12, cursor: 'pointer' }}
        >
          <ChevronLeft size={16} /> Back to overview
        </button>

        <div className="flex items-center justify-between mb-2">
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'hsl(var(--dim))', textTransform: 'uppercase', letterSpacing: 1 }}>
            Exercise {exerciseIndex + 1} of {totalExercises}
          </span>
          {allComplete && (
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
              background: 'hsla(142,71%,45%,0.1)', color: 'hsl(var(--ok))',
              border: '1px solid hsla(142,71%,45%,0.2)',
              padding: '2px 8px', borderRadius: 6,
            }}>
              ALL COMPLETE ✓
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mb-2">
          <div style={{ width: 4, height: 32, borderRadius: 2, background: pipColor(ex.exercise.movement_pattern || '') }} />
          <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 26, color: 'hsl(var(--text))', letterSpacing: 1, lineHeight: 1, margin: 0 }}>
            {ex.exercise.name || 'Unnamed Exercise'}
          </h2>
        </div>

        <div className="flex gap-4 mb-4" style={{ padding: '8px 12px', background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}>
          <div>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: 'hsl(var(--dim))', textTransform: 'uppercase', letterSpacing: 0.5 }}>Last Performance</span>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'hsl(var(--text))', fontWeight: 600, marginTop: 2 }}>
              {lastPerformance || '—'}
            </p>
          </div>
          <div style={{ width: 1, background: 'hsl(var(--border))' }} />
          <div>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: 'hsl(var(--dim))', textTransform: 'uppercase', letterSpacing: 0.5 }}>Working Max</span>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'hsl(var(--primary))', fontWeight: 600, marginTop: 2 }}>
              {workingMax ? `${toDisplay(workingMax)}${weightUnit}` : '—'}
            </p>
          </div>
        </div>

        {ex.coachNotes && (
          <p style={{ fontSize: 11, color: 'hsl(var(--warn))', fontStyle: 'italic', marginBottom: 8, padding: '6px 10px', background: 'hsla(38,92%,50%,0.06)', borderRadius: 6, border: '1px solid hsla(38,92%,50%,0.15)' }}>
            → {ex.coachNotes}
          </p>
        )}
      </div>

      {/* Set rows — scrollable middle */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '0 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '36px 52px 1fr 1fr 50px 36px', gap: 6, padding: '8px 0 4px' }}>
          {['SET', 'PREV', 'WEIGHT', 'REPS', 'RIR', ''].map((h, i) => (
            <span key={i} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: 'hsl(var(--dim))', textTransform: 'uppercase', textAlign: 'center', letterSpacing: 0.5 }}>{h}</span>
          ))}
        </div>

        {ex.sets.map((set, setIdx) => {
          const canComplete = setHasData(set);
          const prevStr = formatPrev(setIdx);

          return (
            <div
              key={setIdx}
              style={{
                display: 'grid', gridTemplateColumns: '36px 52px 1fr 1fr 50px 36px',
                gap: 6, marginBottom: 6,
                opacity: set.set_type === 'warmup' ? 0.6 : 1,
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                color: set.completed ? 'hsl(var(--ok))' : 'hsl(var(--dim))',
                fontWeight: set.completed ? 700 : 400,
              }}>
                {set.completed ? '✓' : set.set_type === 'warmup' ? 'W' : `S${set.set_num}`}
              </div>

              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                color: 'hsl(var(--dim))', textAlign: 'center',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {prevStr || '—'}
              </div>

              <button
                onClick={() => openNumpad('weight_kg', setIdx)}
                disabled={set.completed}
                style={{
                  ...cellBase,
                  color: set.completed ? 'hsl(var(--ok))' : set.weight_kg !== null ? 'hsl(var(--text))' : 'hsl(var(--dim))',
                  cursor: set.completed ? 'default' : 'pointer',
                  background: set.completed ? 'hsla(142,71%,45%,0.05)' : 'hsl(var(--bg3))',
                }}
              >
                {set.weight_kg !== null ? toDisplay(set.weight_kg) : weightUnit}
              </button>

              <button
                onClick={() => openNumpad('reps', setIdx)}
                disabled={set.completed}
                style={{
                  ...cellBase,
                  color: set.completed ? 'hsl(var(--ok))' : set.reps !== null ? 'hsl(var(--text))' : 'hsl(var(--dim))',
                  cursor: set.completed ? 'default' : 'pointer',
                  background: set.completed ? 'hsla(142,71%,45%,0.05)' : 'hsl(var(--bg3))',
                }}
              >
                {set.reps ?? 'reps'}
              </button>

              <button
                onClick={() => openNumpad('rir', setIdx)}
                disabled={set.completed}
                style={{
                  ...cellBase, fontSize: 11,
                  color: set.completed ? 'hsl(var(--ok))' : set.rir !== null ? 'hsl(var(--text))' : 'hsl(var(--dim))',
                  cursor: set.completed ? 'default' : 'pointer',
                  background: set.completed ? 'hsla(142,71%,45%,0.05)' : 'hsl(var(--bg3))',
                }}
              >
                {set.rir ?? '–'}
              </button>

              <button
                onClick={() => set.completed ? onMarkIncomplete(setIdx) : (canComplete ? handleComplete(setIdx) : null)}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: 'auto',
                  background: set.completed ? 'hsla(142,71%,45%,0.15)' : canComplete ? 'hsl(var(--primary))' : 'hsl(var(--bg3))',
                  border: set.completed ? '1px solid hsla(142,71%,45%,0.3)' : canComplete ? 'none' : '1px solid hsl(var(--border))',
                  color: set.completed ? 'hsl(var(--ok))' : canComplete ? 'hsl(220,16%,6%)' : 'hsl(var(--dim))',
                  cursor: (set.completed || canComplete) ? 'pointer' : 'default',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700,
                }}
              >
                ✓
              </button>
            </div>
          );
        })}

        {/* Add / Remove set */}
        <div className="flex gap-2" style={{ marginTop: 4, marginBottom: 12 }}>
          <button
            onClick={onAddSet}
            className="flex-1 flex items-center justify-center gap-1"
            style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
              padding: '8px 0', borderRadius: 6,
              border: '1px dashed hsla(192,91%,54%,0.3)', background: 'transparent',
              color: 'hsl(var(--primary))', cursor: 'pointer',
            }}
          >
            <Plus size={12} /> Add Set
          </button>
          {ex.sets.length > 1 && (
            <button
              onClick={() => onRemoveSet(ex.sets.length - 1)}
              className="flex items-center justify-center gap-1"
              style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                padding: '8px 12px', borderRadius: 6,
                border: '1px dashed hsla(0,72%,51%,0.3)', background: 'transparent',
                color: 'hsl(var(--bad))', cursor: 'pointer',
              }}
            >
              <Minus size={12} />
            </button>
          )}
        </div>

        {/* Rest timer selector — configurable */}
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => setShowRestPicker(!showRestPicker)}
            className="w-full flex items-center justify-center gap-2"
            style={{
              padding: '10px 0', borderRadius: 8,
              background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))',
              color: 'hsl(var(--dim))', fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
              cursor: 'pointer',
            }}
          >
            <Clock size={14} /> Rest Timer · {formatRestTime(restTimerDuration)}
          </button>

          {showRestPicker && (
            <div style={{
              marginTop: 6, padding: 10, borderRadius: 8,
              background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))',
            }}>
              <div className="flex flex-wrap gap-2 mb-2">
                {REST_PRESETS.map(secs => (
                  <button
                    key={secs}
                    onClick={() => { setRestTimerDuration(secs); setShowRestPicker(false); }}
                    style={{
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600,
                      padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                      background: restTimerDuration === secs ? 'hsl(var(--primary))' : 'hsl(var(--bg3))',
                      color: restTimerDuration === secs ? 'hsl(220,16%,6%)' : 'hsl(var(--text))',
                      border: restTimerDuration === secs ? 'none' : '1px solid hsl(var(--border))',
                    }}
                  >
                    {formatRestTime(secs)}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customRestInput}
                  onChange={e => setCustomRestInput(e.target.value)}
                  placeholder="m:ss or seconds"
                  style={{
                    flex: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                    padding: '6px 10px', borderRadius: 6,
                    background: 'hsl(var(--bg3))', border: '1px solid hsl(var(--border))',
                    color: 'hsl(var(--text))', outline: 'none',
                  }}
                />
                <button
                  onClick={handleCustomRestConfirm}
                  style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700,
                    padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
                    background: 'hsl(var(--primary))', color: 'hsl(220,16%,6%)', border: 'none',
                  }}
                >
                  Set
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Exercise notes */}
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="flex items-center gap-1.5 mb-2"
            style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, color: showNotes ? 'hsl(var(--primary))' : 'hsl(var(--dim))', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <StickyNote size={11} /> {showNotes ? 'Hide Notes' : 'Notes'}
          </button>
          {showNotes && (
            <textarea
              value={ex.notes}
              onChange={e => onUpdateNotes(e.target.value)}
              placeholder="Exercise notes..."
              rows={3}
              className="w-full focus:outline-none resize-none"
              style={{
                background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))',
                borderRadius: 8, padding: '8px 10px',
                fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'hsl(var(--text))',
              }}
            />
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{
        padding: '12px 16px', flexShrink: 0,
        background: 'hsla(220,16%,6%,0.95)', backdropFilter: 'blur(12px)',
        borderTop: '1px solid hsl(var(--border))',
        display: 'flex', gap: 8,
      }}>
        <button
          onClick={onPrev}
          disabled={exerciseIndex === 0}
          className="flex items-center justify-center gap-1"
          style={{
            flex: 1, padding: '12px 0', borderRadius: 8,
            background: 'hsl(var(--bg2))', border: '1px solid hsl(var(--border))',
            color: exerciseIndex === 0 ? 'hsl(var(--bg4))' : 'hsl(var(--text))',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600,
            cursor: exerciseIndex === 0 ? 'default' : 'pointer',
            opacity: exerciseIndex === 0 ? 0.4 : 1,
          }}
        >
          <ChevronLeft size={16} /> Prev
        </button>
        <button
          onClick={onNext}
          style={{
            flex: 2, padding: '12px 0', borderRadius: 8,
            background: allComplete ? 'hsl(var(--ok))' : 'hsl(var(--primary))',
            border: 'none',
            color: 'hsl(220,16%,6%)',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: 1, cursor: 'pointer',
          }}
        >
          {exerciseIndex === totalExercises - 1 ? 'Back to Overview' : 'Next →'}
        </button>
      </div>

      {/* Rest timer overlay */}
      {showRestTimer && (
        <RestTimer
          durationSecs={restTimerDuration}
          onComplete={() => setShowRestTimer(false)}
          onSkip={() => setShowRestTimer(false)}
        />
      )}

      {/* Weight Numpad */}
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
