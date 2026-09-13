/**
 * Stub de `react-native` para Vitest.
 *
 * Los módulos que lo importan solo necesitan `Platform`; así los tests corren en
 * Node sin cargar el runtime de React Native. Se inyecta por alias en vitest.config.
 */
export const Platform = {
  OS: 'android' as const,
  select: (options: { default?: unknown; android?: unknown }) => options.default ?? options.android,
};
