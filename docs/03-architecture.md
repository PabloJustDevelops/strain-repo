# 03 · Arquitectura

## Vista por capas

```
┌──────────────────────────────────────────────────────────┐
│  screens/            → Pantallas                         │
├──────────────────────────────────────────────────────────┤
│  components/         → UI reutilizable                   │
├──────────────────────────────────────────────────────────┤
│  stores/             → Estado global (Zustand)           │
├──────────────────────────────────────────────────────────┤
│  lib/                → Lógica pura de dominio y formato  │
├──────────────────────────────────────────────────────────┤
│  db/*Repo            → Repositorios (interfaces)         │
├──────────────────────────────────────────────────────────┤
│  db/ storage + schema → Seam de almacenamiento           │
└──────────────────────────────────────────────────────────┘
```

La regla que sostiene todo: **la UI no habla con el almacenamiento, habla con repos**. Esa frontera es
lo que permite sustituir la persistencia (hoy no durable) por el módulo nativo del
[`specs/001`](../specs/001-host-nativo-y-almacenamiento-durable.md) sin tocar ninguna pantalla.

## Estructura de carpetas (proyecto Lynx)

```
lynx/
├── lynx.config.ts              # Rspeedy: plugin ReactLynx, targets web + lynx, alias
├── src/
│   ├── app/
│   │   └── routes.tsx          # Registro de rutas (no hay file-based routing en Lynx)
│   ├── screens/                # 14 pantallas: home, routines, exercises, progress,
│   │                           #   settings, health, history/[id], exercises/[id],
│   │                           #   routines/new, routines/[id], routines/[id]/add-exercise,
│   │                           #   workout/active, workout/finish, session detail
│   ├── components/             # Shell, Screen, Card, Button, Text, Icon, ListRow,
│   │                           #   SectionHeader, StatBlock, PrimaryActionBar, Chip,
│   │                           #   SegmentedControl, EmptyState, HistoryList, SetRow,
│   │                           #   RestTimer, PlateCalculatorSheet, NumericKeypad,
│   │                           #   SetDetailsSheet, ExercisePickerModal,
│   │                           #   WorkoutSummaryCard, Heatmap, Sheet
│   ├── stores/                 # activeWorkout, preferences, healthConnect, auth
│   ├── lib/                    # theme, useTheme, format, metrics, weeks,
│   │                           #   plateCalculator, supersets, personalRecords, labels,
│   │                           #   keypad, rest, sessionSummary, heatmap, routineEditor,
│   │                           #   router, reactKeys, id, useLoad, bottomSheet,
│   │                           #   swipeActions, notifications*, healthConnect*, supabase*
│   ├── db/
│   │   ├── storage.ts          # La seam (`Storage`). Hoy: memoria + session storage
│   │   ├── kv.ts               # Utilidades sobre la seam
│   │   ├── schema.ts           # Interfaces planas 1:1 con el modelo relacional
│   │   ├── seed.ts             # Catálogo inicial (47 ejercicios)
│   │   ├── exercisesRepo.ts    # Repos sobre la seam (mismas interfaces que antes)
│   │   ├── routinesRepo.ts
│   │   ├── sessionsRepo.ts
│   │   ├── analyticsRepo.ts
│   │   ├── shapes.ts           # Mapeo fila → DTO (única fuente)
│   │   └── index.ts
│   ├── types/                  # Tipos del dominio
│   ├── test/                   # `jsxCapture.ts` (arnés de JSX) y setup
│   ├── App.tsx / index.tsx     # Arranque: bootstrap de datos antes del primer render
│   └── App.css                 # Solo layout: color y tipografía viven en los tokens
├── package.json / bun.lock
└── tsconfig.json / vitest.config.mts
```

> `notifications*`, `healthConnect*` y `supabase*` son hoy **puentes** hacia APIs nativas que aún no
> existen en un host propio; su implementación son los specs
> [`002`](../specs/002-nativas-notificaciones-y-health-connect.md) y
> [`003`](../specs/003-auth-y-cuenta-con-insforge.md).

## Navegación: registro de rutas propio

Lynx no trae enrutado por ficheros, así que hay un **registro de rutas** (`app/routes.tsx`) que mapea
nombre de ruta → pantalla, y un `Shell` que pinta el tope de la pila.

- **5 pestañas**: Hoy, Rutinas, Ejercicios, Progreso y Ajustes.
- **Salud** es una ruta de pila que se abre desde Ajustes.
- **Historial** ya no es pestaña: la lista de sesiones es un bloque dentro de Progreso, sobre el
  componente compartido `HistoryList` (que también usa la pantalla de historial).
- Las rutas de pila muestran un título humano, no el identificador técnico.

## Flujo de datos

### Entrenamiento en curso

```
WorkoutActiveScreen
   ↓ lee estado
useActiveWorkout (Zustand)   ← único dueño del descanso
   ↓ persiste
sessionsRepo
   ↓
storage (seam)  →  hoy memoria + session storage  →  (specs/001) SQLite nativo
```

### Mapeo fila → DTO

El mapeo vive en un solo sitio (`db/shapes.ts`). Reglas que se respetan:

- **no inventa nombres** ni valores: los *targets* de la sesión se copian al iniciar y se leen de la
  fila; si no hay plan, son `null`, no un valor por defecto fabricado (ver `D11` en
  [07-decisiones](./07-decisions.md));
- **no descarta campos declarados**;
- las funciones de mapeo son **puras** (reciben `now` como parámetro), así que se testean con reloj
  fijo.

## Alias de paths

Definidos en `tsconfig.json` y replicados en `lynx.config.ts` para que Rspeedy resuelva lo mismo:

| Alias | Apunta a |
|-------|----------|
| `@/*` | `src/*` |
| `@db`, `@db/*` | `src/db*` |
| `@components/*` | `src/components/*` |
| `@stores/*` | `src/stores/*` |
| `@lib/*` | `src/lib/*` |
| `@types/*` | `src/types/*` |
| `@assets/*` | `src/assets/*` |

## Modelo de datos (resumen)

El vocabulario está en [`CONTEXT.md`](../CONTEXT.md). Las entidades:

- `Exercise` — catálogo (global del seed o custom del usuario).
- `Routine` / `Routine Exercise` — la plantilla y sus *targets*.
- `Session` / `Session Exercise` — la ejecución real, con **snapshot** de los targets y máquina de
  estados `active → completed | discarded`.
- `Set` — la serie, con tipo, peso, reps, RPE y notas.
- `Personal Record` — PRs derivados (hoy, 1RM estimado).

## Sistema de diseño

Tokens **por rol** (no por apariencia): `bg`, `surface`, `surfaceRaised`, `border`, `textPrimary`,
`textSecondary`, `accent`, `onAccent`, `success`, `warn`, `danger`. Seis pasos tipográficos, cuatro de
espaciado (`4 / 8 / 16 / 24 / 36`), tres radios y dos duraciones. Dos reglas que el sistema hace
cumplir y que están cubiertas por tests:

- **Toda longitud lleva unidad** (`'16px'`): el motor Lynx rechaza longitudes sin unidad, también
  inline.
- **El acento es una acción, no decoración**: solo la acción primaria de cada pantalla y lo
  seleccionado lo usan.
