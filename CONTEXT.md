# CONTEXT.md

Glosario y modelo de dominio de **Strain** (app de seguimiento de entrenamiento de fuerza,
Android-first, offline por defecto). Este documento existe para que el vocabulario del código y el de
las conversaciones sean el mismo. Si un término que necesitás no está acá, es una señal: o estás
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
Hoy solo se escribe `one_rm`, y solo al finalizar la sesión (`sessionsRepo.finish`).

**1RM estimado** — fórmula de Epley, con dos bordes que la definición única respeta:
`reps <= 0 → 0` y `reps === 1 → el propio peso` (Epley sobreestimaría ~3.3% en el único caso que
la fórmula no modela). Para el resto, `weight * (1 + reps / 30)`.

**Volume** — `Σ(weight × reps)` sobre los sets **completados**. Es la unidad de las métricas
semanales y del heatmap.

**Streak** — días consecutivos con alguna sesión `completed`, contados sobre `startedAt`.

### Conceptos de plataforma

Estos términos describen *dónde* vive la app, no el entrenamiento. Existen porque la app está pasando
de un cliente genérico a una app propia, y sin ellos las conversaciones se confunden.

**Host** — la **app Android propia** que embebe el motor Lynx y el bundle. Es lo que convierte la app
en instalable y lo que da acceso a las API nativas. Vive en `host/android/` (`specs/001`).

**Almacenamiento durable** — persistencia que sobrevive al cierre de la app, a la muerte del proceso y
al reinicio del dispositivo. Hoy **no es durable**: se pierde lo registrado al cerrar.

**Seam de almacenamiento** — la interfaz única a través de la cual los repositorios leen y escriben.
Existe para poder cambiar la implementación (memoria, ficheros, SQLite) sin tocar pantallas.

**Cuenta** — identidad del usuario en el backend (**InsForge**). Es **opcional**: sin cuenta la app
funciona igual, en local.

**Sincronización** — el envío y la traída de cambios contra InsForge. Nunca es la fuente de verdad: el
dato vive primero en local.

**Cola de sincronización** — el conjunto de cambios locales pendientes de subir. Permite registrar sin
red y subir después.

## Métricas de "mejor set"

Son **tres** métricas distintas que antes compartían el nombre «best set» y por eso divergían.
Cada una tiene su criterio, y cada una está definida **una sola vez** en el módulo `metrics`:

- **bestByOneRm** — el set con mayor 1RM estimado. Es la que decide los PR (`sessionsRepo.finish`)
  y la que expone `analyticsRepo.exerciseTimeline` como `bestOneRm`.
- **heaviestSet** — el set más pesado. Es la que muestra la pantalla de fin de entrenamiento, porque
  el usuario piensa en kilos.
- **topByVolume** — el ranking de ejercicios por volumen completado. Es la del resumen.

Las tres son **estables**: en empate gana el primero. Ninguna es «bestSet» a secas — si aparece ese
nombre en el código, es un error.

`metrics` expone además cada fórmula **dos veces**: como función pura. Los fragmentos SQL equivalentes
de la app anterior ya no existen; la equivalencia se mantiene sobre la definición pura.

## Shapes: fila ≠ DTO

Los tipos de fila viven en el módulo `db/schema` y las formas que ve la UI en `db/shapes`, que es
también **el único lugar donde se mapea de una a otra**. El vocabulario (enums y etiquetas) vive en
`types/domain`.

| Fila (DB) | DTO (UI) | Nota |
|---|---|---|
| `Set` | `SetView` | `Pick` de la fila: **mismos nombres**, sin función de mapeo |
| `Session` + ejercicios | `ActiveSessionView` | El modo activo: agrega `elapsedSeconds` y `completedSets` |
| `Session` + ejercicios | `SessionExerciseSummary` | Historial y tarjeta compartible. Misma fuente de sets que la anterior |

Reglas que sostienen esto:

- El mapeo **no inventa nombres**. `SetView.setType` se llama como la columna; si un DTO necesita
  otro nombre, es una señal de que el DTO está de más.
- El mapeo **no descarta campos declarados**. `supersetGroup` se declaraba y no se mapeaba: la UI
  de supersets del workout activo no se mostró nunca hasta que se arregló.
- `toActiveSessionView` recibe `now` como parámetro, así que es **puro** y testeable con reloj fijo.
- Los targets de rutina se copian a la sesión al iniciarla y el mapeo los lee de la fila. El mapeo no
  los fabrica: si no hay plan, son `null`. Ver D11.

## Unidades y enums

- **Units** — `kg | lb`. El default es `kg`.
- **MuscleGroup** — `chest | back | legs | shoulders | arms | core | cardio | other`.
- **Equipment** — `barbell | dumbbell | machine | cable | bodyweight | kettlebell | other`.
- **Mechanic** — `compound | isolation`.

Las etiquetas en español para mostrar al usuario viven en `MUSCLE_GROUP_LABELS` y
`EQUIPMENT_LABELS` (módulo `types/domain`). No dupliques esos strings.

## Decisiones

Las decisiones de arquitectura están en `docs/07-decisions.md` (formato ADR-light, `D1`…`Dn`).
Leé las que toquen el área antes de proponer un cambio; si tu propuesta las contradice, decilo
explícitamente en vez de pisarlas. Las que más tocan hoy son **D13** (retirada de la app anterior),
**D14** (host nativo y almacenamiento durable) y **D17** (promoción a la raíz con la etiqueta como
red).
