import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Los alias salen de `tsconfig.json` vía `resolve.tsconfigPaths`: **una sola fuente**,
 * y sin dependencias extra.
 *
 * Antes estaban escritos a mano acá y se desincronizaron apenas se agregaron
 * `@db` y `@lib` — la misma clase de bug que C1 vino a matar, pero en config.
 */
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // expo-crypto es un módulo nativo y lanza al importarse fuera de RN.
      // Los tests corren con un stub determinista (ver src/lib/testing).
      'expo-crypto': fileURLToPath(new URL('./src/lib/testing/expo-crypto.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
