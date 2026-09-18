/**
 * Definición del tema Strain (portado de la app Expo).
 * Soporta modo claro y oscuro con un único set de tokens.
 * En Lynx los tokens numéricos se interpretan como px en el motor de layout.
 */

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  text: string;
  textMuted: string;
  textInverse: string;
  primary: string;
  primaryMuted: string;
  success: string;
  warning: string;
  danger: string;
  completed: string;
}

export const lightTheme: ThemeColors = {
  background: '#fafafa',
  surface: '#ffffff',
  surfaceElevated: '#ffffff',
  border: '#e5e5e5',
  text: '#0a0a0a',
  textMuted: '#737373',
  textInverse: '#ffffff',
  primary: '#3b82f6',
  primaryMuted: '#dbeafe',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  completed: '#22c55e',
};

export const darkTheme: ThemeColors = {
  background: '#0a0a0a',
  surface: '#171717',
  surfaceElevated: '#262626',
  border: '#262626',
  text: '#fafafa',
  textMuted: '#a3a3a3',
  textInverse: '#0a0a0a',
  primary: '#3b82f6',
  primaryMuted: '#1e3a8a',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  completed: '#22c55e',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 36,
};

/**
 * El mismo color con alfa, como `rgba(...)`.
 *
 * El tema guarda hex de 6 dígitos y el CSS de Lynx no acepta el hex de 8 (`#rrggbbaa`)
 * que usa la app Expo: acá se pasa a `rgba` explícito. Si el hex no se entiende,
 * devuelve el original en vez de un color roto.
 */
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;

  if (full.length !== 6) return hex;

  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);

  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return hex;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
