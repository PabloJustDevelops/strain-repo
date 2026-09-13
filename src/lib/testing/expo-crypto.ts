/**
 * Stub de `expo-crypto` para los tests (entorno node).
 *
 * El módulo real es nativo (`requireNativeModule('ExpoCrypto')`) y lanza al
 * importarse fuera de RN. Este stub es determinista y **no usa el global
 * `crypto`**, así los tests corren en node sin depender de él.
 */
let counter = 0;

export function randomUUID(): string {
  counter += 1;
  return `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`;
}

export function getRandomValues<T extends ArrayBufferView>(array: T): T {
  const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = (i * 31 + 7) % 256;
  }
  return array;
}
