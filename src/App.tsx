import { Shell } from '@components/Shell';
import { useTheme } from '@lib/useTheme';

import './App.css';

/**
 * Raíz de la app Lynx.
 *
 * Monta el `Shell` (router + tab bar) y pinta el fondo del `<page>` con el tema
 * activo. El bootstrap de la capa de datos ocurre antes del primer render, en
 * `index.tsx`.
 */
export function App() {
  const { colors } = useTheme();

  return (
    <page className="Page" style={{ backgroundColor: colors.bg }}>
      <Shell />
    </page>
  );
}
