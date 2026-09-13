import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * El bootstrap no puede fallar en silencio: si el seed revienta, la promesa se
 * rechaza (con la causa real) y el registry queda sin publicar. Y el fallo no
 * queda cacheado: la siguiente llamada reintenta.
 *
 * Los módulos nativos y `@db/seed` / `@db/migrations` se inyectan por alias en
 * vitest.config, no con `vi.mock`.
 */

// SAFETY: `__DEV__` es un global de React Native que los tipos de Node no declaran.
const nodeGlobal = globalThis as { __DEV__?: boolean };

// SAFETY: flags que leen los fakes de test inyectados por alias.
const stubGlobal = globalThis as { __SEED_THROWS__?: boolean; __SQLITE_HANDLE__?: unknown };

/** Handle mínimo que consume el bootstrap; el fake no ejecuta SQL real. */
const fakeSqlite = { execSync: () => {}, getAllSync: () => [] };

async function loadBootstrap() {
  vi.resetModules();
  stubGlobal.__SQLITE_HANDLE__ = fakeSqlite;

  const [bootstrapMod, registryMod] = await Promise.all([
    import('./bootstrap'),
    import('./registry'),
  ]);

  return {
    bootstrapProductionDatabase: bootstrapMod.bootstrapProductionDatabase,
    getRepos: registryMod.getRepos,
  };
}

describe('bootstrapProductionDatabase', () => {
  beforeEach(() => {
    nodeGlobal.__DEV__ = false;
  });

  afterEach(() => {
    stubGlobal.__SEED_THROWS__ = undefined;
    stubGlobal.__SQLITE_HANDLE__ = undefined;
    vi.resetModules();
  });

  it('propaga el fallo y no publica el data layer', async () => {
    stubGlobal.__SEED_THROWS__ = true;
    const { bootstrapProductionDatabase, getRepos } = await loadBootstrap();

    await expect(bootstrapProductionDatabase()).rejects.toThrow('seed boom');
    expect(() => getRepos()).toThrow(/no inicializado/i);
  });

  it('reintenta tras un fallo y publica los repos cuando va bien', async () => {
    stubGlobal.__SEED_THROWS__ = true;
    const { bootstrapProductionDatabase, getRepos } = await loadBootstrap();
    await expect(bootstrapProductionDatabase()).rejects.toThrow('seed boom');

    stubGlobal.__SEED_THROWS__ = false;
    const repos = await bootstrapProductionDatabase();

    expect(getRepos()).toBe(repos);
  });
});
