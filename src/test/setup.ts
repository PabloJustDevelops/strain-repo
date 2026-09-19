import type { SystemInfo } from '@lynx-js/types';

/**
 * Globals del runtime de Lynx que no existen en el runner de tests.
 *
 * `@lynx-js/lynx-ui-common` lee `SystemInfo` al evaluar el módulo (para
 * `convertToPx`), así que importar cualquier componente de lynx-ui en Node
 * revienta sin este stub. En el dispositivo el global es real; acá sólo hace
 * falta que exista y tenga la forma que el motor declara.
 */

const globalScope = globalThis as typeof globalThis & { SystemInfo?: SystemInfo };

if (!globalScope.SystemInfo) {
  globalScope.SystemInfo = {
    lynxSdkVersion: '3.2',
    engineVersion: '3.2',
    osVersion: '15',
    pixelWidth: 390,
    pixelHeight: 844,
    pixelRatio: 3,
    platform: 'Android',
    runtimeType: 'v8',
  };
}
