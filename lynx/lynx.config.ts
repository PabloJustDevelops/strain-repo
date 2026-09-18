import { defineConfig } from '@lynx-js/rspeedy';
import { pluginReactLynx } from '@lynx-js/react-rsbuild-plugin';

export default defineConfig({
  // `enableNewGesture` lo pide `@lynx-js/lynx-ui` para los componentes con
  // gesto (Sheet, SwipeAction, Sortable): sin esto, sus manejadores de arrastre
  // no se registran y el componente queda inerte.
  plugins: [pluginReactLynx({ enableNewGesture: true })],
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
