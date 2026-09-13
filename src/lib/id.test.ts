import { afterEach, describe, expect, it, vi } from 'vitest';

import { newId, shortId } from './id';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * El bug que llegó al emulador: nanoid v5 necesita `crypto.getRandomValues()` y
 * Hermes no tiene `crypto`, así que el seed reventaba el bootstrap. Estos tests
 * borran el global a propósito: si alguien reintroduce una dependencia que lo
 * use, fallan.
 */
describe('id · generación sin el global crypto', () => {
  it('genera un id con crypto ausente (Hermes)', () => {
    vi.stubGlobal('crypto', undefined);

    let id = '';
    expect(() => {
      id = newId();
    }).not.toThrow();
    expect(id).toMatch(UUID);
  });

  it('no repite ids', () => {
    expect(newId()).not.toBe(newId());
  });

  it('shortId respeta la longitud pedida', () => {
    expect(shortId(6)).toHaveLength(6);
    expect(shortId()).toHaveLength(6);
    expect(shortId(8)).toHaveLength(8);
  });
});
