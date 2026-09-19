import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  NativeCallback,
  NativeParam,
  NativeRow,
  NativeSqlOperation,
  StorageModule,
} from './nativeStorage';
import {
  StorageUnavailableError,
  createPreviewStorage,
  createProductionStorage,
  getStorage,
  isPreviewStorage,
  selectStorage,
  setStorageForTesting,
  type Storage,
} from './storage';

/** Módulo nativo mínimo: solo importa que `open` se llame para probar el camino. */
class RecordingModule implements StorageModule {
  opened: string | null = null;

  open(dbName: string, callback: NativeCallback<null>): void {
    this.opened = dbName;
    callback({ ok: true, data: null });
  }

  close(callback: NativeCallback<null>): void {
    callback({ ok: true, data: null });
  }

  execute(_sql: string, _params: NativeParam[] | null, callback: NativeCallback<number>): void {
    callback({ ok: true, data: 0 });
  }

  query(_sql: string, _params: NativeParam[] | null, callback: NativeCallback<NativeRow[]>): void {
    callback({ ok: true, data: [] });
  }

  transaction(_operations: NativeSqlOperation[], callback: NativeCallback<number[]>): void {
    callback({ ok: true, data: [] });
  }
}

afterEach(() => {
  setStorageForTesting(null);
  vi.restoreAllMocks();
});

describe('createPreviewStorage (almacén efímero del modo preview)', () => {
  it('guarda, lee, lista por prefijo y borra sin ningún módulo', async () => {
    const storage = createPreviewStorage();
    await storage.setItem('exercise:1', 'a');
    await storage.setItem('routine:1', 'b');

    expect(await storage.getItem('exercise:1')).toBe('a');
    expect(await storage.getItem('exercise:missing')).toBeNull();
    expect((await storage.keys('exercise:')).sort()).toEqual(['exercise:1']);

    await storage.removeItem('exercise:1');
    expect(await storage.keys('exercise:')).toEqual([]);
  });

  it('no comparte estado entre instancias: es efímero, no durable', async () => {
    const first = createPreviewStorage();
    await first.setItem('k', 'v');

    expect(await createPreviewStorage().getItem('k')).toBeNull();
  });
});

describe('selectStorage (el módulo nativo es el único camino de producción)', () => {
  it('sin módulo y fuera de preview falla en vez de caer a memoria', async () => {
    await expect(selectStorage(false, null)).rejects.toBeInstanceOf(StorageUnavailableError);
    await expect(createProductionStorage(null)).rejects.toThrow(/StorageModule no está registrado/);
  });

  it('en preview, sin módulo, usa el almacén efímero', async () => {
    const storage: Storage = await selectStorage(true, null);
    await storage.setItem('k', 'v');
    expect(await storage.getItem('k')).toBe('v');
  });

  it('el módulo nativo gana aunque el build sea de preview', async () => {
    const module = new RecordingModule();
    const storage = await selectStorage(true, module);

    await storage.setItem('k', 'v');
    expect(module.opened).toBe('strain.db');
  });
});

describe('getStorage (resolución en el arranque)', () => {
  it('el runner corre en preview: usa el efímero y lo avisa una sola vez', async () => {
    expect(isPreviewStorage()).toBe(true);

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const storage = await getStorage();
    await storage.setItem('strain-preferences', '{"themeMode":"dark"}');

    expect(await storage.getItem('strain-preferences')).toBe('{"themeMode":"dark"}');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('PREVIEW'));

    expect(await getStorage()).toBe(storage);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
