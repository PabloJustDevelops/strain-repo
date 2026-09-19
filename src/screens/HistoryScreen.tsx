import { HistoryList } from '@components/HistoryList';
import { Screen } from '@components/Screen';

/**
 * Pantalla de historial.
 *
 * Dejó de ser pestaña en la v2: la lista se lee dentro de Progreso, como bloque.
 * La pantalla se queda porque `history/[id]` sigue existiendo y porque el
 * historial completo necesita un sitio al que entrar directo; el contenido es el
 * mismo bloque, así que no hay dos listas que puedan divergir.
 */
export function HistoryScreen() {
  return (
    <Screen title="Historial">
      <HistoryList />
    </Screen>
  );
}
