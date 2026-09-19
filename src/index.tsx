import { root } from '@lynx-js/react';

import { bootstrapDatabase } from '@db';

import { App } from './App.js';

/**
 * Composition root: siembra y publica los repos antes del primer render.
 *
 * El bootstrap ahora es asíncrono (abre el almacenamiento, compone, siembra el
 * catálogo y publica), así que el árbol recién se monta cuando la capa de datos
 * está lista. Al revés había carrera: los efectos de las pantallas corren pegados
 * al primer render y `getRepos()` lanza si todavía no se publicó. Sin módulo
 * nativo (tests, web) el storage es el respaldo en memoria; en el host, la siembra
 * espera a SQLite.
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
