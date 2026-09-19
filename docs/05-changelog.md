# 05 · Changelog

Formato: cronológico inverso (más reciente arriba).

> **Era Expo (hasta `2cd13f9` · etiqueta `expo-final`)**: las entradas anteriores al bloque siguiente
> describen la app **Expo + React Native**, que es **legado** y se retira por el
> [`specs/004`](../specs/004-reestructura-del-repo-y-retirada-de-expo.md). Se conservan **como pasado**,
> sin reescribirlas.

## Bloque 1 · SDD, documentación y skills — Lynx primero, Expo fuera

- **`specs/001`–`005`**: host nativo y almacenamiento durable; nativas (notificaciones y Health
  Connect); auth y cuenta con InsForge; reestructura del repo y retirada de Expo; y CI/CD. Cada spec
  con problema, alcance, decisiones, superficie, criterios medibles, riesgos, preguntas abiertas y
  tickets con bloqueos.
- **Etiqueta `expo-final`**: red de seguridad en el último commit con la app Expo intacta.
- **Skills**: fuera las seis de Expo, dentro las ocho oficiales de `lynx-community/skills` (rama
  `release`, commit `715f740`), con *allowlist* en `.gitignore` y `skills-lock.json`.
- **Documentación**: `docs/01`–`12`, índice, `CONTEXT.md`, `README.md` y `AGENTS.md` reescritos a la
  realidad Lynx; decisiones **D13** (retirada de Expo, con criterio de borrado) y **D14** (host nativo
  y almacenamiento durable).
- **Sin código de producto nuevo**: este bloque no implementa los specs ni refactoriza.

## Expo SDK 57 · chore(deps): subir expo a sdk 57

Subida de **Expo SDK 56 → 57** (React Native **0.85.3 → 0.86.3**) con el walkthrough oficial:
`pnpm add expo@~57.0.22` + `npx expo install --fix`. `npx expo-doctor` queda **21/21 limpio** y se
cierra el known-issue B.

- Alineadas todas las `expo-*`, `react-native`, `react-native-gesture-handler` (2.32.0),
  `react-native-reanimated` (4.5.1) y `react-native-worklets` (0.10.1).
- **Breaking change**: el plugin de Babel pasó a `react-native-worklets/plugin` (el de reanimated ya
  no existe en 4.5).
- **Breaking change**: `android.queries` dejó de ser válido en `app.json`; se quita.
- `eas-cli` sale del proyecto (expo-doctor lo pide) y los scripts `build:*` usan `npx eas-cli@latest`.
- Guardas de Expo Go intactas (`expo-constants` conserva `executionEnvironment`); los IDs siguen por
  `expo-crypto`, sin `nanoid`.
- Verificado: export web `Exported` (Metro/Babel OK), lint 0 errores + anti-slop 0, typecheck limpio,
  114/114 tests.

## `76f003c` · feat: Health Connect + compartir workout + migración a pnpm

**Health Connect (Android)**

- Instalado `react-native-health-connect@3.5.3` (paquete oficial; el `@kingstinct/...` referenciado en algunas guías **no existe en npm**).
- Permisos `android.permission.health.*` añadidos en `app.json` (READ/WRITE pasos, FC, calorías, distancia, sueño, peso, ejercicio).
- `queries` con `com.google.android.apps.healthdata` para detectar la app HC.
- Nuevo módulo [`src/lib/healthConnect.ts`](./../src/lib/healthConnect.ts) con:
  - `checkAvailability()` → SDK status (unavailable / notInstalled / installed).
  - `initializeClient()` y `requestPermissions()` (pasando unión de los 4 subtipos de `Permission`).
  - `getGrantedPermissions()` para refrescar UI tras cambio en settings.
  - `readTodayHealth(date)` → resumen diario (pasos, FC media/reposo, calorías activas/total, distancia, sueño).
  - `writeWorkoutSession(input)` → escribe sesión como `ExerciseType.WEIGHTLIFTING` (RESISTANCE_TRAINING no existe en v3.5.3).
  - `estimateCalories(volume, durationSeconds)` → fallback offline basado en met (sin HC).
- Nuevo [`src/stores/healthConnectStore.ts`](./../src/stores/healthConnectStore.ts) con máquina de estados `unknown | unavailable | needsInstall | notAuthorized | ready`, cache de 5 min vía `lastSyncedAt`.
- Nueva tab [`app/(tabs)/health.tsx`](./../app/(tabs)/health.tsx) con dashboard de 6 métricas, pull-to-refresh, auto-probe en `useEffect`.
- `finishWorkout` en [`src/stores/activeWorkoutStore.ts`](./../src/stores/activeWorkoutStore.ts) sincroniza automáticamente con HC si el status es `ready` (try/catch para no bloquear UX si HC falla).

**Compartir workout**

- Instalado `react-native-view-shot@5.1.0`.
- Nuevo [`src/components/WorkoutSummaryCard.tsx`](./../src/components/WorkoutSummaryCard.tsx) (360x540, brand "STRAIN", fecha, nombre, duración/series/volumen, top 3 ejercicios). `forwardRef<View>` con `collapsable={false}` para que ViewShot funcione.
- Nuevo [`src/lib/shareWorkout.ts`](./../src/lib/shareWorkout.ts) → `shareWorkout({ viewRef, session, caption, previewOnly })`. Flujo: captureRef PNG → copia a `cacheDirectory` → `expo-sharing` con fallback a `Share.share`.
- Nueva pantalla [`app/history/[id].tsx`](./../app/history/[id].tsx) con detalle de workout finalizado y botón "Compartir workout".

**Migración a pnpm**

- `package-lock.json` y `yarn.lock` añadidos a `.gitignore` (se mantiene `pnpm-lock.yaml`).
- Nuevo [`.npmrc`](./../.npmrc) con hoist patterns para Expo, react, types, eslint, prettier y **@babel/runtime** (este último fue clave — ver [06-problemas](./06-known-issues.md)).
- Nuevo [`pnpm-workspace.yaml`](./../pnpm-workspace.yaml) con `.` como único paquete.
- Lockfile regenerado con pnpm 11.5.1.

## `a77b645` · feat: supersets + RPE/notas + heatmap + notificaciones push

- **Supersets**: agrupar ejercicios para que se ejecuten en alternancia. UI con badge en `SetRow`.
- **RPE y notas por set**: escala 1–10 (Rate of Perceived Exertion) + textarea opcional. Persistido en `sets` (nuevas columnas `rpe`, `notes`).
- **Heatmap muscular**: componente [`src/components/Heatmap.tsx`](./../src/components/Heatmap.tsx) con SVG. Suma volumen por grupo muscular en ventana configurable.
- **Notificaciones push**: [`src/lib/notifications.ts`](./../src/lib/notifications.ts) + canal Android custom vía `expo-notifications`. Recordatorio diario opcional.

## `a12caad` · fix(assets): regenerar favicon.png con gradiente y 512x512

- Solucionado error de Play Store mostrando favicon antiguo en preview.

## `22667ef` · feat(assets): regenerar pack completo + quitar soporte iOS/Apple

- Quitada toda referencia a Apple/iOS (decisión Android-only).
- Regenerados icon.png, adaptive-icon.png, splash.png, favicon.png con la nueva brand.

## `1f0ae07` · feat(assets,ux,analytics,auth,import): completar funcionalidades pendientes

- Auth completo (login, signup, forgot) con Supabase.
- Import/Export JSON (`src/lib/exportImport.ts`) → backup completo del usuario en archivo descargable.
- Analytics locales: tracking de eventos UI en AsyncStorage (sin servidor).
- Mejoras UX en flow de workout: drag-to-reorder ejercicios, plate calculator sheet.

---

*Nota*: los commits previos a este dev session están en el historial de git pero no se documentan aquí por estar fuera del scope.