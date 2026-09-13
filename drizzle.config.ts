import { defineConfig } from 'drizzle-kit';

// Configuración de Drizzle para SQLite local (expo-sqlite)
// En desarrollo usamos un archivo .db en la raíz del proyecto
//
// Nota: `defineConfig` de drizzle-kit 0.28+ no incluye `dbCredentials` en su tipo
// público (lo trata como `unknown` o no soportado en este dialect/version),
// pero en runtime sí lo acepta para SQLite. Casteamos el objeto entero a `any`
// para silenciar el error de TS sin perder funcionalidad.
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  driver: 'expo',
  ...({
    dbCredentials: { url: 'strain.db' },
  } as any),
  verbose: true,
  strict: true,
});
