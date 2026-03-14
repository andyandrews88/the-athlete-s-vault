export const MOVEMENT_COEFFICIENTS: Record<string, number> = {
  Hinge: 1.5,
  Squat: 1.4,
  Push: 1.2,
  Pull: 1.3,
  'Single Leg': 1.3,
  Core: 1.0,
  Carry: 1.1,
  Olympic: 1.6,
  Isolation: 1.0,
  Plyometric: 1.6,
  Rotational: 1.0,
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
