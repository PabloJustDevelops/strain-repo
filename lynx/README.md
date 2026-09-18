# Strain en Lynx — migración por fases

Reescritura de la app Expo/React Native de Strain sobre **Lynx + ReactLynx + Rspeedy**.
La app original en la raíz del repo **sigue intacta**: esto vive en `lynx/` como
migración incremental.

> Estado: **Fase 4 (sistema de UI sobre `@lynx-js/lynx-ui`) en curso**. Quedan el
> editor de rutinas, la auth real y los native modules. La app Expo sigue siendo
> la de producción. El diseño y los tokens están en la sección
> [Sistema de UI](#sistema-de-ui).

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
| `reanimated` + `gesture-handler` + `draggable-flatlist` | ⚠️ Parcial: `@lynx-js/lynx-ui` **sí está instalado** y aporta hoja con arrastre, botón, switch e inputs (ver [Sistema de UI](#sistema-de-ui)). El swipe de las series sigue siendo botones explícitos y el reordenar de rutinas (Sortable) entra con el editor |
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


## Sistema de UI (Fase 4, en curso)

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
| `Sortable` | — | ⏳ entra con el editor de rutinas |
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

- `node node_modules/typescript/bin/tsc --noEmit` → exit 0
- `node node_modules/vitest/vitest.mjs run` → 10 ficheros / **66 tests** (eran 47)
- `node node_modules/@lynx-js/rspeedy/bin/rspeedy.js build` →
  `dist/main.lynx.bundle` **451.8 kB**

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
- Editor de rutinas (`Sortable`), auth (`InputOTP`) y los nativos.


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

- **Fase 4.1 — Swipe y listas**: `SwipeAction` en la fila de serie y `List` en las
  pantallas de lista, más `Presence` donde aporte (ver "Lo que queda").
- **Fase 5 — Editor de rutinas**: `routines/[id]`, `routines/[id]/add-exercise` y
  `routines/new` sobre `routinesRepo` (añadir y quitar ejercicios, supersets,
  reordenar con `Sortable`, targets de series/reps). Es la última ruta de pila que
  sigue siendo stub.
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
