/**
 * Sistema de diseño v2 de Strain en Lynx.
 *
 * Un único set de tokens para claro y oscuro, con nombres **por rol** y no por
 * apariencia: `accent` en vez de `blue`, `surfaceRaised` en vez de `#1C2230`.
 * Cambiar la marca es cambiar estos valores, no cada pantalla.
 *
 * Reglas del sistema (y por qué):
 * - **El acento es una acción, no un color decorativo.** Sólo la acción primaria
 *   de cada pantalla y lo seleccionado se pintan con `accent` (regla 60-30-10:
 *   nunca más del ~10% de la superficie). Ni el relleno de contenedores
 *   decorativos ni los enlaces secundarios.
 * - **Nada de tarjeta dentro de tarjeta.** Los elementos repetidos se pintan
 *   como **filas** separadas por una línea, no como cajas anidadas.
 * - **El color nunca comunica solo.** Todo estado lleva además texto o icono.
 * - **Neutros tintados, no gris puro.** Los oscuros llevan un croma mínimo hacia
 *   el azul de marca; el `#0a0a0a`/`#171717` plano es el look genérico que este
 *   sistema abandona.
 * - **Un solo tipo de borde, y es sutil.** Todos los bordes del sistema son 1px
 *   del mismo color (`border`), una línea de baja intensidad que agrupa sin
 *   encerrar. La jerarquía se resuelve con borde + elevación de superficie
 *   (`bg` < `surface` < `surfaceRaised`), sin sombras decorativas.
 * - **Espaciado y radios cerrados.** Sólo 4/8/16/24/36 y tres radios (control,
 *   contenedor, píldora). No hay valores sueltos tipo 10 o 14.
 * - **Toda longitud lleva unidad.** El motor de Lynx rechaza cualquier longitud
 *   distinta de 0 sin unidad (`CSS length need units (except 0)`), también en los
 *   estilos inline. Por eso ningún token de longitud se exporta como número
 *   suelto: lo serializa `px()` de una vez, y `type` (la escala tipográfica) es
 *   la única medida cruda porque ahí sí hay aritmética — su salida al motor pasa
 *   siempre por `typeStyle()` o por `Text`.
 * - **Contraste medido.** Texto ≥4.5:1 sobre el fondo en el que se usa; los
 *   números los comprueba `src/lib/theme.system.test.ts`.
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
  /** Separadores y bordes: una línea sutil, nunca un borde duro. */
  border: string;
  /** Texto principal: títulos, valores, lo que se lee primero. */
  textPrimary: string;
  /** Texto de apoyo: subtítulos, etiquetas, metadatos. */
  textSecondary: string;
  /** Acción primaria y selección. Nunca decorativo (regla 60-30-10). */
  accent: string;
  /** Texto e iconos sobre `accent`. */
  onAccent: string;
  success: string;
  warn: string;
  danger: string;
  /** Texto sobre una superficie de contraste opuesto (p. ej. peligro). */
  textInverse: string;
  /** Relleno suave del acento: chips, banners, fondos de énfasis. */
  accentSoft: string;
  /**
   * Alias de `border`, conservado para que las pantallas anteriores a la v2
   * sigan compilando sin tocarlas. La parte B las migra y esto se retira.
   */
  line: string;
  /** Alias de `warn`, por el mismo motivo que `line`. */
  warning: string;
}

/**
 * Tema oscuro (el de la marca).
 *
 * Neutros tintados hacia el azul de marca (hue ~215) con croma bajo. El acento
 * `#3B82F6` se mantiene: pasa 4.5:1 sobre las superficies oscuras. Sobre el
 * acento, el texto va oscuro (`onAccent`), no blanco.
 */
export const darkTheme: ThemeColors = {
  bg: '#0B0E13',
  surface: '#141922',
  surfaceRaised: '#1C2230',
  border: '#262E3B',
  textPrimary: '#EAF0F8',
  textSecondary: '#A9B6C9',
  accent: '#3B82F6',
  onAccent: '#0B0E13',
  success: '#34D399',
  warn: '#F59E0B',
  danger: '#F87171',
  textInverse: '#0B0E13',
  accentSoft: '#1D3357',
  line: '#262E3B',
  warning: '#F59E0B',
};

/**
 * Tema claro.
 *
 * El acento es el azul de marca oscurecido a `#1D4ED8`: el `#3B82F6` del tema
 * oscuro no llega a 4.5:1 sobre blanco y no se puede usar como texto ni como
 * relleno con texto blanco encima. Los semánticos también se oscurecen por el
 * mismo motivo.
 */
export const lightTheme: ThemeColors = {
  bg: '#F6F8FB',
  surface: '#FFFFFF',
  surfaceRaised: '#EDF2F9',
  border: '#D8DFEA',
  textPrimary: '#0F1723',
  textSecondary: '#4A5768',
  accent: '#1D4ED8',
  onAccent: '#FFFFFF',
  success: '#0F7A52',
  warn: '#9A6100',
  danger: '#C62B2B',
  textInverse: '#FFFFFF',
  accentSoft: '#DBEAFE',
  line: '#D8DFEA',
  warning: '#9A6100',
};

/**
 * Ritmo de espaciado: sólo 4/8/16/24/36.
 *
 * Cinco pasos bastan para separar dentro de un bloque, entre bloques y entre
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
  /** Entre bloques de una misma sección. */
  lg: px(24),
  /** Salto de sección. */
  xl: px(36),
} as const;

export type SpaceToken = keyof typeof space;

/** Los 6 pasos de la escala tipográfica, de menor a mayor. */
export const TYPE_SCALE = [12, 14, 16, 18, 22, 34] as const;

export type TypeRole = 'detail' | 'support' | 'body' | 'heading' | 'title' | 'display';

/** Escalón de pesos disponible (el CSS de Lynx sólo acepta estos literales). */
export type FontWeight = '400' | '500' | '600' | '700' | '800' | '900';

/**
 * Medida cruda de un paso tipográfico.
 *
 * Los números son a propósito: acá hay aritmética (compensación en oscuro,
 * orden de la escala) que no se puede hacer sobre `'16px'`. Nunca va directo a
 * un estilo: el borde al motor es `typeStyle()` o `Text`, que serializan con
 * `px()`.
 */
export interface TypeToken {
  fontSize: number;
  lineHeight: number;
  fontWeight: FontWeight;
}

/**
 * Escala tipográfica (medidas del tema claro).
 *
 * Seis pasos, cada uno con su línea y su peso: el consumidor elige el rol, no
 * los números. Jerarquía de una pantalla = como mucho tres roles a la vez.
 *
 * El orden del objeto va de menor a mayor: `Object.values(type)` es la escala
 * ascendente, y eso lo fija el test.
 */
export const type: Record<TypeRole, TypeToken> = {
  /** Detalle: metadatos, unidades, contadores. */
  detail: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  /** Apoyo: etiquetas y descripciones cortas. */
  support: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  /** Cuerpo: el texto que se lee de corrido. */
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  /** Encabezado: título de bloque o de sección. */
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  /** Título: cabecera de pantalla. */
  title: { fontSize: 22, lineHeight: 28, fontWeight: '600' },
  /** Display: cifra o titular protagonista. */
  display: { fontSize: 34, lineHeight: 40, fontWeight: '700' },
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

/** Tres radios y sólo tres: control, contenedor y píldora. Ya en `px`. */
export const radius = {
  /** Controles: botones, inputs, elementos repetidos. */
  control: px(8),
  /** Contenedores: tarjetas, hojas, barras. */
  container: px(12),
  /** Píldora: chips y todo lo que ya es redondo. */
  pill: px(999),
} as const;

export type RadiusToken = keyof typeof radius;

/**
 * Un único grosor de borde en todo el sistema.
 *
 * Es un grosor, no una longitud de layout: se queda como número porque sólo se
 * usa en clases CSS (`border-width: 1px`), nunca en un estilo inline.
 */
export const BORDER_WIDTH = px(1);

/** Área táctil mínima (pt). Se aplica a todo lo que responde a un toque. */
export const TOUCH_TARGET = px(44);

/**
 * Movimiento: dos duraciones, una única curva de salida y el estado pulsado.
 *
 * Se animan sólo `transform` y `opacity` (lo que el motor puede componer sin
 * re-layout). La curva es una salida suave, la misma en toda la app. Las
 * duraciones son números porque son milisegundos de una animación —no
 * longitudes de layout— y así los consume el motor.
 */
export const motion = {
  /** Cambios inmediatos: realce de un toque, opacidad de un chip. */
  fast: 100,
  /** Transiciones de estado: aparición, cambio de selección. */
  base: 150,
  easing: 'cubic-bezier(0.2, 0, 0, 1)',
  /**
   * Receta del estado pulsado. Un toque no cambia el layout: baja la opacidad
   * y encoge apenas. Los dos valores juntos se leen como "presionado" sin que
   * el contenido se mueva de sitio.
   */
  pressed: {
    opacity: 0.6,
    scale: 0.98,
  },
} as const;

/** Estilo del estado pulsado, listo para mezclar con el resto del estilo. */
export interface PressedStyle {
  opacity: number;
  transform: string;
}

/**
 * Estilo del estado pulsado de cualquier superficie tocable.
 *
 * Existe como función —y no como clase CSS— porque el estado es dinámico y el
 * CSS de Lynx es estático: el componente guarda el flag y aplica la receta.
 */
export function pressedStyle(pressed: boolean): PressedStyle {
  return {
    opacity: pressed ? motion.pressed.opacity : 1,
    transform: pressed ? `scale(${motion.pressed.scale})` : 'scale(1)',
  };
}

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
