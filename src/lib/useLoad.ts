import { useEffect, useState } from '@lynx-js/react';

/**
 * Carga datos asíncronos una sola vez, al montar la pantalla.
 *
 * Las seis pestañas comparten el mismo patrón —pedir a los repos y pintar tres
 * estados (cargando / vacío / datos)—, así que la parte repetida vive acá y cada
 * pantalla se queda con su consulta concreta.
 *
 * `load` se ejecuta una única vez (`[]` como dependencias): la identidad de la
 * función cambia en cada render y usarla como dependencia re-dispararía el
 * efecto en bucle.
 */
export interface LoadState<T> {
  /** `true` hasta que la promesa se resuelve (con éxito o con error). */
  loading: boolean;
  data: T;
  /** Mensaje del fallo, o `null`. La UI decide si lo muestra. */
  error: string | null;
}

export function useLoad<T>(initial: T, load: () => Promise<T>): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>({
    loading: true,
    data: initial,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    load().then(
      (data) => {
        if (!cancelled) setState({ loading: false, data, error: null });
      },
      (err) => {
        if (!cancelled) setState({ loading: false, data: initial, error: String(err) });
      },
    );

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
