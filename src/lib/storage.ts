import type { StateStorage } from 'zustand/middleware';

import { getStorage } from '@db/storage';

/**
 * Adaptador de la seam `Storage` al `StateStorage` que espera el middleware
 * `persist` de Zustand. En Lynx no hay AsyncStorage ni localStorage garantizado,
 * así que las preferencias viven en la misma seam que el resto de la app.
 *
 * La seam es asíncrona, y `StateStorage` ya admite promesas, así que no hay
 * conversión: se delega y se espera el storage compartido.
 */
export function createStateStorage(): StateStorage {
  return {
    getItem: async (name) => (await getStorage()).getItem(name),
    setItem: async (name, value) => {
      await (await getStorage()).setItem(name, value);
    },
    removeItem: async (name) => {
      await (await getStorage()).removeItem(name);
    },
  };
}
