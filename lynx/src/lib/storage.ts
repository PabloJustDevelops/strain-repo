import type { StateStorage } from 'zustand/middleware';

import { getStorage } from '@db/storage';

/**
 * Adaptador de la seam `Storage` al `StateStorage` que espera el middleware
 * `persist` de Zustand. En Lynx no hay AsyncStorage ni localStorage garantizado,
 * así que las preferencias viven en la misma seam que el resto de la app.
 */
export function createStateStorage(): StateStorage {
  const storage = getStorage();
  return {
    getItem: (name) => storage.getItem(name),
    setItem: (name, value) => storage.setItem(name, value),
    removeItem: (name) => storage.removeItem(name),
  };
}
