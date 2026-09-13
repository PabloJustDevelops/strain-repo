/**
 * Stub de `expo-sqlite` para Vitest: devuelve el handle que el test dejó en
 * `globalThis.__SQLITE_HANDLE__`. Se inyecta por alias en vitest.config.
 */
// SAFETY: handle de test que Node no declara.
const g = globalThis as { __SQLITE_HANDLE__?: unknown };

export const openDatabaseAsync = async () => g.__SQLITE_HANDLE__;
