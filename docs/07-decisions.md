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

> **Superado por [D12](#d12--gestor-de-paquetes-bun) (19 sep 2026)**: el repo volvió a bun.

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

> **Matizada por [D14](#d14--host-nativo-y-almacenamiento-durable) y [D13](#d13--retirada-de-expo)
> (19 sep 2026)**: la parte de «SQLite local como fuente de verdad» sigue vigente —D14 la lleva al
> host nativo propio—, pero **Supabase deja de ser el backend de sync**: pasa a ser **InsForge**
> (ver D13 y `specs/003`), y su retirada la gobierna `specs/004`. Lo que aquí se dice de Drizzle
> también queda matizado: en Lynx el acceso es un módulo nativo, no Drizzle.

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

---

## D12 · Gestor de paquetes: bun

**Decisión**: usar **bun 1.4.2** como gestor de paquetes (y runtime de scripts) en los dos árboles del
repo: la raíz (app Expo) y `lynx/`. Sustituye a pnpm en la raíz (D2) y a npm en `lynx/`.

**Por qué**:

- **Petición de Pablo**: una sola herramienta para todo el repo. Antes convivían pnpm (raíz, con
  `pnpm-lock.yaml` + `.npmrc` + `pnpm-workspace.yaml`) y npm (`lynx/`, con `package-lock.json`): dos
  lockfiles y dos formas de instalar.
- **Instalación plana**: bun enlaza en un `node_modules` plano, sin el anidamiento
  `.pnpm/<pkg>@<ver>_<hash>/node_modules/` de pnpm. El hoisting explícito del `.npmrc`
  (`public-hoist-pattern[]=…`) deja de hacer falta: todas las dependencias quedan visibles para Metro.

**Descartado**: seguir con pnpm (dos herramientas, dos lockfiles), npm (legacy en la raíz).

**Migración**:

- `bun.lock` reemplaza a `pnpm-lock.yaml` (raíz) y `package-lock.json` (`lynx/`). Se borran `.npmrc` y
  `pnpm-workspace.yaml`; el `allowBuilds` de este último se traduce a `trustedDependencies`.
- **Postinstall**: bun no ejecuta los scripts de dependencias no confiadas. En la raíz el único que bun
  reportó bloqueado fue **`unrs-resolver`**; se declaran además **`better-sqlite3`** y **`esbuild`**
  porque el `allowBuilds` de pnpm los construía (bun ya los ejecutaba, pero quedan explícitos). En
  `lynx/` no hizo falta ninguno (`bun pm untrusted` → 0).
- El script `lint` invocaba `pnpm lint:anti-slop`; ahora invoca `bun run lint:anti-slop`.
- CI: `oven-sh/setup-bun@v2` con `bun-version: 1.4.2` en vez de `pnpm/action-setup@v4`, y
  `bun install --frozen-lockfile`.

**Verificación (este run, 19 sep 2026)**: en la raíz, `bun run lint`, `bun run typecheck` y
`bun run test` (**135/135**) en verde, y **la build Android sigue produciendo el APK**:
`cd android && ./gradlew assembleDebug` → `BUILD SUCCESSFUL`, con
`android/app/build/outputs/apk/debug/app-debug.apk` (~249 MB, `minSdk 26`). El arreglo de
`ninja: build.ninja still dirty` había sido precisamente el hoisting de pnpm; con bun la instalación es
plana y el build nativo (reanimated, worklets, gesture-handler, expo-modules-core) compiló sin ese
problema.

---

## D13 · Retirada de Expo

**Decisión**: la app Expo sale del repositorio. El proyecto Lynx se promueve a la raíz y los
artefactos de Expo se borran siguiendo el `specs/004`, con un **criterio de borrado explícito**: no se
borra nada hasta que exista el host nativo del `specs/001` y estén migradas las cinco piezas del
inventario —las 3 pantallas de auth, la capa durable, Health Connect, las notificaciones y la cuenta—.

**Por qué**:

- Dos aplicaciones en el mismo repositorio confunden a personas y a agentes: la documentación, la
  integración continua y las skills apuntaban a la app vieja.
- Lynx es el destino; mantener Expo cuesta (SDK, EAS, dependencias nativas) sin aportar producto.
- La transición es reversible **mientras no se borre**: la etiqueta `expo-final` marca el último
  commit con Expo intacta.

**Descartado**:

- **Borrado *big-bang*** (borrar primero y portar después): dejaría el repositorio sin una app que
  arranca, y el *prebuild* nativo no es recuperable desde git.
- **Convivencia indefinida**: duplica mantenimiento y mantiene la ambigüedad de cuál es la base.

**Criterio de borrado** (los cuatro, en orden):

1. El host del `specs/001` existe y funciona.
2. Las cinco piezas del inventario están migradas y verificadas.
3. El proyecto Lynx está promovido a la raíz y la integración continua y la documentación apuntan a
   él.
4. Límite declarado: `android/` de la raíz **no está versionado**, así que el *prebuild* nativo de
   Expo no se recupera desde la etiqueta.

**Consecuencia**: el borrado deja de ser un evento arriesgado y pasa a ser el último paso de una
secuencia con puertas.

---

## D14 · Host nativo y almacenamiento durable

**Decisión**: Strain pasa a ser una **app Android propia** que embebe el bundle Lynx en un `LynxView`,
y la persistencia se resuelve con un **módulo nativo SQLite** detrás de la *seam* de almacenamiento
que ya existe. El almacén actual (memoria + *session storage*) es solo un puente temporal.

**Por qué**:

- El requisito duro es que **cerrar la app no puede perder lo registrado**; hoy lo pierde.
- El dominio es relacional (sesiones → ejercicios → sets → PRs) y las agregaciones de analytics se
  resuelven como consultas, no trayendo el histórico completo a memoria.
- El offline-first es un principio de producto: la nube no puede ser la fuente de verdad.
- La *seam* ya aísla la decisión, así que cambiar la implementación **no toca ninguna pantalla**.

**Descartado**:

- **Ficheros durables tras la *seam* KV**: mucho menos trabajo nativo, pero obliga a agregar en
  memoria y a migrar formatos a mano. Queda como *stopgap* si el módulo nativo se retrasa.
- **InsForge como fuente de verdad**: rompe el offline-first y deja la app inútil en un gimnasio sin
  cobertura.

**Consecuencia**: el host propio desbloquea además las nativas (`specs/002`), la cuenta
(`specs/003`), el build del host en CI (`specs/005`) y es la **puerta** del borrado de Expo (D13). El
desarrollo detallado está en `specs/001-host-nativo-y-almacenamiento-durable.md`.