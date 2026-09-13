import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { seedExercises, fakeSqlite } = vi.hoisted(() => ({
  seedExercises: vi.fn(async () => {}),
  fakeSqlite: { execSync: vi.fn(), getAllSync: vi.fn(() => []) },
}));

vi.mock('expo-sqlite', () => ({
  openDatabaseAsync: vi.fn(async () => fakeSqlite),
}));

vi.mock('drizzle-orm/expo-sqlite', () => ({
  drizzle: vi.fn(() => ({})),
}));

vi.mock('./migrations', () => ({ runMigrations: vi.fn() }));
vi.mock('./seed', () => ({ seedExercises }));

import { bootstrapProductionDatabase } from './bootstrap';
import { getRepos } from './registry';

/**
 * El bootstrap no puede fallar en silencio: si el seed revienta, la promesa se
 * rechaza (con la causa real) y el registry queda sin publicar. Y el fallo no
 * queda cacheado: la siguiente llamada reintenta.
 */
describe('bootstrapProductionDatabase', () => {
  beforeEach(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('propaga el fallo y no publica el data layer', async () => {
    seedExercises.mockRejectedValueOnce(new Error('seed boom'));

    await expect(bootstrapProductionDatabase()).rejects.toThrow('seed boom');
    expect(() => getRepos()).toThrow(/no inicializado/i);
  });

  it('reintenta tras un fallo y publica los repos cuando va bien', async () => {
    seedExercises.mockRejectedValueOnce(new Error('boom'));
    await expect(bootstrapProductionDatabase()).rejects.toThrow('boom');

    seedExercises.mockResolvedValueOnce(undefined);
    const repos = await bootstrapProductionDatabase();

    expect(getRepos()).toBe(repos);
  });
});
