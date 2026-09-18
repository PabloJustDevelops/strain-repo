# Strain en Lynx — migración por fases

Reescritura de la app Expo/React Native de Strain sobre **Lynx + ReactLynx + Rspeedy**.
La app original en la raíz del repo **sigue intacta**: esto vive en `lynx/` como
migración incremental.

> Estado: **Fase 3 (flujo de entrenamiento) completada**. Quedan el editor de
> rutinas, la auth real y los native modules. La app Expo sigue siendo la de
> producción.

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
| `reanimated` + `gesture-handler` + `draggable-flatlist` | ⚠️ Sin gestos: `@lynx-js/types` no expone `<SwipeAction>`/`<Sheet>`/`<Sortable>` y `@lynx-js/lynx-ui` no está instalado. El swipe pasó a botones explícitos y las hojas a un panel con cierre explícito |
| `victory-native` / `chart-kit` / `svg` (gráficos) | ❌ Sin equivalente directo; heatmap y barras se dibujan a mano con `<view>`/CSS |
| `expo-haptics` + animaciones de `reanimated` | ❌ Native module / sin equivalente: el descanso avisa por color, no por háptica ni pulso |
| `ViewShot` (capturar la tarjeta para compartir) | ❌ Native module: `WorkoutSummaryCard` se pinta, pero no se captura ni se comparte |
| `Intl` (`Intl.DateTimeFormat`, `toLocaleString`) | ❌ **No implementado** en Lynx; `src/lib/format.ts` formatea a mano |
| `drizzle-orm` | ⚠️ Fuga de dependencia: `src/lib/metrics.ts` importa `drizzle-orm` (los helpers SQL, que Lynx no usa) y resuelve desde el `node_modules` de la **raíz**, no desde `lynx/`. El bundle lo tree-shakea (0 kB), pero `lynx` no compila si la raíz no tiene las deps instaladas |

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
  `MuscleChip`, `StubScreen`, `Loading`/`ErrorNote` y `useLoad`. Sólo elementos Lynx
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

Son stubs **navegables** (título, nota de qué falta y los params recibidos), no
pantallas en blanco.

| Ruta | Qué falta |
|---|---|
| `routines/[id]` | Detalle editable: añadir ejercicios, supersets, reordenar |

`routines/[id]/add-exercise` y `routines/new` no están en el registro todavía:
entran con el editor de rutinas.

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


## Comandos

> Nota: en este host los shims de bun/npm en PowerShell dan guerra con stderr.
> Lanzar los binarios con `node` directamente es lo fiable.

```powershell
cd lynx
node node_modules/typescript/bin/tsc --noEmit          # typecheck
node node_modules/vitest/vitest.mjs run                # tests
node node_modules/@lynx-js/rspeedy/bin/rspeedy.js dev  # dev server (QR para Lynx Explorer)
node node_modules/@lynx-js/rspeedy/bin/rspeedy.js build # build → dist/main.lynx.bundle
```

Para ver la app: instala **Lynx Explorer** en el emulador/dispositivo y escanea el QR
que muestra `rspeedy dev`.

## Próximas fases (propuesta)

- **Fase 4 — Editor de rutinas**: `routines/[id]`, `routines/[id]/add-exercise` y
  `routines/new` sobre `routinesRepo` (añadir y quitar ejercicios, supersets,
  reordenar, targets de series/reps). Es la última ruta de pila que sigue siendo
  stub.
- **Fase 5 — Auth real**: login/signup/forgot. `src/lib/supabase.ts` ya está
  portado y solo faltan las pantallas de `app/auth`.
- **Fase 6 — Nativo**: Health Connect, notificaciones, haptics, secure-store,
  compartir (captura de `WorkoutSummaryCard`) y la decisión de SQLite.

## Decisión pendiente (importante)

La capa de datos completa de Strain es relacional (sesiones → ejercicios → sets → PRs).
Sobre KV eso escala mal para `analytics`. Hay que decidir entre:
1. **Native module SQLite** para Lynx (reutiliza Drizzle y los LOC de repos) — más
   trabajo nativo, más fiel.
2. **Repos KV + agregaciones en memoria** — más simple, pero analytics y sync sufren.
