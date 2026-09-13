/**
 * Stub de `expo-constants` para Vitest.
 *
 * El entorno se controla desde `globalThis.__EXPO_ENV__` y se lee al evaluar el
 * módulo; los tests hacen `vi.resetModules()` + import dinámico para cambiarlo.
 */
// SAFETY: global de test que Node no declara.
const g = globalThis as { __EXPO_ENV__?: 'storeClient' | 'bare' };

const environment = g.__EXPO_ENV__ ?? 'bare';

export default {
  executionEnvironment: environment,
  appOwnership: environment === 'storeClient' ? 'expo' : 'standalone',
};
