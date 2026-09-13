# 03 · Arquitectura

## Vista por capas

```
┌─────────────────────────────────────────────────┐
│  app/                  → Pantallas (expo-router) │
├─────────────────────────────────────────────────┤
│  src/components/       → UI reusable             │
├─────────────────────────────────────────────────┤
│  src/stores/           → Estado global (Zustand) │
├─────────────────────────────────────────────────┤
│  src/lib/              → Wrappers SDK, utils     │
├─────────────────────────────────────────────────┤
│  src/db/repositories   → Acceso a datos          │
├─────────────────────────────────────────────────┤
│  src/db/               → Schema + migrations     │
└─────────────────────────────────────────────────┘
```

## Estructura de carpetas

```
strain-repo/
├── app/                        # Rutas (expo-router, file-based)
│   ├── (tabs)/                 # Tabs principales
│   │   ├── _layout.tsx
│   │   ├── index.tsx           # Home / "Hoy"
│   │   ├── exercises.tsx       # Catálogo de ejercicios
│   │   ├── routines.tsx        # Plantillas de entrenamiento
│   │   ├── history.tsx         # Histórico de workouts
│   │   ├── progress.tsx        # Métricas, heatmap, PRs
│   │   ├── health.tsx          # Health Connect dashboard
│   │   └── settings.tsx        # Preferencias, cuenta
│   ├── auth/                   # Login, signup, forgot
│   ├── workout/
│   │   ├── active.tsx          # Workout en curso
│   │   └── finish.tsx          # Pantalla de resumen final
│   ├── history/[id].tsx        # Detalle de workout + compartir
│   ├── exercises/[id].tsx      # Detalle de ejercicio + gráfica
│   └── routines/[id].tsx       # Detalle de rutina
│
├── src/
│   ├── components/             # 11 componentes reutilizables
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Heatmap.tsx
│   │   ├── MuscleChip.tsx
│   │   ├── NumericKeypad.tsx
│   │   ├── PlateCalculatorSheet.tsx
│   │   ├── RestTimer.tsx
│   │   ├── SetDetailsSheet.tsx
│   │   ├── SetRow.tsx
│   │   ├── Sidebar.tsx
│   │   └── WorkoutSummaryCard.tsx
│   │
│   ├── stores/                 # 4 stores Zustand
│   │   ├── activeWorkoutStore.ts   # Estado del workout en curso
│   │   ├── authStore.ts            # Sesión Supabase
│   │   ├── healthConnectStore.ts   # Status HC + cache métricas
│   │   └── preferencesStore.ts     # Preferencias UI, unidades
│   │
│   ├── lib/                    # Wrappers SDK y utilidades
│   │   ├── exportImport.ts     # Backup/restore JSON
│   │   ├── format.ts           # Format de fechas, números, duraciones
│   │   ├── healthConnect.ts    # Wrapper react-native-health-connect
│   │   ├── notifications.ts    # Wrapper expo-notifications
│   │   ├── plateCalculator.ts  # Cálculo de discos por barra
│   │   ├── shareWorkout.ts     # Captura + compartir workout
│   │   ├── supabase.ts         # Cliente Supabase
│   │   └── theme.ts            # Tokens de color/espaciado/tipografía
│   │
│   ├── db/
│   │   ├── schema.ts           # Tablas Drizzle
│   │   ├── migrations.ts       # Array de migraciones versionadas
│   │   ├── seam.ts             # Las interfaces de la conexión (SqliteDb, RawSqlite)
│   │   ├── bootstrap.ts        # Composition root: abre, migra, siembra y publica
│   │   ├── registry.ts         # Locator getRepos()
│   │   ├── shapes.ts           # Mapeo fila → DTO (única fuente)
│   │   ├── repos/              # Una factory por repo: exercises, routines, sessions, analytics
│   │   ├── testing/            # Adapter better-sqlite3 (tests y scripts)
│   │   └── seed.ts             # Datos iniciales (ejercicios base)
│   │
│   └── types/
│       └── domain.ts           # Tipos del dominio (User, Session, Set, Exercise…)
│
├── assets/                     # Iconos, splash, favicon
├── scripts/                    # migrate.ts, seed.ts, generate-assets.ps1
├── supabase/                   # Schema SQL y migrations
├── docs/                       # Esta documentación
└── config raíz
    ├── app.json                # Expo config + permisos Android
    ├── metro.config.js         # Alias + soporte web
    ├── babel.config.js
    ├── drizzle.config.ts
    ├── eas.json
    ├── .npmrc
    ├── pnpm-workspace.yaml
    └── tsconfig.json
```

## Flujo de datos

### Workout en curso

```
active.tsx
   ↓ lee estado
activeWorkoutStore (Zustand)
   ↓ persiste en SQLite
getRepos().sessions (repos/)         ← locator que publica bootstrap.ts
   ↓ Drizzle query sobre la seam (seam.ts)
expo-sqlite (adapter de bootstrap.ts)
```

### Health Connect

```
health.tsx (tab)
   ↓ useEffect → probe()
healthConnectStore
   ↓ invoca
healthConnect.ts (wrapper)
   ↓ SDK nativo
react-native-health-connect
```

## Path aliases

Definidos en `tsconfig.json` (TS) y replicados en `metro.config.js` (Metro para web):

| Alias | Apunta a |
|-------|----------|
| `@/*` | `src/*` |
| `@db/*` | `src/db/*` |
| `@components/*` | `src/components/*` |
| `@stores/*` | `src/stores/*` |
| `@lib/*` | `src/lib/*` |
| `@types/*` | `src/types/*` |
| `@assets/*` | `assets/*` |

> ⚠️ `@types/*` solapa con el namespace de TypeScript. Migrado en bloque previo: el código del proyecto usa `@/types/domain` en lugar de `@types/domain`.

## Modelo de datos (resumen)

Tablas principales en `src/db/schema.ts`:

- `users` — Usuario local (id, email, created_at)
- `exercises` — Catálogo (id, name, muscle_group, equipment, is_custom)
- `routines` — Plantillas (id, name, user_id)
- `routine_exercises` — Join routine ↔ exercise con orden
- `sessions` — Workout finalizado (id, user_id, started_at, ended_at, notes)
- `session_exercises` — Ejercicios dentro de una sesión (con orden)
- `sets` — Series (peso, reps, RPE, notes, is_warmup, completed_at)
- `personal_records` — PRs calculados por ejercicio

Migraciones en `src/db/migrations.ts` como array numerado; cada entry es un SQL idempotente.