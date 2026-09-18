/**
 * La regla del descanso en supersets, en un solo lugar.
 *
 * Un Superset agrupa ejercicios bajo una letra y se ejecuta en alternancia: se
 * descansa al **cerrar el grupo**, no en cada set (ver `CONTEXT.md`). Estas dos
 * funciones son la definición de esa regla; el store es su único consumidor.
 *
 * Los tipos son estructurales a propósito: la regla es pura y no depende del
 * data layer.
 */

/** Lo mínimo que la regla necesita saber de un ejercicio de la sesión. */
export interface SupersetCandidate {
  supersetGroup: string | null;
  sets: { id: string; isCompleted: boolean }[];
}

/** Letras que el builder usa para las etiquetas de superset. */
const SUPERSET_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

/**
 * La próxima letra libre para un grupo nuevo: `A`, `B`, `C`…
 *
 * Reutiliza huecos: si un grupo se borró, su letra vuelve a estar disponible. Si
 * no queda ninguna libre devuelve `A` (caso degenerado: más de seis supersets en
 * un entrenamiento), que es el comportamiento que ya tenía el builder de rutinas.
 */
export function nextSupersetLetter(exercises: { supersetGroup: string | null }[]): string {
  const taken = new Set<string>();

  for (const ex of exercises) {
    if (ex.supersetGroup !== null) taken.add(ex.supersetGroup);
  }

  return SUPERSET_LETTERS.find((letter) => !taken.has(letter)) ?? 'A';
}

/**
 * El ejercicio cuyo descanso corresponde arrancar al completar `setId`, o `null`
 * si ese set no cierra la ronda.
 *
 * - Fuera de un grupo, o solo en el suyo: cierra siempre, así que se descansa en
 *   cada set como antes.
 * - Dentro de un grupo: cierra si **ningún ejercicio posterior del mismo grupo
 *   tiene sets sin completar**. De ahí sale el caso de sets desparejos: el último
 *   set pendiente del grupo siempre descansa, aunque no sea el del último
 *   ejercicio.
 *
 * `exercises` se asume en orden de ejecución (`orderIndex`, como lo devuelve
 * `getFullSession`).
 *
 * Devuelve el ejercicio y no un booleano porque el consumidor necesita su
 * `restSeconds`: el descanso que arranca es el del ejercicio que cierra. Es
 * genérica para devolver el mismo tipo que recibe, con los campos que el
 * consumidor ya conoce.
 */
export function supersetRestOwner<T extends SupersetCandidate>(
  exercises: T[],
  setId: string
): T | null {
  const index = exercises.findIndex((ex) => ex.sets.some((set) => set.id === setId));

  if (index === -1) return null;

  const exercise = exercises[index];

  if (!exercise) return null;

  if (!exercise.supersetGroup) return exercise;

  const laterHasPending = exercises
    .slice(index + 1)
    .some(
      (later) =>
        later.supersetGroup === exercise.supersetGroup &&
        later.sets.some((set) => !set.isCompleted)
    );

  return laterHasPending ? null : exercise;
}
