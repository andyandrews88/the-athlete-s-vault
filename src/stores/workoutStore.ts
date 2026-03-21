import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/* ─── Types ─── */
export interface SetData {
  set_num: number;
  reps: number | null;
  weight_kg: number | null;
  rir: number | null;
  rpe: number | null;
  completed: boolean;
  set_type: 'warmup' | 'working';
  duration_secs: number | null;
  distance_m: number | null;
  calories: number | null;
  is_pr?: boolean;
  side?: 'L' | 'R' | null;
}

export type WorkoutSection = 'warmup' | 'exercises' | 'cooldown';

export interface ExerciseRow {
  id: string;
  name: string;
  movement_pattern: string;
  difficulty_coefficient: number;
  exercise_type?: string;
  video_url?: string;
  muscle_group?: string | null;
  equipment_type?: string | null;
  is_timed?: boolean | null;
  is_unilateral?: boolean | null;
  is_plyometric?: boolean | null;
}

export interface SessionExercise {
  exercise: ExerciseRow;
  sets: SetData[];
  expanded: boolean;
  isPr: boolean;
  notes: string;
  section: WorkoutSection;
  supersetGroup: string | null;
  showNotes: boolean;
}

interface PendingWrite {
  data: Partial<SetData>;
  timestamp: number;
}

interface WorkoutState {
  // Session state
  activeSessionId: string | null;
  sessionStartTime: string | null; // ISO string for serialization
  exercises: SessionExercise[];
  isSessionActive: boolean;
  viewingWorkoutId: string | null;
  preferredUnit: 'kg' | 'lbs';

  // Optimistic write queue
  pendingWrites: Record<string, PendingWrite>;
  addPendingWrite: (key: string, data: Partial<SetData>) => void;
  clearPendingWrite: (key: string) => void;
  clearAllPendingWrites: () => void;

  // Actions
  startSession: (sessionId: string, preloadedExercises?: SessionExercise[]) => void;
  endSession: () => void;
  setExercises: (exercises: SessionExercise[]) => void;
  addExercise: (exercise: SessionExercise) => void;
  removeExercise: (index: number) => void;
  reorderExercise: (index: number, direction: 'up' | 'down') => void;
  updateExercise: (index: number, updates: Partial<SessionExercise>) => void;
  updateSet: (exerciseIndex: number, setIndex: number, data: Partial<SetData>) => void;
  addSet: (exerciseIndex: number) => void;
  removeSet: (exerciseIndex: number, setIndex: number) => void;
  markSetComplete: (exerciseIndex: number, setIndex: number) => void;
  markSetIncomplete: (exerciseIndex: number, setIndex: number) => void;
  linkSuperset: (idx1: number, idx2: number) => void;
  unlinkSuperset: (index: number) => void;
  moveExerciseToSection: (index: number, section: WorkoutSection) => void;
  setViewingWorkout: (id: string | null) => void;
  setPreferredUnit: (unit: 'kg' | 'lbs') => void;
  resetSession: () => void;
}

const emptySessionState = {
  activeSessionId: null,
  sessionStartTime: null,
  isSessionActive: false,
  exercises: [],
};

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set) => ({
      ...emptySessionState,
      viewingWorkoutId: null,
      preferredUnit: 'kg',
      pendingWrites: {},

      addPendingWrite: (key, data) =>
        set((state) => ({
          pendingWrites: { ...state.pendingWrites, [key]: { data, timestamp: Date.now() } },
        })),

      clearPendingWrite: (key) =>
        set((state) => {
          const { [key]: _, ...rest } = state.pendingWrites;
          return { pendingWrites: rest };
        }),

      clearAllPendingWrites: () => set({ pendingWrites: {} }),

      startSession: (sessionId, preloadedExercises) =>
        set({
          activeSessionId: sessionId,
          sessionStartTime: new Date().toISOString(),
          isSessionActive: true,
          exercises: preloadedExercises || [],
        }),

      endSession: () => set(emptySessionState),

      setExercises: (exercises) => set({ exercises }),

      addExercise: (exercise) =>
        set((state) => ({
          exercises: [...state.exercises, exercise],
        })),

      removeExercise: (index) =>
        set((state) => ({
          exercises: state.exercises.filter((_, i) => i !== index),
        })),

      reorderExercise: (index, direction) =>
        set((state) => {
          const exercises = [...state.exercises];
          const newIndex = direction === 'up' ? index - 1 : index + 1;
          if (newIndex < 0 || newIndex >= exercises.length) return state;
          const temp = exercises[index];
          exercises[index] = exercises[newIndex];
          exercises[newIndex] = temp;
          return { exercises };
        }),

      updateExercise: (index, updates) =>
        set((state) => ({
          exercises: state.exercises.map((e, i) =>
            i === index ? { ...e, ...updates } : e
          ),
        })),

      updateSet: (exerciseIndex, setIndex, data) =>
        set((state) => ({
          exercises: state.exercises.map((e, i) =>
            i === exerciseIndex
              ? {
                  ...e,
                  sets: e.sets.map((s, j) =>
                    j === setIndex ? { ...s, ...data } : s
                  ),
                }
              : e
          ),
        })),

      addSet: (exerciseIndex) =>
        set((state) => ({
          exercises: state.exercises.map((e, i) =>
            i === exerciseIndex
              ? {
                  ...e,
                  sets: [
                    ...e.sets,
                    {
                      set_num: e.sets.length + 1,
                      reps: null,
                      weight_kg: null,
                      rir: null,
                      rpe: null,
                      completed: false,
                      set_type: 'working' as const,
                      duration_secs: null,
                      distance_m: null,
                      calories: null,
                    },
                  ],
                }
              : e
          ),
        })),

      removeSet: (exerciseIndex, setIndex) =>
        set((state) => ({
          exercises: state.exercises.map((e, i) =>
            i === exerciseIndex
              ? { ...e, sets: e.sets.filter((_, j) => j !== setIndex) }
              : e
          ),
        })),

      markSetComplete: (exerciseIndex, setIndex) =>
        set((state) => ({
          exercises: state.exercises.map((e, i) =>
            i === exerciseIndex
              ? {
                  ...e,
                  sets: e.sets.map((s, j) =>
                    j === setIndex ? { ...s, completed: true } : s
                  ),
                }
              : e
          ),
        })),

      markSetIncomplete: (exerciseIndex, setIndex) =>
        set((state) => ({
          exercises: state.exercises.map((e, i) =>
            i === exerciseIndex
              ? {
                  ...e,
                  sets: e.sets.map((s, j) =>
                    j === setIndex ? { ...s, completed: false } : s
                  ),
                }
              : e
          ),
        })),

      linkSuperset: (idx1, idx2) =>
        set((state) => {
          const groupId = `ss-${Date.now()}`;
          return {
            exercises: state.exercises.map((e, i) =>
              i === idx1 || i === idx2
                ? { ...e, supersetGroup: groupId }
                : e
            ),
          };
        }),

      unlinkSuperset: (index) =>
        set((state) => {
          const group = state.exercises[index]?.supersetGroup;
          if (!group) return state;
          return {
            exercises: state.exercises.map((e) =>
              e.supersetGroup === group ? { ...e, supersetGroup: null } : e
            ),
          };
        }),

      moveExerciseToSection: (index, section) =>
        set((state) => ({
          exercises: state.exercises.map((e, i) =>
            i === index ? { ...e, section } : e
          ),
        })),

      setViewingWorkout: (id) => set({ viewingWorkoutId: id }),

      setPreferredUnit: (unit) => set({ preferredUnit: unit }),

      resetSession: () => set(emptySessionState),
    }),
    {
      name: 'vault-workout-store',
      partialize: (state) => ({
        preferredUnit: state.preferredUnit,
        activeSessionId: state.activeSessionId,
        exercises: state.exercises,
        isSessionActive: state.isSessionActive,
        sessionStartTime: state.sessionStartTime,
      }),
    }
  )
);
