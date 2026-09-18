/**
 * Sistema de diseño de Strain en Lynx.
 *
 * Un único set de tokens para claro y oscuro, con nombres **por rol** y no por
 * apariencia: `accent` en vez de `blue`, `surfaceRaised` en vez de `#262626`.
 * Cambiar la marca es cambiar estos valores, no cada pantalla.
 *
 * Reglas del sistema (y por qué):
 * - **El acento es una acción, no un color decorativo.** Sólo la acción primaria
 *   de cada pantalla se pinta con `accent` (regla 60-30-10: nunca más del ~10%
 *   de la superficie). Los valores numéricos y los enlaces secundarios usan
 *   `textPrimary`, no `accent`.
 * - **Neutros tintados, no gris puro.** Los oscuros llevan un croma mínimo hacia
 *   el azul de marca; el `#0a0a0a`/`#171717` plano es el look genérico que este
 *   sistema abandona.
 * - **Un solo tipo de borde.** Todos los bordes del sistema son 1px del mismo
 *   color (`line`), que mide ≥3:1 sobre `surface`, `bg` y `surfaceRaised`. Sin
 *   sombras decorativas: la jerarquía se resuelve con borde + elevación de
 *   superficie (`bg` < `surface` < `surfaceRaised`).
 * - **Espaciado y radios cerrados.** Sólo múltiplos de 4/8/16/36 y tres radios
 *   (chip, control, tarjeta). No hay valores sueltos tipo 10 o 14.
 * - **Toda longitud lleva unidad.** El motor de Lynx rechaza cualquier longitud
 *   distinta de 0 sin unidad (`CSS length need units (except 0)`), también en los
 *   estilos inline. Por eso ningún token de longitud se exporta como número
 *   suelto: lo serializa `px()` de una vez, y `type` (la escala tipográfica) es
 *   la única medida cruda porque ahí sí hay aritmética — su salida al motor pasa
 *   siempre por `typeStyle()`.
 * - **Contraste medido.** Texto ≥4.5:1 e iconos/bordes ≥3:1 en ambos temas; los
 *   números están en `lynx/README.md` y los comprueba `src/lib/contrast.test.ts`.
 */

/**
 * Serializa una longitud para el motor de Lynx.
 *
 * Es el único camino de un número a un estilo: Lynx exige unidad en toda
 * longitud distinta de 0, y acepta `0` desnudo. Devolver el número tal cual
 * rompe el render con `CSS length need units (except 0)`.
 */
export function px(value: number): string {
  return value === 0 ? '0' : `${value}px`;
}

/** Tokens de color por rol. Los consumidores usan el rol, nunca el hex. */
export interface ThemeColors {
  /** Fondo de la app, detrás de todas las superficies. */
  bg: string;
  /** Superficie base: tarjetas, hojas, barras. */
  surface: string;
  /** Un nivel por encima de `surface` (hojas, controles, elementos activos). */
  surfaceRaised: string;
  /** Separadores y bordes. Un único grosor en todo el sistema. */
  line: string;
  /** Texto principal: títulos, valores, lo que se lee primero. */
  textPrimary: string;
  /** Texto de apoyo: subtítulos, etiquetas, metadatos. */
  textSecondary: string;
  /** Texto sobre `accent` o sobre una superficie oscura/clara opuesta. */
  textInverse: string;
  /** Acción primaria. Nunca decorativo (regla 60-30-10). */
  accent: string;
  /** Relleno suave del acento: chips, banners, fondos de énfasis. */
  accentSoft: string;
  /** Texto e iconos sobre `accent`. */
  onAccent: string;
  success: string;
  warning: string;
  danger: string;
}

/**
 * Tema claro.
 *
 * El acento es el azul de marca oscurecido a `#1d4ed8`: el `#3b82f6` original
 * no llega a 4.5:1 sobre blanco (3.68:1) y no se puede usar como texto ni como
 * relleno con texto blanco encima.
 */
export const lightTheme: ThemeColors = {
  bg: '#f6f8fb',
  surface: '#ffffff',
  surfaceRaised: '#edf2f9',
  line: '#7b8496',
  textPrimary: '#0e1726',
  textSecondary: '#556577',
  textInverse: '#ffffff',
  accent: '#1d4ed8',
  accentSoft: '#dbeafe',
  onAccent: '#ffffff',
  success: '#0f7a52',
  warning: '#9a6100',
  danger: '#c62b2b',
};

/**
 * Tema oscuro.
 *
 * Neutros tintados hacia el azul de marca (hue ~215) con croma bajo; el acento
 * se aclara a `#60a5fa` para pasar 4.5:1 sobre las superficies oscuras. Sobre
 * el acento claro, el texto va oscuro (`onAccent`), no blanco.
 */
export const darkTheme: ThemeColors = {
  bg: '#0b1017',
  surface: '#131a24',
  surfaceRaised: '#1b2430',
  line: '#64758a',
  textPrimary: '#eef2f8',
  textSecondary: '#a8b8ca',
  textInverse: '#0b1017',
  accent: '#60a5fa',
  accentSoft: '#16304f',
  onAccent: '#08131f',
  success: '#34d399',
  warning: '#fbbf24',
  danger: '#f87171',
};

/**
 * Ritmo de espaciado: sólo 4/8/16/36.
 *
 * Cuatro pasos bastan para separar dentro de un bloque, entre bloques y entre
 * secciones. Cualquier otro valor es una decisión suelta que no debe existir.
 * Salen ya serializados con `px`, listos para el motor.
 */
export const space = {
  /** Dentro de un bloque (icono ↔ texto, chips). */
  xs: px(4),
  /** Separación corta (filas, elementos de un grupo). */
  sm: px(8),
  /** Separación estándar (padding de tarjeta, entre bloques). */
  md: px(16),
  /** Salto de sección. */
  lg: px(36),
} as const;

export type SpaceToken = keyof typeof space;

/** Los 5 pasos de la escala tipográfica. */
export const TYPE_SCALE = [13, 15, 17, 22, 28] as const;

export type TypeRole = 'detail' | 'support' | 'title' | 'heading' | 'display';

/** Escalón de pesos disponible (el CSS de Lynx sólo acepta estos literales). */
export type FontWeight = '400' | '500' | '600' | '700' | '800' | '900';

/**
 * Medida cruda de un paso tipográfico.
 *
 * Los números son a propósito: acá hay aritmética (compensación en oscuro,
 * orden de la escala) que no se puede hacer sobre `'13px'`. Nunca va directo a
 * un estilo: el borde al motor es `typeStyle()`, que serializa con `px()`.
 */
export interface TypeToken {
  fontSize: number;
  lineHeight: number;
  fontWeight: FontWeight;
}

/**
 * Escala tipográfica (medidas del tema claro).
 *
 * Cinco pasos, cada uno con su línea y su peso: el consumidor elige el rol, no
 * los números. Jerarquía de una pantalla = como mucho tres roles a la vez
 * (título, apoyo, detalle).
 */
export const type: Record<TypeRole, TypeToken> = {
  /** Detalle: metadatos, unidades, contadores. */
  detail: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  /** Apoyo: cuerpo de texto y descripciones. */
  support: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  /** Título: cabecera de bloque o de fila. */
  title: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  /** Encabezado: título de pantalla. */
  heading: { fontSize: 22, lineHeight: 30, fontWeight: '700' },
  /** Display: cifra o titular protagonista. */
  display: { fontSize: 28, lineHeight: 34, fontWeight: '800' },
};

/** Escalón de pesos, para bajar un paso sin inventar un peso intermedio. */
const WEIGHT_LADDER: readonly FontWeight[] = ['400', '500', '600', '700', '800', '900'];

function lighterWeight(weight: FontWeight): FontWeight {
  const index = WEIGHT_LADDER.indexOf(weight);

  return index > 0 ? WEIGHT_LADDER[index - 1] : weight;
}

/** Estilo tipográfico listo para el motor: longitudes ya serializadas con `px`. */
export interface TypeStyle {
  fontSize: string;
  lineHeight: string;
  fontWeight: FontWeight;
}

/**
 * Estilo tipográfico de un rol, con la compensación del modo oscuro.
 *
 * En oscuro el texto claro sobre fondo oscuro "engorda" ópticamente: se suma
 * interlineado (+2) y se baja un escalón de peso, nunca por debajo de 400 (el
 * cuerpo no adelgaza; un 300 sobre fondo oscuro se lee peor, no mejor). Sin
 * esto, el tema oscuro se ve más apretado y más pesado que el claro con los
 * mismos tokens.
 *
 * Es el borde por el que la escala tipográfica (números) llega al motor: acá
 * `px()` serializa `fontSize` y `lineHeight`, así `Text` nunca recibe un número.
 */
export function typeStyle(role: TypeRole, isDark: boolean): TypeStyle {
  const base = type[role];
  const lineHeight = isDark ? base.lineHeight + 2 : base.lineHeight;
  const fontWeight = isDark ? lighterWeight(base.fontWeight) : base.fontWeight;

  return { fontSize: px(base.fontSize), lineHeight: px(lineHeight), fontWeight };
}

/** Tres radios y sólo tres: chip (píldora), control, tarjeta. Ya en `px`. */
export const radius = {
  chip: px(999),
  control: px(10),
  card: px(14),
} as const;

export type RadiusToken = keyof typeof radius;

/** Un único grosor de borde en todo el sistema. */
export const BORDER_WIDTH = px(1);

/** Área táctil mínima (pt). Se aplica a todo lo que responde a un toque. */
export const TOUCH_TARGET = px(44);

/**
 * Movimiento: tres duraciones y una única curva de salida.
 *
 * Se animan sólo `transform` y `opacity` (lo que el motor puede componer sin
 * re-layout). La curva es una salida suave, la misma en toda la app.
 */
export const motion = {
  fast: 120,
  base: 200,
  slow: 320,
  easing: 'cubic-bezier(0.2, 0, 0, 1)',
} as const;

/**
 * El mismo color con alfa, como `rgba(...)`.
 *
 * El CSS de Lynx no acepta el hex de 8 dígitos (`#rrggbbaa`) que usa la app
 * Expo: todo color con transparencia pasa a `rgba` explícito. Si el hex no se
 * entiende, devuelve el original en vez de un color roto.
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
