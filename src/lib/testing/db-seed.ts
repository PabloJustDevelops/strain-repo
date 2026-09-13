/**
 * Stub de `@db/seed` para Vitest: controlado por `globalThis.__SEED_THROWS__`
 * para probar que el bootstrap propaga el fallo y se puede reintentar.
 */
// SAFETY: flag de test que Node no declara.
const g = globalThis as { __SEED_THROWS__?: boolean };

export const seedExercises = async () => {
  if (g.__SEED_THROWS__) throw new Error('seed boom');
};
