import { beforeEach, describe, expect, it } from 'vitest';

import { createRepos } from './index';
import {
  NativeStorageError,
  createNativeStorage,
  type NativeCallback,
  type NativeParam,
  type NativeRow,
  type NativeSqlOperation,
  type StorageModule,
} from './nativeStorage';

/**
 * Doble del `StorageModule` del host: guarda las filas en memoria y reconoce las
 * sentencias que emite el adaptador. No hace falta el emulador; lo que se prueba
 * es el contrato del adaptador (SQL parametrizado, envelope, propagación de
 * errores), no SQLite.
 */
class FakeStorageModule implements StorageModule {
  private readonly rows = new Map<string, string>();

  opened: string | null = null;
  failOpen: { code: string; message: string } | null = null;
  /** Cuando está puesto, toda escritura contesta este error (no se limpia solo). */
  failWrite: { code: string; message: string } | null = null;

  open(dbName: string, callback: NativeCallback<null>): void {
    if (this.failOpen) {
      callback({ ok: false, error: this.failOpen });
      return;
    }
    this.opened = dbName;
    callback({ ok: true, data: null });
  }

  close(callback: NativeCallback<null>): void {
    callback({ ok: true, data: null });
  }

  execute(sql: string, params: NativeParam[] | null, callback: NativeCallback<number>): void {
    if (this.failWrite) {
      callback({ ok: false, error: this.failWrite });
      return;
    }
    const statement = sql.trim().toUpperCase();
    if (statement.startsWith('CREATE TABLE')) {
      callback({ ok: true, data: 0 });
      return;
    }
    if (statement.startsWith('INSERT OR REPLACE')) {
      const [key, value] = params ?? [];
      this.rows.set(String(key), String(value));
      callback({ ok: true, data: 1 });
      return;
    }
    if (statement.startsWith('DELETE FROM KV')) {
      const [key] = params ?? [];
      this.rows.delete(String(key));
      callback({ ok: true, data: 1 });
      return;
    }
    callback({ ok: false, error: { code: 'UNKNOWN', message: `SQL no soportado: ${sql}` } });
  }

  query(sql: string, params: NativeParam[] | null, callback: NativeCallback<NativeRow[]>): void {
    const statement = sql.trim().toUpperCase();
    if (statement.startsWith('SELECT VALUE')) {
      const [key] = params ?? [];
      const value = this.rows.get(String(key));
      callback({ ok: true, data: value === undefined ? [] : [{ value }] });
      return;
    }
    if (statement.startsWith('SELECT KEY')) {
      const [pattern] = params ?? [];
      const prefix = String(pattern).replace(/%$/, '').replace(/\\(.)/g, '$1');
      const keys = [...this.rows.keys()]
        .filter((key) => key.startsWith(prefix))
        .map((key) => ({ key }));
      callback({ ok: true, data: keys });
      return;
    }
    callback({ ok: false, error: { code: 'UNKNOWN', message: `SQL no soportado: ${sql}` } });
  }

  transaction(operations: NativeSqlOperation[], callback: NativeCallback<number[]>): void {
    callback({ ok: true, data: operations.map(() => 1) });
  }
}

describe('createNativeStorage (adaptador durable)', () => {
  let module: FakeStorageModule;

  beforeEach(() => {
    module = new FakeStorageModule();
  });

  it('abre la base pedida y crea la tabla al construirse', async () => {
    await createNativeStorage(module, 'strain.db');
    expect(module.opened).toBe('strain.db');
  });

  it('escribe y lee un valor', async () => {
    const storage = await createNativeStorage(module);
    await storage.setItem('exercise:1', '{"id":"1"}');
    expect(await storage.getItem('exercise:1')).toBe('{"id":"1"}');
  });

  it('devuelve null para una clave ausente', async () => {
    const storage = await createNativeStorage(module);
    expect(await storage.getItem('exercise:missing')).toBeNull();
  });

  it('sobrescribe el valor de una clave repetida', async () => {
    const storage = await createNativeStorage(module);
    await storage.setItem('strain-preferences', '{"themeMode":"dark"}');
    await storage.setItem('strain-preferences', '{"themeMode":"light"}');
    expect(await storage.getItem('strain-preferences')).toBe('{"themeMode":"light"}');
  });

  it('keys(prefix) devuelve solo las claves del prefijo', async () => {
    const storage = await createNativeStorage(module);
    await storage.setItem('exercise:1', 'a');
    await storage.setItem('exercise:2', 'b');
    await storage.setItem('routine:1', 'c');

    expect((await storage.keys('exercise:')).sort()).toEqual(['exercise:1', 'exercise:2']);
    expect(await storage.keys('')).toHaveLength(3);
    expect(await storage.keys('session:')).toEqual([]);
  });

  it('removeItem borra la clave', async () => {
    const storage = await createNativeStorage(module);
    await storage.setItem('exercise:1', 'a');
    await storage.removeItem('exercise:1');

    expect(await storage.getItem('exercise:1')).toBeNull();
    expect(await storage.keys('exercise:')).toEqual([]);
  });

  it('propaga un fallo de escritura con el código del módulo', async () => {
    const storage = await createNativeStorage(module);
    module.failWrite = { code: 'SQLITE_FULL', message: 'la base está llena' };

    await expect(storage.setItem('exercise:1', 'a')).rejects.toBeInstanceOf(NativeStorageError);
    await expect(storage.setItem('exercise:1', 'a')).rejects.toMatchObject({
      code: 'SQLITE_FULL',
      message: 'la base está llena',
    });

    module.failWrite = null;
    expect(await storage.getItem('exercise:1')).toBeNull();
  });

  it('propaga un fallo al abrir la base', async () => {
    module.failOpen = { code: 'DB_OPEN_FAILED', message: 'no se pudo abrir' };
    await expect(createNativeStorage(module)).rejects.toMatchObject({ code: 'DB_OPEN_FAILED' });
  });

  it('sostiene los repos de la app sobre el módulo nativo', async () => {
    const repos = createRepos(await createNativeStorage(module));

    const exercise = await repos.exercises.create({
      name: 'Press banca',
      muscleGroup: 'chest',
      secondaryMuscles: [],
      equipment: 'barbell',
      mechanic: 'compound',
      instructions: null,
      isCustom: false,
      notes: null,
    });
    const routine = await repos.routines.create({ name: 'Push A' });
    await repos.routines.addExercise(routine.id, exercise.id);

    const full = await repos.routines.getWithExercises(routine.id);
    expect(full?.exercises.map((row) => row.exercise.name)).toEqual(['Press banca']);
  });
});
