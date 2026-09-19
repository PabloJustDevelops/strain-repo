import { defineConfig } from '@lynx-js/rspeedy';
import { pluginReactLynx } from '@lynx-js/react-rsbuild-plugin';

export default defineConfig({
  // `enableNewGesture` lo pide `@lynx-js/lynx-ui` para los componentes con
  // gesto (Sheet, SwipeAction, Sortable): sin esto, sus manejadores de arrastre
  // no se registran y el componente queda inerte.
  plugins: [pluginReactLynx({ enableNewGesture: true })],
  // Los dos targets del proyecto: `lynx` (bundle nativo para Lynx Explorer y el
  // emulador) y `web` (Lynx for Web, la página de desarrollo que sirve
  // `rspeedy dev` y que permite inspeccionar el DOM/CSS en el navegador).
  environments: {
    web: {},
    lynx: {},
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
});
