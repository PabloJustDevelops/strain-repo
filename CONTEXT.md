# CONTEXT.md

Glosario y modelo de dominio de **Strain** (app de seguimiento de entrenamiento de fuerza,
Android-first, offline por defecto). Este documento existe para que el vocabulario del código y el
de las conversaciones sean el mismo. Si un término que necesitás no está acá, es una señal: o estás
inventando lenguaje que el proyecto no usa, o hay un hueco real que conviene resolver y anotar.

## Vocabulario

**Exercise** — ítem del catálogo. Tiene `muscleGroup`, `equipment` y `mechanic`. Es *global*
(`user_id` nulo, parte del seed) o *custom* (creado por el usuario, `isCustom`).

**Routine** — plantilla de entrenamiento reutilizable. No registra nada: describe qué hacer.

**Routine Exercise** — un Exercise dentro de una Routine, con sus *targets*: `targetSets`,
`targetReps`, `targetWeight`, `restSeconds`, más `orderIndex` y `supersetGroup`.

**Session** — la ejecución real de un entrenamiento. Máquina de estados:
`active → completed` (al finalizar) o `active → discarded`. Guarda agregados propios:
`totalVolume`, `totalSets`, `durationSeconds`.

**Session Exercise** — un Exercise dentro de una Session, con `orderIndex`, `supersetGroup` y un
**snapshot de los targets** de la rutina: `targetSets`, `targetReps`, `restSeconds`. Es una fila
distinta de Routine Exercise: una es el plan, la otra lo que pasó. El snapshot es lo que hace
inmutable la sesión: editar o borrar la rutina después no cambia lo ya ejecutado. `null` en los
targets significa que la sesión no vino de una rutina — no un plan por defecto.

**Set** — una serie concreta. `setType` ∈ `warmup | working | failure | dropset`, más `weight`,
`reps`, `isCompleted`, `completedAt`, `rpe`, `notes`.

**Superset** — agrupa ejercicios adyacentes bajo una letra (`"A"`, `"B"`…). Dos ejercicios con la
misma letra se ejecutan en alternancia y se descansa al cerrar el grupo.

**Personal Record (PR)** — `recordType` ∈ `one_rm | max_volume | max_reps | max_weight`.
Hoy solo se escribe `one_rm`, y solo al finalizar la sesión (`SessionsRepo.finish`).

**1RM estimado** — fórmula de Epley, con dos bordes que la definición única respeta:
`reps <= 0 → 0` y `reps === 1 → el propio peso` (Epley sobreestimaría ~3.3% en el único caso que
la fórmula no modela). Para el resto, `weight * (1 + reps / 30)`.

**Volume** — `Σ(weight × reps)` sobre los sets **completados**. Es la unidad de las métricas
semanales y del heatmap.

**Streak** — días consecutivos con alguna sesión `completed`, contados sobre `startedAt`.

## Métricas de "mejor set"

Son **tres** métricas distintas que antes compartían el nombre «best set» y por eso divergían.
Cada una tiene su criterio, y cada una está definida **una sola vez** en `src/lib/metrics.ts`:

- **bestByOneRm** — el set con mayor 1RM estimado. Es la que decide los PR (`SessionsRepo.finish`)
  y la que expone `AnalyticsRepo.exerciseTimeline` como `bestOneRm`.
- **heaviestSet** — el set más pesado. Es la que muestra la pantalla de resumen
  (`app/workout/finish.tsx`), porque el usuario piensa en kilos.
- **topByVolume** — el ranking de ejercicios por volumen completado. Es la del
  `WorkoutSummaryCard`.

Las tres son **estables**: en empate gana el primero. Ninguna es «bestSet» a secas — si aparece ese
nombre en el código, es un error.

`metrics.ts` expone además cada fórmula **dos veces**: como función pura (TS) y como fragmento SQL
(`oneRmSql`, `setVolumeSql`). No pueden divergir porque el test de equivalencia
(`src/lib/metrics.test.ts`) corre los dos caminos sobre la misma tabla de casos.

## Shapes: fila ≠ DTO

Los tipos de fila viven en `src/db/schema.ts` y las formas que ve la UI en `src/db/shapes.ts`,
que es también **el único lugar donde se mapea de una a otra**. El vocabulario (enums y etiquetas)
vive en `src/types/domain.ts`.

| Fila (DB) | DTO (UI) | Nota |
|---|---|---|
| `Set` | `SetView` | `Pick` de la fila: **mismos nombres**, sin función de mapeo |
| `WorkoutSession` + ejercicios | `ActiveSessionView` | El modo activo: agrega `elapsedSeconds` y `completedSets` |
| `WorkoutSession` + ejercicios | `SessionExerciseSummary` | Historial y tarjeta compartible. Misma fuente de sets que la anterior |

Reglas que sostienen esto:

- El mapeo **no inventa nombres**. `SetView.setType` se llama como la columna; si un DTO necesita
  otro nombre, es una señal de que el DTO está de más.
- El mapeo **no descarta campos declarados**. `supersetGroup` se declaraba y no se mapeaba: la UI
  de supersets del workout activo no se mostró nunca hasta que C2 lo arregló.
- `toActiveSessionView` recibe `now` como parámetro, así que es **puro** y testeable con reloj fijo.
- Los targets de rutina se copian a la sesión al iniciarla y el mapeo los lee de la fila. El mapeo no
  los fabrica: si no hay plan, son `null`. Ver D11.

## Unidades y enums

- **Units** — `kg | lb`. El default es `kg`.
- **MuscleGroup** — `chest | back | legs | shoulders | arms | core | cardio | other`.
- **Equipment** — `barbell | dumbbell | machine | cable | bodyweight | kettlebell | other`.
- **Mechanic** — `compound | isolation`.

Las etiquetas en español para mostrar al usuario viven en `MUSCLE_GROUP_LABELS` y
`EQUIPMENT_LABELS` (`src/types/domain.ts`). No dupliques esos strings.

## Decisiones

Las decisiones de arquitectura están en `docs/07-decisions.md` (formato ADR-light, `D1`…`Dn`).
Leé las que toquen el área antes de proponer un cambio; si tu propuesta las contradice, decilo
explícitamente en vez de pisarlas.
