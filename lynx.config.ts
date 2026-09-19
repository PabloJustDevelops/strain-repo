import { defineConfig } from '@lynx-js/rspeedy';
import { pluginReactLynx } from '@lynx-js/react-rsbuild-plugin';

/**
 * El modo preview del almacenamiento (`__PREVIEW_STORAGE__`) se declara aquí,
 * por entorno, para que ningún target sin módulo nativo caiga en un respaldo
 * silencioso (ticket 5 de `specs/001`):
 *
 * - `web`: **siempre** preview. Lynx for Web no puede registrar el módulo nativo
 *   del host, así que el almacén efímero es su único camino y se declara como tal.
 * - `lynx`: preview solo en desarrollo. `rspeedy dev` sirve el bundle al QR de
 *   Lynx Explorer, que tampoco tiene el módulo nativo; `rspeedy build` produce el
 *   bundle que embebe el APK del host, donde el almacén **tiene** que ser durable.
 *
 * Reparto documentado en `docs/12-entorno-desarrollo-lynx.md`.
 */
export default defineConfig(({ command }) => ({
  // `enableNewGesture` lo pide `@lynx-js/lynx-ui` para los componentes con
  // gesto (Sheet, SwipeAction, Sortable): sin esto, sus manejadores de arrastre
  // no se registran y el componente queda inerte.
  plugins: [pluginReactLynx({ enableNewGesture: true })],
  // Los dos targets del proyecto: `lynx` (bundle nativo para Lynx Explorer y el
  // emulador) y `web` (Lynx for Web, la página de desarrollo que sirve
  // `rspeedy dev` y que permite inspeccionar el DOM/CSS en el navegador).
  environments: {
    web: {
      source: {
        define: { __PREVIEW_STORAGE__: JSON.stringify(true) },
      },
    },
    lynx: {
      source: {
        define: { __PREVIEW_STORAGE__: JSON.stringify(command !== 'build') },
      },
    },
  },
  source: {
    entry: {
      main: './src/index.tsx',
    },
    // Alias equivalentes a los del tsconfig para que Rspeedy resuelva lo mismo.
    alias: {
      '@': './src',
      '@db': './src/db',
      '@components': './src/components',
      '@stores': './src/stores',
      '@lib': './src/lib',
      '@types': './src/types',
      '@assets': './src/assets',
    },
  },
}));
