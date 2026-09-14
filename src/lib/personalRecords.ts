/**
 * Resumen de PR por ejercicio, ya con el nombre resuelto contra el catálogo.
 */
export interface PersonalRecordSummary {
  exerciseId: string;
  exerciseName: string;
  oneRm: number;
}

/** Top de PRs por 1RM estimado, sin mutar la entrada. */
export function topPersonalRecords(
  records: readonly PersonalRecordSummary[],
  limit = 10
): PersonalRecordSummary[] {
  return [...records].sort((a, b) => b.oneRm - a.oneRm).slice(0, limit);
}
