# Strain

App multiplataforma (Web + Android) para seguimiento de entrenamientos de gimnasio, estilo Hevy, construida con **un único código base** en Expo + TypeScript.

## Características

- 💪 **Biblioteca de ejercicios** con categorización por grupo muscular y equipo
- 🏋️ **Builder de rutinas** con drag-to-reorder
- ⏱️ **Modo workout activo** con timer, descanso automático, calculadora de discos y gestos swipe
- 📈 **Progreso** con gráficos de volumen, PRs (1RM estimado) y racha de consistencia
- 📅 **Historial** filtrable de todos los workouts
- 💾 **Local-first**: todo funciona offline con SQLite (expo-sqlite + Drizzle)
- ☁️ **Sync opcional** entre dispositivos vía Supabase
- 🌗 Tema claro/oscuro siguiendo el sistema
- 📲 Haptic feedback, soporte landscape, layout adaptativo (stack en móvil, side-by-side en desktop)

## Stack técnico

- **Expo SDK 52** + **expo-router 4** (file-based routing)
- **React Native 0.76** + **Reanimated 3** (gestos y animaciones)
- **expo-sqlite** + **Drizzle ORM** (storage local, type-safe)
- **Zustand** (estado)
- **Supabase** (auth + sync opcional)
- **react-native-chart-kit** (gráficos)

## Estructura del proyecto

```
strain-repo/
├── app/                        # expo-router (file-based)
│   ├── _layout.tsx             # Root layout (inicializa BD, tema)
│   ├── (tabs)/                 # Grupo con bottom tabs / sidebar
│   │   ├── _layout.tsx
│   │   ├── index.tsx           # Hoy (Home)
│   │   ├── routines.tsx        # Lista de rutinas
│   │   ├── exercises.tsx       # Biblioteca de ejercicios
│   │   ├── history.tsx         # Historial de workouts
│   │   ├── progress.tsx        # Gráficos + PRs + streak
│   │   └── settings.tsx        # Ajustes + datos
│   ├── workout/
│   │   ├── active.tsx          # Pantalla principal de workout activo
│   │   └── finish.tsx          # Resumen tras finalizar
│   ├── exercises/[id].tsx      # Detalle de ejercicio
│   └── routines/[id].tsx       # Detalle/editor de rutina
│
├── src/
│   ├── components/             # UI reutilizable
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Sidebar.tsx         # Sidebar para desktop
│   │   ├── SetRow.tsx          # Fila con swipe-to-complete
│   │   ├── RestTimer.tsx       # Timer flotante de descanso
│   │   ├── PlateCalculatorSheet.tsx
│   │   └── MuscleChip.tsx
│   ├── db/                     # Capa de datos (Drizzle + SQLite)
│   │   ├── schema.ts           # Tablas y relaciones
│   │   ├── client.ts           # Conexión singleton
│   │   ├── repositories.ts     # CRUD + lógica de dominio
│   │   ├── migrations.ts       # Migraciones SQL idempotentes
│   │   └── seed.ts             # Catálogo inicial de ejercicios
│   ├── stores/                 # Estado global (Zustand)
│   │   ├── preferencesStore.ts
│   │   └── activeWorkoutStore.ts
│   ├── types/                  # Tipos compartidos del dominio
│   │   └── domain.ts
│   └── lib/                    # Utilidades
│       ├── format.ts           # Formato de fechas, pesos, duraciones
│       ├── plateCalculator.ts  # Cálculo de discos
│       ├── theme.ts            # Tokens de tema claro/oscuro
│       ├── exportImport.ts     # Backup JSON/CSV + importador Hevy
│       └── supabase.ts         # Cliente opcional de Supabase
│
├── supabase/
│   └── schema.sql              # Esquema espejo para Supabase + RLS
├── assets/                     # Iconos, splash, imágenes
├── app.json                    # Config Expo
├── eas.json                    # Config EAS Build
├── tsconfig.json               # Alias: @, @db, @components, @stores, @lib
├── babel.config.js
└── metro.config.js
```

## Primeros pasos

### 1. Instalar dependencias

```bash
npm install
```

### 2. Ejecutar en desarrollo

```bash
# Web
npm run web

# iOS
npm run ios

# Android
npm run android
```

### 3. Build de producción

```bash
# Web (Vercel / estático)
npm run build:web

# Mobile (iOS + Android)
npm run build:production
```

### 4. Configurar Supabase (opcional)

Solo si quieres sincronizar entre dispositivos:

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ejecuta `supabase/schema.sql` en el SQL Editor
3. Copia `.env.example` a `.env` y rellena:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
4. Reinicia la app y ve a Settings → Sincronizar

## Decisiones de arquitectura

### ¿Por qué SQLite local-first?

- Cero latencia al registrar sets (UX crítica en el gym)
- Funciona 100% offline (gimnasios sin WiFi, modo avión, roaming)
- La sincronización con la nube es opcional y por demanda
- Los datos son tuyos: exportar en JSON/CSV en cualquier momento

### ¿Por qué Drizzle y no Prisma?

Drizzle genera SQL plano en lugar de un ORM pesado. Es 100% compatible con expo-sqlite, tiene mejor rendimiento en móvil y los tipos se infieren de las definiciones de tabla.

### Flujo de un workout

1. Usuario abre `/` (Hoy) o `/routines`
2. Pulsa "Empezar" → `SessionsRepo.start()` crea filas en `workout_sessions`, `session_exercises` y `sets`
3. Store `useActiveWorkout` mantiene la sesión en memoria con optimistic updates
4. Cada `completeSet` actualiza el store local + BD + recalcula totales
5. Al finalizar: `SessionsRepo.finish()` cierra la sesión, recalcula PRs (1RM por fórmula de Epley)

### Layout adaptativo

- `< 1024px` (móvil / tablet): bottom tabs + stacks
- `>= 1024px` (web / desktop): sidebar fijo a la izquierda + contenido a la derecha
- Detección: `useWindowDimensions().width` en cada layout relevante

## Roadmap

- [ ] Notificaciones push (recordatorios de entrenamiento)
- [ ] Widget para iOS/Android con próximo workout
- [ ] Apple Health / Google Fit integration
- [ ] Generación de gráficos de líneas por ejercicio (victory-native)
- [ ] Compartir workout como imagen
- [ ] Apple Watch companion app
- [ ] Temas personalizables

## Licencia

MIT
