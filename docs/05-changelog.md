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
---

## Anexo - Port a Lynx (fases F1-F5 y sistema de UI v2)

Registro de las fases de la migracion, volcado desde el README que vivia en `lynx/`. Las rutas que cita son las de entonces (antes de la promocion a la raiz).


Reescritura de la app Expo/React Native de Strain sobre **Lynx + ReactLynx + Rspeedy**.
La app original en la raíz del repo **sigue intacta**: esto vive en `lynx/` como
migración incremental.

> Estado: **Fase 5 (editor de rutinas) hecha** y **diseño v2, parte A** (tokens +
> componentes + shell de 5 pestañas) en `feat/lynx-diseno-v2`. Quedan la auth real,
> los native modules y la parte B (las pantallas sobre el sistema v2). La app Expo
> sigue siendo la de producción. Los tokens vigentes están en
> [Sistema de UI v2](#sistema-de-ui-v2--parte-a).

## Por fases (decisión del dueño)

Se eligió empezar por la base (scaffolding + theme + capa de datos) y dejar la UI
para después, en lugar de una reescritura big-bang.

## Lo que NO tiene Lynx (realidad dura)

Lynx **no es React Native**. No trae out-of-the-box:

| Dependencia Expo/RN original | Estado en Lynx |
|---|---|
| `expo-sqlite` + Drizzle (toda la BD) | ❌ Requiere **native module** Kotlin/Swift. De momento: seam KV en `src/db/storage.ts` |
| `expo-router` (19 pantallas, file-based) | ❌ Reescrito a un registro de rutas propio (`src/app/routes.tsx` + `src/lib/router.ts`) |
| `react-native-health-connect` | ❌ Native module propio |
| `expo-notifications`, `secure-store`, `sharing`, `haptics`, `document-picker`, `expo-font`... | ❌ Native modules propios |
| `reanimated` + `gesture-handler` + `draggable-flatlist` | ⚠️ Parcial: `@lynx-js/lynx-ui` **sí está instalado** y aporta hoja con arrastre, botón, switch, inputs y **sortable** (el reordenar del editor de rutinas ya lo usa; ver [Sistema de UI](#sistema-de-ui)). El swipe de las series sigue siendo botones explícitos |
| `victory-native` / `chart-kit` / `svg` (gráficos) | ❌ Sin equivalente directo; heatmap y barras se dibujan a mano con `<view>`/CSS |
| `expo-haptics` + animaciones de `reanimated` | ❌ Native module / sin equivalente: el descanso avisa por color, no por háptica ni pulso |
| `ViewShot` (capturar la tarjeta para compartir) | ❌ Native module: `WorkoutSummaryCard` se pinta, pero no se captura ni se comparte |
| `Intl` (`Intl.DateTimeFormat`, `toLocaleString`) | ❌ **No implementado** en Lynx; `src/lib/format.ts` formatea a mano |
| `drizzle-orm` | ✅ Ausente a propósito: la capa de datos usa la *seam* KV (`src/db/storage.ts`). `src/lib/metrics.ts` sólo tiene funciones puras (los helpers SQL de la app Expo no se portaron), así que `lynx/` compila con sus propias dependencias |

## Fase 1 — hecho ✅

- **Scaffold Rspeedy** en `lynx/` (`lynx.config.ts`, `tsconfig.json` con los
  mismos alias `@/`, `@db`, `@lib`, `@stores`, `@types`).
- **Theme** portado tal cual (`src/lib/theme.ts`, era TS puro).
- **Lógica de dominio pura** portada sin cambios: `metrics`, `weeks`, `format`,
  `plateCalculator`, `supersets`, `personalRecords`, `labels`, `keypad`,
  `bottomSheet`, `swipeActions`, `reactKeys`.
- **`id.ts`** reescrito: `expo-crypto` → UUID v4 propio (PrimJS no garantiza
  `crypto.getRandomValues`).
- **Modelo de datos** autocontenido (`src/db/schema.ts`): interfaces planas 1:1 con
  el esquema Drizzle original (sin depender de Drizzle).
- **Seam de persistencia** (`src/db/storage.ts`): interfaz `Storage` + implementación
  sobre el session storage de Lynx + memoria. Punto de extensión para el futuro
  native module SQLite.
- **Repo de ejercicios** (`src/db/exercisesRepo.ts`): misma interfaz pública que el
  repo Drizzle, pero sobre la seam KV. Con tests.
- **Semilla del catálogo** (`src/db/seed.ts`): port 1:1 de `src/db/seed.ts` de la app
  Expo — los **47 ejercicios**, mismo orden y mismos campos (paridad de dominio);
  sólo cambia la seam (sobre KV los campos con default de tabla se completan al
  mapear y el id/timestamps los pone el repo). `seedExercises(exercises)` es
  idempotente (`count() > 0 → return`) y el bootstrap la corre **antes** de publicar
  los repos, así la biblioteca arranca poblada.

## Fase 2 — hecho ✅

- **Registro de rutas** (`src/app/routes.tsx`): nombre de ruta → componente, con los
  nombres reales de la app Expo (`home`, `routines`, `exercises`, `history`,
  `progress`, `health`, `settings` y las rutas de pila `routines/[id]`,
  `exercises/[id]`, `workout/active`, `workout/finish`). `(tabs)` resuelve al shell.
- **Shell** (`src/components/Shell.tsx`): pinta el tope de la pila del router. Para
  `(tabs)` monta la pestaña activa + tab bar de 7 pestañas; para una ruta de pila,
  la pantalla a pantalla completa con cabecera para volver.
- **`App.tsx`** deja de ser el placeholder: monta el shell y aplica `useTheme`.
  `index.tsx` bootstrapea la capa de datos antes del primer render.
- **Primitivas Lynx** (`src/components/`): `Screen`, `Card`, `Button`, `EmptyState`,
  `MuscleChip`, `Loading`/`ErrorNote` y `useLoad`. Sólo elementos Lynx
  (`<page>/<view>/<text>/<scroll-view>/<input>`) y clases CSS en `App.css`.
- **Siete pestañas funcionales** contra los repos/stores ya portados, cada una con
  estado de carga, vacío y error explícitos:
  - `Hoy`: racha (`analytics`), workout activo y arranque de sesión.
  - `Rutinas`: `routinesRepo.list()` + empezar desde rutina.
  - `Ejercicios`: `exercisesRepo.list()` con búsqueda y filtro por grupo muscular.
  - `Historial`: `sessionsRepo.list(100)` con volumen, series y duración.
  - `Progreso`: `analytics.volumePerWeek`/`currentStreak`/`personalRecords` y
    `topPersonalRecords`, **sin gráficos** (lista de cifras y PRs).
  - `Salud`: estado de `healthConnectStore`, con el bridge stub explícito.
  - `Ajustes`: `preferencesStore` (tema, unidades, descanso, háptics, pantalla).
- **`src/lib/format.ts` reescrito sin `Intl`**: Lynx no implementa la API de
  internacionalización, así que las fechas se formatean a mano con los mismos
  formatos (si no, cualquier fecha en pantalla tiraba en runtime).

### Rutas que siguen siendo stub

**Ninguna ruta de pila queda en stub.** Con el editor de rutinas (Fase 5) las
siete rutas de pila tienen pantalla propia, así que se retiraron el componente
`StubScreen` y el registro `StubScreens` por quedar sin consumidor. Las pantallas
de auth (Fase 6) todavía **no están registradas**: entrarán ya como pantallas
reales, no como stubs.

### Gates Fase 2

- `tsc --noEmit` → exit 0
- `vitest run` → 18/18 passed
- `rspeedy build` → `dist/main.lynx.bundle` (250.3 kB)

## Fase 3 — hecho ✅

El **flujo de entrenamiento** completo: era lo único que seguía siendo stub y es
el corazón de la app.

### Componentes (`src/components/`)

- `SetRow`, `RestTimer`, `PlateCalculatorSheet`, `NumericKeypad`,
  `SetDetailsSheet`, `ExercisePickerModal`, `WorkoutSummaryCard`, `Heatmap` y
  `Sheet` (el panel inferior compartido).
- Reutilizan la lógica ya portada en `@lib`: `keypad` (el buffer es la única
  fuente del valor, así no se puede repetir el known-issue K), `plateCalculator`,
  `metrics` (1RM en vivo con `oneRmPreview`), `personalRecords`.
- **Sin gestos**: `@lynx-js/types` no expone `<SwipeAction>`/`<Sheet>`/`<Sortable>`
  y `@lynx-js/lynx-ui` no está instalado (este run no suma dependencias). Las
  acciones de swipe son botones explícitos en la fila y las hojas cierran con
  botón; `@lib/bottomSheet` y `@lib/swipeActions` quedan sin consumidor hasta que
  esos gestos existan, listos para usarse ese día.
- **Gráficos a mano**: heatmap y barras se dibujan con `<view>`/CSS, sin librería.
- **Sin `Intl`**: se suman `formatNumber` (miles es-ES), `shortMonth` y `dayKey` a
  `@lib/format`, que es lo que reemplaza a `toLocaleString('es-ES')`.

### Pantallas

- `workout/active`: cabecera con cronómetro y finalizar, series con
  completar/descompletar/borrar/añadir, descanso automático, calculadora de discos,
  teclado de peso y reps, hoja de RPE/notas, selector de ejercicio y cabecera por
  superset. Sobre `@stores/activeWorkoutStore`.
- `workout/finish`: duración, volumen, series, ejercicios, **PRs de la sesión** y
  desglose por ejercicio.
- `exercises/[id]`: totales históricos, progresión en barras, rangos 1M/3M/6M/1A,
  PR actual e historial de récords.
- `history/[id]`: **ruta nueva** (antes no existía): tarjeta de resumen y series
  completadas.
- El historial navega al detalle y Progreso gana el heatmap de consistencia sobre
  `analytics.dailyVolume`.

### Store y lógica nueva

- `@lib/rest`: el descanso se cuenta contra un **instante de fin**. Antes se
  restaba el tiempo transcurrido a un valor ya descontado, así que cada tick extra
  descontaba de más.
- `@lib/sessionSummary`: el resumen de la sesión (volumen, series, duración, mejor
  set y PRs de la ventana) se calcula una sola vez. El store lo guarda en
  `lastFinished` porque `finishWorkout()` limpia la sesión activa: sin eso, la
  pantalla de cierre no tenía nada que leer.
- `@lib/heatmap`: la grilla del heatmap, separada del pintado y con `today` como
  parámetro para que sea determinista.
- `@lib/theme`: `withAlpha`, porque el CSS de Lynx no acepta el hex de 8 dígitos
  (`#rrggbbaa`) que usaba la app Expo.

### Datos

La seam KV **no necesitó ninguna consulta nueva**: `getFullSession`, `byId`,
`exerciseTimeline`, `exerciseStats`, `exercisePrHistory`, `personalRecords`,
`dailyVolume` y `list` ya cubrían todo. El único cambio en `src/db/` es unificar
`dayKey` entre `analyticsRepo` y el heatmap, que ahora viven en `@lib/format`.

### Gates Fase 3

- `tsc --noEmit` → exit 0
- `vitest run` → 9 ficheros / 47 tests passed (eran 18)
- `rspeedy build` → `dist/main.lynx.bundle` (363.0 kB, eran 250.3 kB)

Tests nuevos: resumen de sesión (sólo sets completados, duración, PRs por ventana),
descanso (idempotencia y sin negativos), grilla del heatmap, formateos sin `Intl`,
`withAlpha` y el registro de rutas (que cada ruta nueva resuelva a una pantalla y
que el flujo de entrenamiento ya no caiga en los stubs).


## Sistema de UI (Fase 4)

> ⚠️ Los tokens, la escala y los componentes de esta sección quedaron
> **sustituidos por el [sistema v2](#sistema-de-ui-v2--parte-a)**. Se conserva como
> registro de lo que hizo la fase; los valores vigentes son los de la v2.

El aspecto era lo que quedaba flojo: `App.css` tenía 1.127 líneas y ~160 clases a
mano, y el theme era una copia literal del de Tailwind (grises puros + `#3b82f6`).
Esta fase sustituye eso por un sistema con tokens por rol y por los componentes
headless de `@lynx-js/lynx-ui`.

### Color por rol

Los tokens se llaman por **rol**, no por apariencia (`accent`, no `blue`;
`surfaceRaised`, no `#262626`): cambiar la marca es cambiar `theme.ts`, no cada
pantalla. Los doce roles están en `src/lib/theme.ts`.

| Rol | Para qué |
|---|---|
| `bg` | fondo de la app, detrás de todo |
| `surface` | superficie base: tarjetas, barras |
| `surfaceRaised` | un nivel por encima (hojas, controles, elementos activos) |
| `line` | separadores y bordes (un único grosor, 1px) |
| `textPrimary` / `textSecondary` | texto principal / de apoyo |
| `textInverse` | texto sobre una superficie opuesta |
| `accent` / `accentSoft` / `onAccent` | acción primaria, su relleno suave y su texto |
| `success` / `warning` / `danger` | estados semánticos |

Dos reglas que el sistema hace cumplir:

- **El acento es una acción, no decoración.** Sólo la acción primaria de cada
  pantalla lo usa (regla 60-30-10: nunca más del ~10% de la superficie). Los
  valores numéricos y los enlaces secundarios que lo llevaban de adorno pasaron a
  `textPrimary`. Único caso de relleno amplio: el hero del workout en curso.
- **Los neutros oscuros están tintados hacia la marca** (hue ~215, croma bajo),
  no son gris puro. El `#0a0a0a`/`#171717` plano es el look que esta fase
  abandona. Hay un test que exige que el canal azul domine en `bg`, `surface` y
  `surfaceRaised`.

### Contraste medido

Fórmula WCAG 2.1 sobre los pares texto/fondo que la app usa de verdad, en
`src/lib/theme.system.test.ts`:

| Tema | Texto (mín / máx) | Bordes (mín / máx) |
|---|---|---|
| Claro | **5.14:1** (`warning` sobre `surface`) · 17.96:1 | **3.34:1** (`line` sobre `surfaceRaised`) · 3.76:1 |
| Oscuro | **5.26:1** (`accent` sobre `accentSoft`) · 16.98:1 | **3.32:1** (`line` sobre `surfaceRaised`) · 4.05:1 |

Todo texto supera 4.5:1 y todo borde significativo supera 3:1. El azul de marca
original (`#3b82f6`) no llegaba a 4.5:1 sobre blanco (3.68:1), así que el acento
claro bajó a `#1d4ed8`.

### Escala tipográfica

Cinco pasos (13 / 15 / 17 / 22 / 28), cada uno con su línea y su peso. El
consumidor elige el **rol**, nunca un `fontSize` suelto:

| Rol | Tamaño | Línea | Peso (claro) | Uso |
|---|---|---|---|---|
| `detail` | 13 | 18 | 500 | metadatos, unidades, contadores |
| `support` | 15 | 21 | 400 | cuerpo y descripciones |
| `title` | 17 | 24 | 600 | cabecera de bloque o fila |
| `heading` | 22 | 30 | 700 | título de pantalla |
| `display` | 28 | 34 | 800 | cifra o titular protagonista |

**Compensación en oscuro**: +2 de interlineado y un escalón menos de peso (nunca
por debajo de 400). El texto claro sobre fondo oscuro engorda ópticamente; sin
esto, el tema oscuro se ve más apretado y más pesado que el claro.

La tipografía **no vive en CSS**: la aplica la primitiva `Text`
(`src/components/Text.tsx`), que es la única puerta de entrada a `<text>` y la
que recibe `role` + `tone`. Por eso la compensación en oscuro se aplica en un
solo sitio.

### Espaciado, radios, borde y movimiento

- **Espaciado**: sólo 4 / 8 / 16 / 36 (`space.xs|sm|md|lg`). No hay valores
  sueltos tipo 10 o 14.
- **Radios**: tres y sólo tres — `chip` (999), `control` (10), `card` (14).
- **Unidad obligatoria**: Lynx rechaza toda longitud distinta de 0 sin unidad,
  también inline (`CSS length need units (except 0)`). Los tokens de longitud se
  exportan ya como `'16px'` y todo número pasa por `px()` —incluida la escala
  tipográfica, vía `typeStyle()`—, así que ningún `style={{...}}` recibe un número
  suelto. Lo comprueba el test «longitudes con unidad».
- **Borde**: un único tipo, 1px (`BORDER_WIDTH`); el color lo pone `line`. En
  oscuro no hay sombras decorativas: la jerarquía se resuelve con borde y con
  elevación de superficie (`bg` < `surface` < `surfaceRaised`).
- **Movimiento**: tres duraciones (120 / 200 / 320) y una sola curva
  (`cubic-bezier(0.2, 0, 0, 1)`). Sólo se animan `transform` y `opacity`.
- **Área táctil**: nada interactivo mide menos de 44 (`TOUCH_TARGET`).

### `App.css`

De 1.127 líneas y 160 clases a **256 líneas y ~100 clases, todas vivas** (hay una
auditoría de "clases usadas vs definidas" que se corre a mano y da 0 muertas).
El fichero no tiene ni tipografía ni color: sólo layout, con los valores de la
escala de arriba.

### Mapa de componentes de `@lynx-js/lynx-ui`

| Ahora | Antes | Estado |
|---|---|---|
| `Button` | `<view bindtap>` propio | ✅ adoptado: separa pulsado / reposo / deshabilitado |
| `Switch` + `SwitchTrack` + `SwitchThumb` | toggle a mano | ✅ adoptado en Ajustes |
| `Sheet` + `SheetView` + `SheetBackdrop` + `SheetContent` + `SheetHandle` | panel absoluto sin gesto | ✅ adoptado: arrastre para cerrar, telón, animación de entrada/salida |
| `Input` / `TextArea` | `<input>` / `<textarea>` con `bindinput` | ✅ adoptado (buscadores y notas del set) |
| `SwipeAction` | botones explícitos en la fila | ⏳ pendiente (ver abajo) |
| `List` | `.map()` dentro de `<scroll-view>` | ⏳ pendiente (ver abajo) |
| `Sortable` + `SortableItem` + `SortableItemArea` | — | ✅ adoptado en el editor de rutinas (`as="DraggableRoot"` con asa explícita) |
| `InputOTP` | — | ⏳ entra con la auth |
| `tab-group` | tab bar propia | ❌ **no existe** en `lynx-ui` 3.138.0 (el paquete está sin publicar), así que la tab bar sigue siendo propia |
| `overlay` | — | ✅ en uso indirecto: `SheetBackdrop` lo usa por dentro; no se consume directo |

`lynx.config.ts` activa `enableNewGesture`, que es lo que lynx-ui pide para sus
componentes con gesto.

### Reglas de diseño aplicadas

1. **Jerarquía**: como mucho tres roles tipográficos por pantalla, y los
   subtítulos no repiten el título (varios se eliminaron por redundantes).
2. **Estados completos**: vacío, cargando y error siguen existiendo en todas las
   pantallas de datos, con el mismo `EmptyState` / `Loading` / `ErrorNote`;
   `Button` y `Switch` ahora tienen estado pulsado y deshabilitado.
3. **Áreas táctiles ≥44**: incluidos los controles de la fila de serie, el
   marcador de pestaña, la cabecera y el botón de cerrar de las hojas (que estaba
   usado en el markup pero **no definido** en el CSS: era un bug).
4. **Zona del pulgar**: la acción primaria de cada pantalla vive en la mitad
   inferior o en un botón flotante (el FAB de añadir ejercicio y los botones al
   pie del contenido).
5. **Una tarjeta sólo si el contenido es una tarjeta**: en las pantallas de lista
   se separa con líneas, no con cajas.
6. **Copy**: frase normal, un verbo por botón, sin exclamaciones. Los estados
   vacíos dicen qué hacer.
7. **Cabeceras de pila**: muestran un título humano (`STACK_TITLES`), no el
   identificador técnico de la ruta.

### Tests de esta fase

`src/lib/theme.system.test.ts` comprueba los invariantes medibles (contraste por
tema, tintado de neutros, cinco pasos con línea y peso, compensación en oscuro,
ritmo de espaciado, radios, borde y duraciones) y `src/app/routes.test.tsx`
comprueba la tabla ruta → título.

### Gates Fase 4

- `bun run typecheck` → exit 0
- `bun run test` → 10 ficheros / **66 tests** (eran 47)
- `bun run build` → `dist/main.lynx.bundle` **451.8 kB**

El bundle sube respecto de los 331 kB del final de la Fase 3: la hoja de lynx-ui
arrastra su runtime de gestos y de animación. Es el precio de tener arrastre para
cerrar; si algún día pesa demasiado, la hoja es un solo fichero y se puede volver
al panel propio sin tocar ninguna pantalla.

### Lo que queda

- **Swipe en las series** (`SwipeAction`): la fila hoy tiene botones explícitos
  para completar / borrar / detalles. Volver a poner el gesto es aditivo, pero
  necesita verificarse en dispositivo (convive con el tap del peso y de las reps)
  y el run anterior quitó el swipe justamente porque los botones se descubren
  mejor. Queda pendiente y justificado.
- **Listas virtualizadas** (`List`): `List` es el `<list>` nativo y pide
  `listId`/`listType`/`spanCount` y reestructurar el andamiaje de `Screen`, que
  hoy es `<scroll-view>` + contenido. Con catálogos de decenas de ejercicios no
  cambia la experiencia; entra cuando haya listas largas de verdad (historial).
- **Transiciones** (`Presence`): las hojas ya animan entrada/salida por su
  cuenta; falta el resto de transiciones.
- Auth (`InputOTP`) y los nativos.


## Fase 5 — hecha ✅

El **editor de rutinas**: era la última ruta de pila que seguía siendo stub.

### Pantallas

- `routines/new`: nombre (obligatorio) y nota (opcional); al crear reemplaza la
  entrada de la pila por el detalle, así "Atrás" vuelve a la lista. La validación
  es local y muestra el motivo en pantalla (`validateRoutineName`), nunca un
  `alert` (que además no existe en Lynx).
- `routines/[id]`: lista de ejercicios de la rutina, **reordenar arrastrando**,
  quitar (con confirmación en hoja), editar nombre y nota, y **empezar
  entrenamiento** con los targets de la rutina (el mismo camino que la pestaña
  Rutinas).
- `routines/[id]/add-exercise`: búsqueda y filtro por grupo muscular con el mismo
  vocabulario que la biblioteca, **selección múltiple** y confirmación. Sólo
  ofrece lo que la rutina todavía no tiene, así que no se pueden crear duplicados.
- La pestaña Rutinas gana la entrada a `routines/new`: acción en el estado vacío y
  botón al final de la lista cuando ya hay rutinas.

### Reordenar con `Sortable`

Entró `Sortable` de `lynx-ui` con `as="ScrollView"`: el propio componente es el
`<scroll-view>` (con auto-scroll al arrastrar), así la pantalla no anida scrolls.
Las filas usan `as="DraggableRoot"` y el asa es un `SortableItemArea`: con el
`Draggable` por defecto (todo el ítem arrastrable, `trigger` inmediato) el toque
de "Quitar" habría arrancado el arrastre. El orden se persiste al soltar
(`reorderExercises`) y la lista se actualiza en el acto.

**Pendiente de verificar en dispositivo**: el gesto convive con el scroll de la
pantalla y en este run no se pudo probar en Lynx Explorer (el bucle de
dispositivo está pausado). El fallback si no encaja es subir/bajar con botones,
que `@lib/routineEditor.moveBy` ya resuelve y prueba.

### Datos

La seam KV **no necesitó ninguna consulta nueva**: `getWithExercises`, `create`,
`update`, `addExercise`, `reorderExercises` y `removeExercise` ya cubrían el
editor con la misma interfaz pública que el repo Drizzle (no se tocó ni SQLite ni
ningún módulo nativo). Sí se sumaron tests propios del repo: append con los
targets por defecto, reordenar (y que ignore ids de otra rutina), quitar,
`updatedAt` de `create`/`update`/`touch`, `list` con archivadas y `clone`.

### Lógica pura

`@lib/routineEditor`: validar el nombre, mover/recorrer, ordenar por ids, quitar,
filtrar el catálogo por lo que la rutina ya tiene y alternar la selección
múltiple. El filtro muscular que comparten biblioteca y selector pasó a
`@lib/labels`, así la lista de chips y el caso "Todos" tienen una sola fuente.

### Gates Fase 5

- `tsc --noEmit` → exit 0
- `vitest run` → 12 ficheros / **95 tests** (eran 69)
- `rspeedy build` → `dist/main.lynx.bundle` **528.3 kB** (eran 452.2 kB)

El `Sortable` arrastra el runtime de `draggable` (~76 kB). Es el precio del
reordenar con gesto; la hoja ya había pagado el suyo en la Fase 4 y el criterio es
el mismo: si un día pesa de más, el editor es un solo fichero y se vuelve a
botones sin tocar los datos.


## Sistema de UI v2 — parte A

Sustituye los tokens y añade los componentes del sistema nuevo. **No toca
pantallas**: eso es la parte B. Por eso las pantallas de esta parte siguen
compilando y los tests pasan usando los componentes viejos.

### Tokens (`src/lib/theme.ts`)

| Rol | Claro | Oscuro | Para qué |
|---|---|---|---|
| `bg` | `#F6F8FB` | `#0B0E13` | fondo de la app, detrás de todo |
| `surface` | `#FFFFFF` | `#141922` | superficie base: tarjetas, barras |
| `surfaceRaised` | `#EDF2F9` | `#1C2230` | un nivel por encima: hojas, controles, activos |
| `border` | `#D8DFEA` | `#262E3B` | separadores y bordes (un único grosor, 1px) |
| `textPrimary` | `#0F1723` | `#EAF0F8` | texto principal |
| `textSecondary` | `#4A5768` | `#A9B6C9` | texto de apoyo |
| `accent` | `#1D4ED8` | `#3B82F6` | acción primaria y selección |
| `onAccent` | `#FFFFFF` | `#0B0E13` | texto sobre el acento |
| `success` | `#0F7A52` | `#34D399` | estados semánticos |
| `warn` | `#9A6100` | `#F59E0B` | |
| `danger` | `#C62B2B` | `#F87171` | |

`textInverse` y `accentSoft` siguen como roles de apoyo. `line` y `warning`
quedan como **alias** de `border` y `warn` sólo para que las pantallas anteriores
a la v2 compilen sin tocarlas; la parte B los retira.

- **El borde es sutil, no un borde duro.** El `border` de la v2 baja a propósito
  del 3:1 que pide un borde significativo: agrupa sin encerrar. Por eso el test
  fija el **rango** (≥1.15 y ≤2.5 sobre cada superficie) y no el umbral viejo.
  El texto sigue por encima de 4.5:1 (mínimo medido: 4.79:1).
- **Tipografía (seis pasos)**: `detail` 12/16 500, `support` 14/20 400,
  `body` 16/24 400, `heading` 18/24 600, `title` 22/28 600, `display` 34/40 700.
  La compensación en oscuro no cambia: +2 de interlineado y un escalón menos de
  peso (nunca por debajo de 400).
- **Espaciado** 4 / 8 / 16 / 24 / 36 (`xs|sm|md|lg|xl`); **radios** `control` 8,
  `container` 12, `pill` 999; **movimiento** `fast` 100ms y `base` 150ms, con el
  estado pulsado en una receta (`pressedStyle`): opacidad 0.6 y escala 0.98.
- La regla de unidad sigue igual: ninguna longitud llega al motor sin `px()`.

### Componentes nuevos

`Icon` (set propio: SVG inline con trazo de 2px sobre caja de 24 — chevron,
chevronRight, home, plus, check, clock, streak, list, dumbbell, chart, heart,
settings), `ListRow`, `SectionHeader`, `StatBlock`, `PrimaryActionBar`, `Chip`,
`SegmentedControl` y `EmptyState` (que gana `icon`). Los glifos de texto (`‹`,
`✓`, `⋯`, `⌫`) dejan de usarse como iconos: dependían de la fuente de cada
plataforma.

En Lynx un `<svg>` no lleva hijos, así que el icono es un documento SVG en el
`content` del elemento y el color se resuelve con `current-color`; `iconSvg()` es
la función pura que lo arma.

Reglas que aplican al sistema: nada de tarjeta dentro de tarjeta, lo que se
repite se pinta como **fila**, el acento sólo en la acción primaria y en lo
seleccionado, ningún color comunica un estado **solo** (la pestaña activa lleva
marcador y el chip seleccionado cambia el rol de su texto) y los nombres largos
truncan con elipsis (`text-maxline` del `<text>` más `text-overflow: ellipsis`,
que es lo que Lynx pide para cortar de verdad).

### Shell: de 7 pestañas a 5

`TAB_ROUTES` = `home, routines, exercises, progress, settings` (Hoy, Rutinas,
Ejercicios, Progreso, Ajustes), cada una con icono y etiqueta; el icono vive en
`TAB_ICONS`, en el registro, porque es parte de declarar la pestaña.

- **Historial** deja de ser pestaña: la lista de sesiones se muestra como bloque
  dentro de `ProgressScreen`, sobre el componente compartido `HistoryList` (que
  también usa la pantalla de historial, así no hay dos listas que puedan
  divergir). `history/[id]` sigue funcionando igual.
- **Salud** deja de ser pestaña: pasa a ruta de pila y se abre desde una fila de
  Ajustes. `HealthScreen` y su lógica quedan intactas.
- En **Hoy** desaparece el atajo "Historial", que apuntaba a la pestaña que ya no
  existe (el historial ahora se lee en Progreso).

### Tests de la parte A

`src/test/jsxCapture.ts` es el arnés: el runtime de ReactLynx no carga en Node y
el repo no trae renderer, así que los tests reemplazan el runtime de JSX por uno
que **captura** el árbol y afirman sobre los nodos y las props que cada
componente escribió. Con eso los ocho componentes tienen test propio, sin montar
nada.

Los tests de tema se reescribieron para los tokens v2 —no se borró ningún caso—
y el registro de rutas ahora exige 5 pestañas con icono, `health` como ruta de
pila y que `history` no sea pestaña.

### Gates parte A

- `bun run typecheck` → exit 0
- `bun run test` → 21 ficheros / **152 tests** (eran 102)
- `bun run build` → `dist/main.lynx.bundle` **549.9 kB** (era 528.3 kB)

El bundle sube ~21 kB por los ocho componentes y los documentos SVG de los
iconos.

## Comandos

```bash
cd lynx
bun run typecheck   # typecheck (tsc --noEmit)
bun run test        # tests (vitest run)
bun run dev         # dev server: página web + QR para Lynx Explorer
bun run build       # build → dist/main.lynx.bundle + dist/main.web.bundle
```

### Entornos de desarrollo (F0)

`lynx.config.ts` declara dos entornos, `web` y `lynx`, así que `bun run dev` compila y
sirve los dos a la vez en el puerto **3000** (`--port` para cambiarlo) e imprime una URL
por target:

```
➜  Web        http://<host>:3000/main.web.bundle
➜  ∟ Preview  http://<host>:3000/__web_preview?casename=main.web.bundle
➜  Lynx       http://<host>:3000/main.lynx.bundle
```

El bucle de trabajo tiene tres niveles:

| Nivel | Para qué | Comando | Cómo se ve |
|---|---|---|---|
| **Navegador** (Lynx for Web) | Iterar en segundos; inspeccionar DOM/CSS | `bun run dev` | Abrir la URL `∟ Preview` (`/__web_preview?casename=main.web.bundle`) en el navegador |
| **Móvil real** (Lynx Explorer) | Validar el táctil y el rendimiento de verdad | `bun run dev` | Escanear el QR de la terminal con **Lynx Explorer** (móvil y PC en la misma Wi-Fi) |
| **Emulador Android** | Automatizar y sacar evidencia (adb/Maestro) | `bun run dev` + `adb reverse` | Lynx Explorer en el AVD apuntando a `http://localhost:<puerto>/main.lynx.bundle` |

**1 · Navegador (iterar).** La línea `∟ Preview` es la página de desarrollo: Rspeedy sirve
un HTML que arranca el bundle `web` en el runtime de Lynx for Web. `bun run build` genera
además `dist/main.web.bundle` (para el Web Explorer o para incrustar con
`@lynx-js/web-core`). No es fidelidad nativa: sirve para composición, tipografía, color y
navegación, **no** para dar por bueno el táctil ni el rendimiento.

**2 · Móvil real (validar).** Instalar **Lynx Explorer** (APK oficial en
`github.com/lynx-family/lynx/releases`), poner móvil y PC en la misma red y escanear el QR.
Si el host no se anuncia solo, `bun run dev -- --host` lo expone en la LAN.

**3 · Emulador (automatizar).** Único entorno automatizable (`adb`, Maestro). Se expone el
puerto del dev server al emulador con `adb reverse tcp:<puerto> tcp:<puerto>` (por defecto
**3000**) y Lynx Explorer carga `http://localhost:<puerto>/main.lynx.bundle`. Se reserva
para la comprobación final y la regresión, no para iterar.

### DevTool

El **Lynx DevTool Desktop** (`github.com/lynx-family/lynx-devtool/releases`) da los paneles
Elements / Console / Sources / Layers y Trace. Se engancha activando **Lynx Debug** y
**Lynx DevTool** en los ajustes de Lynx Explorer y conectándolo por cable (daemon). No se
instala desde este repo.

La vía CLI/CDP es el paquete **`@lynx-js/skill-lynx-devtool`** (existe en npm; en el
entorno de este run **no está instalado**). Ofrece consola, DOM/CSS, capturas, árbol de
componentes y toques desde fuera. Enganche documentado; la instalación queda a cargo del
usuario.

Referencia completa: [`docs/12-entorno-desarrollo-lynx.md`](../docs/12-entorno-desarrollo-lynx.md).

## Próximas fases (propuesta)

- **Diseño v2, parte B — pantallas**: pasar las pantallas al sistema v2 (tokens
  nuevos, y los componentes `ListRow` / `SectionHeader` / `StatBlock` /
  `PrimaryActionBar` / `Chip` / `SegmentedControl`), y con eso retirar los alias
  `line` y `warning` de `theme.ts`.
- **Fase 4.1 — Swipe y listas**: `SwipeAction` en la fila de serie y `List` en las
  pantallas de lista, más `Presence` donde aporte (ver "Lo que queda").
- **Fase 5 — Editor de rutinas**: ✅ hecha (ver arriba). `routines/new`,
  `routines/[id]` y `routines/[id]/add-exercise` sobre `routinesRepo`. Quedan
  fuera de este run los supersets y la edición de targets por ejercicio (la seam
  ya los soporta; sólo falta la UI).
- **Fase 6 — Auth real**: login/signup/forgot (`InputOTP` para el código).
  `src/lib/supabase.ts` ya está portado y solo faltan las pantallas de `app/auth`.
- **Fase 7 — Nativo**: Health Connect, notificaciones, haptics, secure-store,
  compartir (captura de `WorkoutSummaryCard`) y la decisión de SQLite.

## Decisión pendiente (importante)

La capa de datos completa de Strain es relacional (sesiones → ejercicios → sets → PRs).
Sobre KV eso escala mal para `analytics`. Hay que decidir entre:
1. **Native module SQLite** para Lynx (reutiliza Drizzle y los LOC de repos) — más
   trabajo nativo, más fiel.
2. **Repos KV + agregaciones en memoria** — más simple, pero analytics y sync sufren.
