import { usePreferences } from '@stores/preferencesStore';
import { darkTheme, lightTheme, type ThemeColors } from './theme';

/**
 * Resuelve el tema activo (claro/oscuro) según la preferencia del usuario.
 *
 * En la app anterior se cruzaba con `useColorScheme()` del sistema. En Lynx el tema del
 * sistema se lee de `lynx.getJSModule` / SystemInfo cuando haya native module;
 * por ahora `system` cae a oscuro (el tema por defecto de la marca Strain).
 * Centralizado aquí para que activar el tema del sistema más tarde sea un
 * cambio de una línea, no de cada pantalla.
 */
export function useTheme(): { colors: ThemeColors; isDark: boolean } {
  const themeMode = usePreferences((s) => s.themeMode);

  // TODO(native): leer el esquema del sistema cuando exista el bridge.
  const systemIsDark = true;
  const isDark = themeMode === 'system' ? systemIsDark : themeMode === 'dark';

  return { colors: isDark ? darkTheme : lightTheme, isDark };
}
