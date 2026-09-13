import { describe, expect, it } from 'vitest';

import { remountKey } from './reactKeys';

describe('remountKey', () => {
  it('usa un namespace distinto cuando el componente está cerrado', () => {
    expect(remountKey('keypad', null)).toBe('keypad-closed');
    expect(remountKey('sheet', null)).toBe('sheet-closed');
    expect(remountKey('keypad', undefined)).toBe('keypad-closed');
  });

  it('respeta el id cuando lo hay', () => {
    expect(remountKey('sheet', 'abc')).toBe('sheet-abc');
    expect(remountKey('keypad', 'x-weight')).toBe('keypad-x-weight');
  });

  it('nunca coincide entre namespaces distintos, con id o sin él', () => {
    for (const id of [null, undefined, 'a', 'b']) {
      expect(remountKey('keypad', id)).not.toBe(remountKey('sheet', id));
    }
  });
});
