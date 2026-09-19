import { px } from '@lib/theme';
import { useTheme } from '@lib/useTheme';
import type { TextTone } from '@components/Text';

/**
 * Set de iconos propio, dibujado como SVG inline.
 *
 * Existe porque los iconos de esta app venían siendo glifos de texto (`‹`, `✓`,
 * `⋯`): dependen de la fuente del sistema, salen con pesos y alineaciones
 * distintos en cada plataforma y no hay forma de darles un trazo consistente.
 * Acá cada icono es un trazo de 2px sobre una caja de 24, con el mismo remate
 * redondeado, y el color lo resuelve `currentColor`.
 *
 * En Lynx un `<svg>` no lleva hijos: recibe el documento SVG como texto en
 * `content`, y `current-color` resuelve el `currentColor` del documento. Por eso
 * `iconSvg()` arma el documento como string — y por eso es una función pura que
 * se puede testear sin renderizar nada.
 */

export type IconName =
  | 'home'
  | 'chevron'
  | 'chevronRight'
  | 'plus'
  | 'check'
  | 'clock'
  | 'streak'
  | 'list'
  | 'dumbbell'
  | 'chart'
  | 'heart'
  | 'search'
  | 'settings';

/** Todo nombre que el set sabe dibujar. El test lo recorre completo. */
export const ICON_NAMES: readonly IconName[] = [
  'home',
  'chevron',
  'chevronRight',
  'plus',
  'check',
  'clock',
  'streak',
  'list',
  'dumbbell',
  'chart',
  'heart',
  'search',
  'settings',
];

/** Grosor del trazo, igual en todo el set. */
export const ICON_STROKE = 2;

/** Lado de la caja de dibujo. Todos los iconos están trazados ahí. */
export const ICON_VIEWBOX = 24;

/** Trazado interior de cada icono, en la caja de 24. */
const ICONS: Record<IconName, string> = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5"/>',
  chevron: '<path d="M15 5 8 12l7 7"/>',
  chevronRight: '<path d="M9 5l7 7-7 7"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  check: '<path d="M5 13l4 4L19 7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.5l3.5 2"/>',
  streak:
    '<path d="M12 3c3.2 4.2 5 6.4 5 9.2A5 5 0 0 1 7 12.2c0-1.6.6-2.9 1.6-4.1.2 1.3 1 2.2 2 2.5C10.4 8.2 11 5.6 12 3z"/>',
  list:
    '<path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><path d="M4.5 6h.01"/><path d="M4.5 12h.01"/><path d="M4.5 18h.01"/>',
  dumbbell:
    '<path d="M7 7v10"/><path d="M4 9.5v5"/><path d="M17 7v10"/><path d="M20 9.5v5"/><path d="M7 12h10"/>',
  chart: '<path d="M4 20V9"/><path d="M10 20V4"/><path d="M16 20v-6"/><path d="M3 20h18"/>',
  heart:
    '<path d="M12 20C12 20 5 15.6 5 10.7A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7 3.7C19 15.6 12 20 12 20z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M16 16 21 21"/>',
  settings:
    '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
};

/**
 * Documento SVG de un icono, listo para el `content` de `<svg>`.
 *
 * `currentColor` deja el color en manos de quien lo pinta: el componente lo
 * resuelve con el token `current-color`, así el mismo documento sirve para
 * todos los temas.
 */
export function iconSvg(name: IconName): string {
  const body = ICONS[name];

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ICON_VIEWBOX} ${ICON_VIEWBOX}"`,
    ` fill="none" stroke="currentColor" stroke-width="${ICON_STROKE}"`,
    ` stroke-linecap="round" stroke-linejoin="round">${body}</svg>`,
  ].join('');
}

interface IconProps {
  name: IconName;
  /** Lado del icono, en pt. El área táctil la resuelve el contenedor. */
  size?: number;
  /** Rol de color del trazo. */
  tone?: TextTone;
  /** Clases de layout (no de color ni de tamaño). */
  className?: string;
}

/**
 * Icono del sistema.
 *
 * El color sale del tema, nunca del hex del llamador: un icono es texto que no
 * se lee, así que obedece las mismas reglas de contraste que el texto.
 */
export function Icon({ name, size = ICON_VIEWBOX, tone = 'textSecondary', className }: IconProps) {
  const { colors } = useTheme();

  return (
    <svg
      className={className}
      style={{ width: px(size), height: px(size) }}
      content={iconSvg(name)}
      current-color={colors[tone]}
    />
  );
}
