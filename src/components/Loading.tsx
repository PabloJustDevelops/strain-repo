import { Text } from '@components/Text';

/** Nota de "cargando" para las pantallas que esperan datos de los repos. */
export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return (
    <Text role="support" tone="textSecondary">
      {label}
    </Text>
  );
}

/** Fallo explícito de una consulta, en vez de una pantalla vacía sin motivo. */
export function ErrorNote({ message }: { message: string }) {
  return (
    <Text role="support" tone="danger">
      {message}
    </Text>
  );
}
