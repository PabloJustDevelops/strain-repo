import { root } from '@lynx-js/react';

import { bootstrapDatabase } from '@db';

import { App } from './App.js';

/**
 * Composition root: publica los repos antes del primer render. `getRepos()`
 * lanza si la capa de datos no está inicializada, y los efectos de las pantallas
 * corren en el primer render; por eso no puede esperar a un `useEffect` de `App`.
 * `bootstrapDatabase()` no tiene `await` interno, así que publica los repos de
 * forma síncrona.
 */
bootstrapDatabase();

root.render(<App />);

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept();
}
