/**
 * Clave de React con namespace, para remontar un componente.
 *
 * Evita la colisión clásica de la clave de reserva: si dos hermanos usan el
 * mismo literal (p. ej. `'none'`) cuando están cerrados, React avisa "two
 * children with the same key". Con namespace, dos componentes distintos nunca
 * pueden coincidir, ni siquiera cerrados.
 */
export function remountKey(namespace: string, id?: string | number | null): string {
  return id === undefined || id === null || id === '' ? `${namespace}-closed` : `${namespace}-${id}`;
}
