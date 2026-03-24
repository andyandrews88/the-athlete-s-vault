import { Check } from 'lucide-react';
import type { SessionExercise } from '@/stores/workoutStore';

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

interface ExerciseCardProps {
  exercise: SessionExercise;
  exerciseIndex: number;
  onClick: () => void;
  preferredUnit: 'kg' | 'lbs';
}

const LB_PER_KG = 2.20462;

export const ExerciseCard = ({
  exercise: ex,
  exerciseIndex: exIdx,
  onClick,
  preferredUnit,
}: ExerciseCardProps) => {
  const completedSets = ex.sets.filter(s => s.completed).length;
  const allComplete = ex.sets.length > 0 && completedSets === ex.sets.length;
  const isTimed = ex.exercise.exercise_type === 'timed' || ex.exercise.exercise_type === 'conditioning';

  const toDisplay = (kg: number | null) => {
    if (kg === null) return null;
    return preferredUnit === 'lbs' ? Math.round(kg * LB_PER_KG * 10) / 10 : kg;
  };

  // Summary: best set or set count
  const firstCompletedWithWeight = ex.sets.find(s => s.completed && s.weight_kg !== null);
  const summaryWeight = firstCompletedWithWeight ? toDisplay(firstCompletedWithWeight.weight_kg) : null;
  const summaryReps = firstCompletedWithWeight?.reps;

  const firstReps = ex.sets[0]?.reps;
  const summaryLine = isTimed
    ? `${ex.sets.length} set${ex.sets.length > 1 ? 's' : ''}`
    : summaryWeight !== null
      ? `${summaryWeight}${preferredUnit} × ${summaryReps ?? '–'}`
      : `${ex.sets.length} × ${firstReps ?? '–'}`;

  const ssColor = ex.supersetGroup ? 'border-l-2 border-l-amber-500' : '';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left ${ssColor}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 8px',
        borderBottom: '1px solid hsl(var(--border))',
        background: 'transparent', border: 'none',
        borderBottomWidth: 1, borderBottomStyle: 'solid',
        borderBottomColor: 'hsl(var(--border))',
        cursor: 'pointer',
      }}
    >
      {/* Pip */}
      <div style={{
        width: 4, minWidth: 4, height: 32, borderRadius: 2,
        background: pipColor(ex.exercise.movement_pattern || ''),
        flexShrink: 0,
      }} />

      {/* Name + summary */}
      <div className="flex-1 min-w-0">
        <p className="truncate" style={{
          fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600,
          color: allComplete ? 'hsl(var(--ok))' : 'hsl(var(--text))',
        }}>
          {ex.exercise.name}
        </p>
        <p style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
          color: 'hsl(var(--dim))', marginTop: 2,
        }}>
          {summaryLine} · {ex.exercise.movement_pattern || ''}
        </p>
        {ex.coachNotes && (
          <p style={{ fontSize: 11, color: 'hsl(var(--warn))', fontStyle: 'italic', marginTop: 2 }}>
            → {ex.coachNotes}
          </p>
        )}
      </div>

      {/* Right side indicators */}
      <div className="flex items-center gap-2 shrink-0">
        {ex.supersetGroup && (
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
            padding: '2px 6px', borderRadius: 9,
            background: 'hsla(38,92%,50%,0.1)', color: 'hsl(var(--warn))',
            border: '1px solid hsla(38,92%,50%,0.2)',
          }}>SS</span>
        )}
        {ex.isPr && (
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
            padding: '2px 6px', borderRadius: 4,
            background: 'hsl(var(--pg))', color: 'hsl(var(--primary))',
            border: '1px solid hsla(192,91%,54%,0.25)',
          }}>PR ↑</span>
        )}
        {allComplete ? (
          <div style={{
            width: 24, height: 24, borderRadius: 12,
            background: 'hsla(142,71%,45%,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Check size={14} style={{ color: 'hsl(var(--ok))' }} />
          </div>
        ) : completedSets > 0 ? (
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
            padding: '2px 8px', borderRadius: 10,
            background: 'hsla(142,71%,45%,0.1)', color: 'hsl(var(--ok))',
            border: '1px solid hsla(142,71%,45%,0.2)',
          }}>
            {completedSets}/{ex.sets.length}
          </span>
        ) : (
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
            color: 'hsl(var(--dim))',
          }}>
            {ex.sets.length}s
          </span>
        )}
      </div>
    </button>
  );
};
