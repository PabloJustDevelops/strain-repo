import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const libEntry = fileURLToPath(
  new URL('./node_modules/react-use/lib/index.js', import.meta.url)
);
const libDir = fileURLToPath(new URL('./node_modules/react-use/lib', import.meta.url));

export default defineConfig({
  // Banderas que el plugin de ReactLynx inyecta al compilar y que acá no
  // existen. Los tests corren en el hilo de fondo (background), no en el de
  // layout (main thread), así que se fijan a los valores de ese lado.
  define: {
    __BACKGROUND__: 'true',
    __MAIN_THREAD__: 'false',
    __LEPUS__: 'false',
    __JS__: 'true',
    __DEV__: 'true',
    __PROFILE__: 'false',
    // Sin host no hay módulo nativo, así que el runner corre como un target de
    // preview: `getStorage()` usa el almacén efímero en vez de fallar (ver
    // `src/db/storage.ts`). La bandera de producción la fija `lynx.config.ts`.
    __PREVIEW_STORAGE__: 'true',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@db': fileURLToPath(new URL('./src/db', import.meta.url)),
      '@lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
      '@stores': fileURLToPath(new URL('./src/stores', import.meta.url)),
      '@types': fileURLToPath(new URL('./src/types', import.meta.url)),
      '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
      // `@lynx-js/react-use` (que usan los componentes de lynx-ui) importa
      // `react-use/esm/*`, un ESM con imports internos sin extensión que el
      // resolvedor de Node no entiende. Acá se redirige a su build CJS, que sí
      // resuelve. Es sólo para el runner de tests: el bundle de la app resuelve
      // el ESM sin problema.
      'react-use/esm': libDir,
      'react-use/lib': libDir,
      'react-use': libEntry,
    },
  },
  // El JSX de ReactLynx lo resuelve oxc a partir de `jsxImportSource` del
  // tsconfig. (`esbuild` no se configura: vitest 5 usa oxc y lo ignoraría.)
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    server: {
      // lynx-ui (y sus deps: react-use, gesture-runtime, motion) publica ESM y
      // rutas internas con imports sin extensión que el resolvedor de Node no
      // sabe seguir. Se procesa todo con vite: es la única forma de que el
      // registro de rutas, que importa pantallas con lynx-ui, cargue en Node.
      // Cuesta unos segundos más de runner; el bundle de la app no pasa por acá.
      deps: { inline: true },
    },
  },
});
