import { beforeEach, describe, expect, it } from 'vitest';

import { createRepos } from './index';
import {
  createNativeStorage,
  type NativeCallback,
  type NativeParam,
  type NativeRow,
  type NativeSqlOperation,
  type StorageModule,
} from './nativeStorage';
import type { Storage } from './storage';

/**
 * Disco del doble: un `Map` que vive FUERA de la instancia del módulo. Es lo
 * único que sobrevive cuando en el host muere el proceso: tirar el módulo y
 * construir otro sobre el mismo disco es lo que aquí simula reabrir la app.
 */
type Disk = Map<string, string>;

/**
 * Doble del `StorageModule` del host asentado sobre un [Disk] inyectable.
 *
 * Reconoce exactamente las sentencias que emite el adaptador (`nativeStorage.ts`)
 * y guarda los pares clave-valor en el disco compartido, así que dos módulos
 * distintos sobre el mismo disco no comparten nada más que el "fichero".
 */
class DiskStorageModule implements StorageModule {
  constructor(private readonly disk: Disk) {}

  open(_dbName: string, callback: NativeCallback<null>): void {
    callback({ ok: true, data: null });
  }

  close(callback: NativeCallback<null>): void {
    callback({ ok: true, data: null });
  }

  execute(sql: string, params: NativeParam[] | null, callback: NativeCallback<number>): void {
    try {
      callback({ ok: true, data: this.write(sql, params) });
    } catch (err) {
      callback({ ok: false, error: { code: 'UNKNOWN', message: String(err) } });
    }
  }

  query(sql: string, params: NativeParam[] | null, callback: NativeCallback<NativeRow[]>): void {
    const statement = sql.trim().toUpperCase();
    if (statement.startsWith('SELECT VALUE')) {
      const [key] = params ?? [];
      const value = this.disk.get(String(key));
      callback({ ok: true, data: value === undefined ? [] : [{ value }] });
      return;
    }
    if (statement.startsWith('SELECT KEY')) {
      const [pattern] = params ?? [];
      const prefix = String(pattern).replace(/%$/, '').replace(/\\(.)/g, '$1');
      const rows = [...this.disk.keys()]
        .filter((key) => key.startsWith(prefix))
        .map((key) => ({ key }));
      callback({ ok: true, data: rows });
      return;
    }
    callback({ ok: false, error: { code: 'UNKNOWN', message: `SQL no soportado: ${sql}` } });
  }

  transaction(operations: NativeSqlOperation[], callback: NativeCallback<number[]>): void {
    try {
      callback({ ok: true, data: operations.map((op) => this.write(op.sql, op.params)) });
    } catch (err) {
      callback({ ok: false, error: { code: 'UNKNOWN', message: String(err) } });
    }
  }

  private write(sql: string, params: NativeParam[] | null): number {
    const statement = sql.trim().toUpperCase();
    if (statement.startsWith('CREATE TABLE')) return 0;
    if (statement.startsWith('INSERT OR REPLACE')) {
      const [key, value] = params ?? [];
      this.disk.set(String(key), String(value));
      return 1;
    }
    if (statement.startsWith('DELETE FROM KV')) {
      const [key] = params ?? [];
      this.disk.delete(String(key));
      return 1;
    }
    throw new Error(`SQL de escritura no soportado: ${sql}`);
  }
}

const EXERCISE = {
  name: 'Press banca',
  muscleGroup: 'chest',
  secondaryMuscles: [],
  equipment: 'barbell',
  mechanic: 'compound',
  instructions: null,
  isCustom: false,
  notes: null,
};

/**
 * Durabilidad de la capa de datos: lo escrito sobrevive a reabrir, porque los
 * repos y el *kv* **releen del almacenamiento** y no de estado en memoria.
 *
 * El doble persiste entre instancias del storage: cada `openApp()` construye un
 * módulo y un storage nuevos sobre el mismo disco, y lo que queda en pie es solo
 * el disco. Así, si algo se guardara en memoria (una caché, un índice, un
 * snapshot), la segunda instancia no lo vería y la prueba fallaría.
 */
describe('durabilidad: los repos y el kv releen del disco, no de memoria', () => {
  let disk: Disk;

  beforeEach(() => {
    disk = new Map();
  });

  /** Abre la app sobre el disco actual: módulo y storage nuevos, mismo "fichero". */
  async function openApp(): Promise<{ storage: Storage; repos: ReturnType<typeof createRepos> }> {
    const storage = await createNativeStorage(new DiskStorageModule(disk));
    return { storage, repos: createRepos(storage) };
  }

  it('una segunda instancia sobre el mismo doble ve lo que escribió la primera', async () => {
    const first = await openApp();
    const routine = await first.repos.routines.create({ name: 'Durabilidad' });
    const exercise = await first.repos.exercises.create(EXERCISE);
    await first.repos.routines.addExercise(routine.id, exercise.id);
    // Los ajustes van por la misma seam.
    await first.storage.setItem('strain-preferences', '{"themeMode":"dark"}');

    // Muere el proceso: se tiran módulo y storage, solo queda el disco.
    const second = await openApp();

    const reopened = await second.repos.routines.getWithExercises(routine.id);
    expect(reopened?.routine.name).toBe('Durabilidad');
    expect(reopened?.exercises.map((row) => row.exercise.name)).toEqual(['Press banca']);
    expect((await second.repos.exercises.byId(exercise.id))?.name).toBe('Press banca');
    expect(await second.storage.getItem('strain-preferences')).toBe('{"themeMode":"dark"}');
  });

  it('una sesión terminada y su PR sobreviven a la reapertura', async () => {
    const first = await openApp();
    const exercise = await first.repos.exercises.create(EXERCISE);
    const session = await first.repos.sessions.start({ name: 'Sesión durable' });
    const sessionExercise = await first.repos.sessions.addSessionExercise(session.id, exercise.id);
    const set = await first.repos.sessions.addSet(sessionExercise.id);
    await first.repos.sessions.completeSet(set.id, 100, 5);
    await first.repos.sessions.finish(session.id);

    const second = await openApp();

    const stored = await second.repos.sessions.byId(session.id);
    expect(stored?.status).toBe('completed');
    expect(stored?.totalVolume).toBe(500);
    expect(stored?.totalSets).toBe(1);

    const prs = await second.repos.analytics.personalRecords(exercise.id);
    expect(prs).toHaveLength(1);
    expect(prs[0].value).toBeCloseTo(116.67, 1);
  });

  it('el camino de lectura no cachea: relee el disco en cada consulta', async () => {
    const { repos } = await openApp();
    expect(await repos.routines.list()).toEqual([]);

    // Otra instancia (o el propio fichero) escribe por fuera del repo.
    const now = new Date().toISOString();
    disk.set(
      'routine:externa',
      JSON.stringify({
        id: 'externa',
        name: 'Escrita por fuera',
        description: null,
        tags: [],
        color: null,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      }),
    );

    expect((await repos.routines.list()).map((routine) => routine.name)).toEqual([
      'Escrita por fuera',
    ]);
  });
});
