# 07 · Decisiones técnicas

Documento de registro de decisiones (ADR-light). Cada decisión explica **qué**, **por qué** y **qué se descartó**.

---

## D1 · Android-only

**Decisión**: la app no se publica para iOS. El desarrollo y los builds de EAS son solo Android.

**Por qué**:

- Health Connect es Android-only (Google). Toda la capa de salud es 100% Android.
- Mantener iOS implica polyfills extra, revisar cada release de Expo por cambios en iOS, y el público objetivo ya está en Android.
- Coste de mantenimiento > valor añadido (los usuarios de fitness serio en iOS ya tienen Strong/Hevy).

**Descartado**: React Native New Architecture habilitada, pero seguimos sin soporte iOS. Si en el futuro se justifica, el código está limpio para añadirlo.

**Trade-off**: se pierde ~30% del mercado smartphone potencial.

---

## D2 · pnpm como package manager

**Decisión**: usar pnpm 11.5.1 (antes npm).

**Por qué**:

- Lockfile más rápido y estricto (`strict-peer-dependencies=false` para no romper con peers de Expo).
- Hoisting selectivo: solo Expo, React, types, eslint, prettier, babel-runtime. El resto queda aislado → menos surprises y menos "funciona en local, peta en CI".
- `auto-install-peers=true` ahorra tener que añadir peers manualmente.
- `resolution-mode=highest` coge la última versión disponible dentro del rango (controlado: lo que esté fuera del rango NO se toca).

**Descartado**: yarn (más lento, menos estricto), bun (todavía verde para RN), npm (legacy).

**Setup**: ver [08-setup](./08-setup.md).

---

## D3 · SQLite local con Drizzle + sync opcional Supabase

**Decisión**: SQLite on-device como fuente de verdad; Supabase solo para backup y multi-device.

**Por qué**:

- "Offline-first" es principio de producto (ver [01](./01-overview.md)). La app debe funcionar sin red.
- Drizzle da type-safety sin sacrificar SQL real (no es ORM opaco).
- Migrations versionadas en array numerado, ejecutables con `tsx scripts/migrate.ts`.
- Supabase entra solo cuando el usuario decide hacer login → backup en la nube. No rompe offline.

**Descartado**:

- WatermelonDB → opaco, magia interna difícil de debuggear.
- Firebase Firestore → NoSQL complica queries analíticas (PRs, volumen semanal).
- Realm → discontinuado en RN moderno.

---

## D4 · Zustand para estado global

**Decisión**: Zustand 5 para todos los stores globales.

**Por qué**:

- API mínima, sin providers ni boilerplate.
- Persistencia built-in vía `createJSONStorage(() => AsyncStorage)`.
- Stores independientes (`activeWorkout`, `auth`, `healthConnect`, `preferences`) → cada uno con su responsabilidad.

**Descartado**: Redux Toolkit (sobreingeniería para 4 stores), MobX (requiere decorators), React Context (re-renders innecesarios en árboles profundos).

---

## D5 · Health Connect = `react-native-health-connect` (no `@kingstinct/...`)

**Decisión**: instalar `react-native-health-connect@3.5.3` (paquete de `matinzd`).

**Por qué**:

- El paquete `@kingstinct/react-native-health-connect` que aparece en varias guías **no existe en el registry npm**. Es una confusión común de la comunidad.
- El paquete oficial lo mantiene `matinzd`, actualizado a SDK 52.
- API limpia: `initialize()`, `requestPermission()`, `readRecords()`, `insertRecords()`.

**Descartado**: `expo-health-connect` (no maintained para SDK 52), implementación manual del bridge nativo (coste > valor).

---

## D6 · Compartir workout con `react-native-view-shot` + `expo-sharing`

**Decisión**: capturar la `WorkoutSummaryCard` como PNG y compartir vía `expo-sharing`.

**Por qué**:

- `react-native-view-shot` captura cualquier `<View>` (con `collapsable={false}`) sin renderizar pantalla completa.
- `expo-sharing` abre el diálogo nativo de Android (compatible con todas las apps de share).
- Fallback a `Share.share` de React Native si expo-sharing falla.
- Tamaño de card fijo 360x540 → ratio consistente en cualquier red social.

**Descartado**:

- `@react-native-community/blur` para fondo → no aplica, queremos imagen limpia.
- Generar PDF → más pesado y menos compartible.
- Capturar pantalla completa → incluye UI, no solo el resumen.

---

## D7 · Alias de paths en TS + Metro

**Decisión**:

- TS: `@/*` → `./src/*` (configurado en `tsconfig.json`).
- Metro: replicado en `metro.config.js` con `context.resolveRequest` para soporte web.

**Por qué**:

- Imports limpios: `import { Button } from '@/components/Button'` en vez de `../../../components/Button`.
- TS ya los resuelve vía `tsconfig.experiments.tsconfigPaths`. Metro necesita su propio resolver para web.

**Cuidado**:

- `@types/*` solapa con el namespace de TypeScript. Migrado a `@/types/domain`.
- En Metro, el resolver DEBE usar `context.resolveRequest(context, moduleName, platform)`. Usar `config.resolver.resolveRequest` o `options.resolveRequest` causa recursión infinita o error.

---

## D8 · Sin tests todavía

**Decisión consciente**: posponer tests hasta tener features estables.

**Por qué**:

- El producto ha cambiado de forma varias veces; tests atarían decisiones que podrían revertirse.
- La capa crítica (repositories, stores) está pidiendo tests ya (ver [06-problemas](./06-known-issues.md)).
- Próximo paso: Vitest + `@testing-library/react-native` para stores, Playwright E2E para flow completo.

**Descartado**: Jest (más lento de configurar en RN moderno).

---

## D9 · Tema visual: tokens centralizados en `src/lib/theme.ts`

**Decisión**: colores, espaciados, tipografías y radios centralizados; StyleSheet nativo en componentes.

**Por qué**:

- Sin NativeWind/Tailwind: menos dependencias, build más rápido.
- Cambiar tema (claro/oscuro) es trivial: leer `useColorScheme()` y exponer `lightTheme` / `darkTheme`.
- TypeScript garantiza que no hay magic numbers en componentes.

**Descartado**: NativeWind (más dependencias, debug más opaco), styled-components (overhead en RN).

---

## D10 · La conexión SQLite cruza una seam explícita (`createRepos` + locator)

**Decisión**: el data layer deja de apoyarse en un singleton de módulo. Cada repo se construye con
una factory que recibe la conexión (`createRepos(db)`), `runMigrations(sqlite)` toma el handle como
parámetro, y en producción un composition root (`src/db/bootstrap.ts`) abre expo-sqlite, migra,
siembra y publica el resultado vía un locator `getRepos()`. Se eliminan `export let db!`,
`getDatabase()` y `getRawDb()`.

**Por qué**:

- La conexión se **crea** dentro de `client.ts` (`openDatabaseAsync`, L54) y se expone como free
  variable (`export let db!`, L113), así que los 42 métodos de los repos la alcanzan sin cruzar
  ninguna interface. Nada la puede sustituir en un test.
- Con la seam explícita hay **dos adapters reales**: expo-sqlite en producción, better-sqlite3
  in-memory en tests y scripts. Dos adapters justifican la seam.
- Los scripts `migrate`/`seed` no tenían entrada headless: llamaban `runMigrations()` sin
  inicializar y `getRawDb()` lanzaba. Con el handle por parámetro vuelven a ser ejecutables en CI.
- El locator `getRepos()` mantiene los call sites sin cambios; es un punto de acceso, no la
  conexión, y los tests no lo usan: llaman `createRepos()` directo.

**Descartado**:

- **Mantener el singleton con un setter para tests**: deja estado mutable de módulo y no arregla
  los scripts.
- **Pasar `db` como parámetro en cada método**: agrega un parámetro a las 42 interfaces sin ganar
  sustituibilidad.
- **Portar los 4 repos de una sola vez**: se hace por rebanada vertical (empezando por
  `SessionsRepo`) para validar la seam antes de invertir en 42 métodos.

**Consecuencia**: el comentario de cabecera de `repositories.ts` («Testear la lógica de dominio con
mocks del repositorio») describía una seam que hasta ahora no existía.

---

## D11 · Los targets de rutina son un snapshot en la sesión

**Decisión**: `session_exercises` copia `rest_seconds`, `target_sets` y `target_reps` de la rutina al
iniciar la sesión. Las tres columnas son **nullable**: `null` = la sesión no vino de una rutina, no un
plan por defecto.

**Por qué**:

- La sesión es la **historia**: editar o borrar la rutina después no debe cambiar lo que se ejecutó.
  Sin el snapshot, `start` recibía los targets y los tiraba, y como `loadActive()` rehidrata desde
  SQLite, un arreglo que sólo pasara los valores por memoria se perdía al reiniciar la app.
- `targetSets` es la **intención** del plan, no `sets.length`: divergen apenas el usuario agrega un
  set a mitad de sesión. El conteo real sigue disponible en `sets`, sin un campo derivado que pueda
  contradecirlo.
- Nullable y no `NOT NULL DEFAULT`: una sesión sin rutina (o un ejercicio agregado a mano) no tiene
  plan. Decir que sí lo tenía es la misma clase de mentira que el `'-'` y el `90` fijos que el mapeo
  sintetizaba antes — el mapeo proyecta, no inventa.

**Descartado**:

- **Leer los targets por join a `routine_exercises` vía `workout_sessions.routine_id`**: no requiere
  migración, pero la rutina es mutable y una sesión ya terminada mostraría targets que nunca se
  ejecutaron. En una app de tracking, escribir historia incorrecta es peor que dejarla vacía.
- **Persistir sólo `rest_seconds`** (el único target con consumidor real hoy): deja `targetSets` y
  `targetReps` fabricados en el mapeo, que es el agujero que C6 vino a cerrar.
- **`target_weight`**: el DTO no lo declara y no tiene consumidor; agregarlo sería superficie
  especulativa.
- **Backfill de las filas existentes**: el valor real no es recuperable con fidelidad, por la misma
  razón que el join.

**Consecuencia**: el descanso de una sesión sin plan cae a `preferences.defaultRestSeconds` (una
preferencia del usuario, no una constante de dominio), y el timer tiene un solo dueño —
`activeWorkoutStore.completeSet`, no la pantalla. El espejo de Supabase no se replica: la divergencia
queda anotada en [06-known-issues](./06-known-issues.md).