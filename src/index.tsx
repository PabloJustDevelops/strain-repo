import { root } from '@lynx-js/react';

import { bootstrapDatabase } from '@db';
import { isPreviewStorage } from '@db/storage';

console.log('[strain-debug] preview=' + isPreviewStorage());

import { App } from './App.js';

/**
 * Composition root: siembra y publica los repos antes del primer render.
 *
 * El bootstrap ahora es asíncrono (abre el almacenamiento, compone, siembra el
 * catálogo y publica), así que el árbol recién se monta cuando la capa de datos
 * está lista. Al revés había carrera: los efectos de las pantallas corren pegados
 * al primer render y `getRepos()` lanza si todavía no se publicó. En el host la
 * siembra espera a SQLite; en un build de preview (web o Lynx Explorer) usa el
 * almacén efímero declarado, y en cualquier otro caso sin módulo nativo falla.
 *
 * Un fallo del bootstrap no se traga: se registra con su causa.
 */
bootstrapDatabase().then(
  () => root.render(<App />),
  (err) => {
    console.error('[strain] No se pudo inicializar la capa de datos:', err);
  },
);

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept();
}
