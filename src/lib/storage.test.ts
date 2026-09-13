import { afterEach, describe, expect, it } from 'vitest';

import { createMemoryStorage, createSafeAsyncStorage, getBrowserLocalStorage } from './storage';

// SAFETY: `window` es un global del navegador que los tipos de Node no declaran.
const nodeGlobal = globalThis as { window?: unknown };

/** localStorage falso de navegador, para probar la delegación sin jsdom. */
function fakeLocalStorage() {
  const data = new Map<string, string>();

  return {
    data,
    getItem: (key: string) => (data.has(key) ? data.get(key)! : null),
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}

const originalWindow = nodeGlobal.window;

afterEach(() => {
  nodeGlobal.window = originalWindow;
});

describe('storage · sin window (render estático en node)', () => {
  it('no encuentra localStorage de navegador', () => {
    nodeGlobal.window = undefined;

    expect(getBrowserLocalStorage()).toBeNull();
  });

  it('createSafeAsyncStorage cae a memoria y no lanza', async () => {
    nodeGlobal.window = undefined;
    const storage = createSafeAsyncStorage();

    expect(await storage.getItem('k')).toBeNull();
    await storage.setItem('k', 'v');
    expect(await storage.getItem('k')).toBe('v');
    await storage.removeItem('k');
    expect(await storage.getItem('k')).toBeNull();
  });

  it('la memoria también sirve como storage síncrono', () => {
    const storage = createMemoryStorage();

    expect(storage.getItem('a')).toBeNull();
    storage.setItem('a', '1');
    expect(storage.getItem('a')).toBe('1');
    storage.removeItem('a');
    expect(storage.getItem('a')).toBeNull();
  });
});

describe('storage · con localStorage', () => {
  it('getBrowserLocalStorage devuelve el localStorage del navegador', () => {
    const fake = fakeLocalStorage();
    nodeGlobal.window = { localStorage: fake };

    expect(getBrowserLocalStorage()).toBe(fake);
  });

  it('createSafeAsyncStorage persiste y lee a través del storage web', async () => {
    const fake = fakeLocalStorage();
    nodeGlobal.window = { localStorage: fake };
    const storage = createSafeAsyncStorage();

    await storage.setItem('k', 'v');
    expect(await storage.getItem('k')).toBe('v');
    expect(fake.data.get('k')).toBe('v');
  });
});
