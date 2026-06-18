import type { Config } from 'drizzle-kit';

// Configuración de Drizzle para SQLite local (expo-sqlite)
// En desarrollo usamos un archivo .db en la raíz del proyecto
export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  driver: 'expo',
  dbCredentials: {
    url: 'strain.db',
  },
  verbose: true,
  strict: true,
} satisfies Config;
