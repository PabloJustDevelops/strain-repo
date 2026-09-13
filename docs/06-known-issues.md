# 06 · Problemas conocidos y workarounds

## Sesión actual (levantar web)

### 1. `react-native-web` no estaba instalado

**Síntoma**:

```
CommandError: It looks like you're trying to use web support but don't have the required dependencies installed.
Please install react-native-web@~0.19.13
```

**Causa**: el proyecto se desarrolló solo con builds Android; `react-native-web` nunca se añadió.

**Fix**: `pnpm add react-native-web@~0.19.13`.

---

### 2. `metro.config.js` → recursión infinita en `resolveRequest`

**Síntoma**:

```
Metro error: Maximum call stack size exceeded
Call Stack
  String.match (<anonymous>)
  Object.config.resolver.resolveRequest (metro.config.js)   ← recursión
  Object.config.resolver.resolveRequest (metro.config.js)
  ...
```

**Causa**: el código original hacía `return config.resolver.resolveRequest(...)`. Pero `config.resolver.resolveRequest` ya está apuntando a la función que estamos definiendo → bucle infinito.

**Fix**: usar `context.resolveRequest(context, moduleName, platform)` (API moderna de Metro). El alias ya no delega a sí mismo.

Ver [`metro.config.js`](./../metro.config.js).

---

### 3. `@babel/runtime/helpers/interopRequireDefault` no encontrado

**Síntoma**:

```
Metro error: Unable to resolve module @babel/runtime/helpers/interopRequireDefault from app/(tabs)/_layout.tsx
```

**Causa**: pnpm aísla las dependencias transitivas. Por defecto, `@babel/runtime` queda en `node_modules/.pnpm/...` y Metro no lo ve sin hoist explícito.

**Fix**: añadir `public-hoist-pattern[]=@babel/runtime*` al [`.npmrc`](./../.npmrc) y correr `pnpm install`.

> Nota: el `.npmrc` ya tenía hoist para `*expo*`, `*react*`, etc., pero faltaba `@babel/runtime`. Si más módulos dan error tipo "Unable to resolve module …", añadirlos aquí.

---

## Históricos del repo (resueltos)

### 4. `@kingstinct/react-native-health-connect` 404 en npm

**Causa**: ese paquete **no existe en el registry público**. Aparece en blogs y guías pero nunca se publicó.

**Fix**: usar `react-native-health-connect@3.5.3` (mantenido por `matinzd`).

### 5. `HealthConnect.SdkAvailabilityStatus` no es un tipo, es un valor

**Síntoma**: TS2749 en `checkAvailability()`.

**Fix**: tipar el retorno como `Promise<number>` directamente.

### 6. `Permission[]` no acepta unión de subtipos

**Síntoma**: TS error al pasar `[readSteps, readHR, writeExercise, writeRoute]` juntos.

**Causa**: la librería tipa cada permission por separado y no tiene unión.

**Fix**: declarar tipo local:

```ts
type HealthPermission =
  | HealthConnect.Permission
  | HealthConnect.WriteExerciseRoutePermission
  | HealthConnect.BackgroundAccessPermission
  | HealthConnect.ReadHealthDataHistoryPermission;
```

### 7. `HealthConnect.ExerciseType.RESISTANCE_TRAINING` no existe

**Fix**: usar `HealthConnect.ExerciseType.WEIGHTLIFTING` (= 81 en el enum oficial).

### 8. `View` no importado en `shareWorkout.ts`

**Síntoma**: error TS en `CardRef`.

**Fix**: `import type { View } from 'react-native'` y `type CardRef = View | null`.

### 9. El descanso de supersets arrancaba en cada set

**Causa**: `completeSet` arrancaba el descanso en todo set completado, pero `CONTEXT.md` define el
Superset como «se ejecutan en alternancia y se descansa al cerrar el grupo». En A/B alternado el timer
arrancaba justo entre A1→B1, que es el momento en que no se descansa. Además, el armado de grupos en
la sesión activa hardcodeaba la letra `A`, así que dos supersets del mismo entrenamiento se fusionaban
en un grupo `A` no contiguo.

**Fix**: `src/lib/supersets.ts` define la regla y la letra libre, con una sola definición compartida
entre la sesión activa y el builder de rutinas. `supersetRestOwner` devuelve el ejercicio cuyo
descanso corresponde arrancar, así el `restSeconds` que se usa es el del ejercicio que cierra la
ronda. Issue #2.

---

## Problemas estructurales abiertos (no resueltos)

| # | Issue | Impacto | Workaround |
|---|-------|---------|------------|
| A | **No hay tests automatizados**. Toda la lógica crítica (repos, stores, cálculo de PR) está sin cobertura. | Riesgo de regresiones al refactorizar. | Pendiente decidir Jest vs Vitest y empezar por repositories. |
| B | **Versiones de Expo SDK 52 desalineadas**. `react-native@0.76.0`, `safe-area-context@5.0.0`, `screens@4.0.0`, `view-shot@5.1.0` no son las que Expo espera. | Mensaje "may not work correctly" al arrancar. Build Android funciona; web warning-only. | Pendiente migración a SDK 52 patch o SDK 53. |
| C | **Cambios sin commitear del usuario** (no míos). Hay ~25 archivos modificados en `git status` previos a este bloque: `auth/*`, `exercises/*`, `db/*`, varios `components/*`, `tsconfig.json`, etc. | Dificulta el `git pull` limpio. | El usuario debe revisarlos y commitear cuando quiera. Yo no los he tocado. |
| D | **`expo-sqlite@15.0.6` vs `~15.1.4` esperado**. | Posibles bugs con la API async nueva. | Funciona en builds actuales; pendiente bumpear. |
| E | **Web solo para dev**. No hay build de producción afinado para web. | La app no es usable públicamente desde URL pública. | Aceptado: producto es Android-first. |
| F | **`session_exercises` divergente entre SQLite y Supabase**. D11 agregó `target_sets`, `target_reps` y `rest_seconds` sólo al esquema local: `supabase/migrations/initial_app_schema.sql` y `supabase/schema.sql` no las tienen. | Cuando se implemente el sync, los targets no viajan a la nube. Hoy no impacta: `pushPendingChanges` es un stub y ningún repo escribe `sync_queue`. | Al implementar el sync, agregar una migración idempotente en `supabase/migrations/`. Decisión D11. |
| H | **La regla "el primer set es warmup" está duplicada**: `SessionsRepo.start` (`s === 1 ? ...`) y `exportImport` (`i === 0 ? ...`). | Puede divergir sin que nadie lo note. | Unificar en una sola definición cuando se toque alguno de los dos caminos. |
| I | **`BetterSqliteStack.seam` se devuelve y ningún consumidor lo lee** (Speculative Generality del `/code-review`). | Superficie sin uso en el adapter de tests. | Borrarlo si sigue sin consumidor en el próximo review. |

---

## Decisiones de fix pendientes

- Decidir si bumpear todo el bloque de versiones a las esperadas por Expo SDK 52 (puede romper cosas, hacer con cuidado).
- Empezar a escribir tests unitarios al menos del repositorio principal (`SessionsRepo`).
- Revisar y commitear los archivos modificados sin commitear del usuario antes de mergear a main.