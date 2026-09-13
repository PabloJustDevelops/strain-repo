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
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
