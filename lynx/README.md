# Strain en Lynx — migración por fases

Reescritura de la app Expo/React Native de Strain sobre **Lynx + ReactLynx + Rspeedy**.
La app original en la raíz del repo **sigue intacta**: esto vive en `lynx/` como
migración incremental.

> Estado: **Fase 2 (router + shell + pestañas) completada**. Fase 3 (UI core) en curso.
> La app Expo sigue siendo la de producción.

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
| `reanimated` + `gesture-handler` + `draggable-flatlist` | ⚠️ Reescribir con Main Thread Script / `<Sortable>`/`<SwipeAction>` de Lynx UI |
| `victory-native` / `chart-kit` / `svg` (gráficos) | ❌ Sin equivalente directo |
| `Intl` (`Intl.DateTimeFormat`, `toLocaleString`) | ❌ **No implementado** en Lynx; `src/lib/format.ts` formatea a mano |

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
| `exercises/[id]` | Ficha del ejercicio: historial, PRs, progresión |
| `workout/active` | Modo activo completo: registrar series, descanso, supersets |
| `workout/finish` | Resumen de cierre y sincronización con Health Connect |

### Gates Fase 2

- `tsc --noEmit` → exit 0
- `vitest run` → 18/18 passed
- `rspeedy build` → `dist/main.lynx.bundle` (250.3 kB)

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

- **Fase 3 — UI core**: portar `SetRow` (necesita gestos: Lynx UI `<SwipeAction>`,
  no `reanimated`), las hojas de detalle, el keypad de peso/reps, y completar las
  cuatro rutas de pila que hoy son stub.
- **Fase 4 — Datos completos**: portar `routines`, `sessions`, `analytics` a la seam
  KV, o decidir construir el native module SQLite y reutilizar los repos Drizzle.
- **Fase 5 — Nativo**: Health Connect, notificaciones, haptics, secure-store como
  native modules. Gráficos (decisión: custom element SVG/canvas o librería).

## Decisión pendiente (importante)

La capa de datos completa de Strain es relacional (sesiones → ejercicios → sets → PRs).
Sobre KV eso escala mal para `analytics`. Hay que decidir entre:
1. **Native module SQLite** para Lynx (reutiliza Drizzle y los LOC de repos) — más
   trabajo nativo, más fiel.
2. **Repos KV + agregaciones en memoria** — más simple, pero analytics y sync sufren.
