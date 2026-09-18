import { useTheme } from '@lib/useTheme';

/** Nota de "cargando" para las pantallas que esperan datos de los repos. */
export function Loading({ label = 'Cargando…' }: { label?: string }) {
  const { colors } = useTheme();

  return (
    <text className="LoadingText" style={{ color: colors.textMuted }}>
      {label}
    </text>
  );
}

/** Fallo explícito de una consulta, en vez de una pantalla vacía sin motivo. */
export function ErrorNote({ message }: { message: string }) {
  const { colors } = useTheme();

  return (
    <text className="ErrorText" style={{ color: colors.danger }}>
      {message}
    </text>
  );
}
