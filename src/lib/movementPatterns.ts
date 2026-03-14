export const MOVEMENT_COEFFICIENTS: Record<string, number> = {
  Squat: 1.4,
  Hinge: 1.5,
  Push: 1.2,
  Pull: 1.3,
  Carry: 1.1,
  Lunge: 1.2,
  Rotation: 1.0,
  Jump: 1.6,
  Sprint: 1.8,
  Swim: 1.4,
  Row: 1.3,
};

export const ALL_PATTERNS = Object.keys(MOVEMENT_COEFFICIENTS);

export function calculateSetNtu(
  reps: number,
  weightKg: number,
  movementPattern: string
): number {
  const coeff = MOVEMENT_COEFFICIENTS[movementPattern] ?? 1.0;
  return reps * weightKg * coeff;
}
