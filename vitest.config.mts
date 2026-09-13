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
      // Modulos nativos y de Expo: no se pueden evaluar en Node, se inyectan fakes
      // por alias (equivale a una costura) en vez de mockear en cada test.
      'expo-crypto': fileURLToPath(new URL('./src/lib/testing/expo-crypto.ts', import.meta.url)),
      'expo-constants': fileURLToPath(new URL('./src/lib/testing/expo-constants.ts', import.meta.url)),
      'expo-notifications': fileURLToPath(new URL('./src/lib/testing/expo-notifications.ts', import.meta.url)),
      'react-native-health-connect': fileURLToPath(new URL('./src/lib/testing/react-native-health-connect.ts', import.meta.url)),
      'expo-sqlite': fileURLToPath(new URL('./src/lib/testing/expo-sqlite.ts', import.meta.url)),
      'drizzle-orm/expo-sqlite': fileURLToPath(new URL('./src/lib/testing/drizzle-expo-sqlite.ts', import.meta.url)),
      '@db/seed': fileURLToPath(new URL('./src/lib/testing/db-seed.ts', import.meta.url)),
      '@db/migrations': fileURLToPath(new URL('./src/lib/testing/db-migrations.ts', import.meta.url)),
      'react-native': fileURLToPath(new URL('./src/lib/testing/react-native.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
