# 02 · Stack tecnológico

## Core

| Capa | Tecnología | Por qué |
|------|------------|---------|
| Framework | **Expo SDK 52** + React Native 0.76 | New architecture habilitada, ecosistema maduro, EAS para builds |
| Router | **expo-router 4** | File-based routing, deep linking nativo, typed routes |
| Lenguaje | **TypeScript 5.3** (strict) | Type safety en todo el dominio |
| Estado | **Zustand 5** | Stores pequeños, sin boilerplate, persistencia con AsyncStorage |

## Datos

| Capa | Tecnología | Por qué |
|------|------------|---------|
| DB local | **expo-sqlite 15** + Drizzle ORM | SQL real, migrations versionadas, type-safe queries |
| Migrations | **Sistema propio** (`src/db/migrations.ts`) | Array numerado, ejecuta en orden, idempotente |
| Sync opcional | **Supabase** | Auth + Postgres cloud para backup multi-device |
| Persistencia stores | **AsyncStorage** | Suficiente para preferencias y caches ligeras |

## UI

| Capa | Tecnología | Por qué |
|------|------------|---------|
| Estilos | **StyleSheet nativo** + theme tokens | Sin dependencias pesadas, theme centralizado en `src/lib/theme.ts` |
| Iconos | **@expo/vector-icons** (Ionicons) | Set gigante, tree-shakeable |
| Charts | **react-native-chart-kit** + **victory-native** | Heatmap custom con SVG |
| Gestos | **react-native-gesture-handler** + **reanimated 3** | Drag-and-drop en reordenación de ejercicios |
| Listas | **FlatList** estándar + draggable-flatlist | Suficiente para el tamaño de las colecciones |

## Integraciones

| Feature | Paquete | Notas |
|---------|---------|-------|
| Health Connect | **react-native-health-connect 3.5.3** | Único paquete oficial mantenido en npm (`@kingstinct/...` no existe) |
| Notificaciones | **expo-notifications 0.29** | Canal Android custom, recordatorios de workout |
| Compartir workout | **react-native-view-shot 5.1** + **expo-sharing 13** | Captura de la card resumen, fallback a `Share.share` |
| Document picker | **expo-document-picker 13** | Importar/exportar backups JSON |
| Auth | **expo-auth-session** + Supabase | OAuth y email/password |
| Haptics | **expo-haptics 14** | Feedback en PRs y fin de serie |

## Tooling

| Herramienta | Uso |
|-------------|-----|
| **pnpm 11.5.1** | Package manager (migrado desde npm — ver [07](./07-decisions.md)) |
| **drizzle-kit 0.28** | Generar SQL desde el schema TS |
| **eas-cli 14** | Builds remotos y OTA |
| **tsx** | Ejecutar scripts `.ts` (migrate, seed) |
| **ESLint + eslint-config-expo** | Lint |
| **TypeScript --noEmit** | Typecheck en CI |

## No usamos (deliberadamente)

- **Redux/MobX** → Zustand cubre todo con menos código.
- **Tailwind/NativeWind** → StyleSheet nativo + tokens es suficiente y más rápido.
- **i18n libraries** → La app es solo en español por ahora.
- **Storybook** → El componente set es pequeño y estable.
- **Jest** para unit tests → Pendiente decidir entre Jest/Vitest; ahora sin tests.