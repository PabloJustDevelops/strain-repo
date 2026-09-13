# 10 · C6 — Targets de rutina en la sesión

> **Estado**: decisiones resueltas (grilling) e implementadas — `f339c5a` (schema + persistencia),
> `f1e1d0b` (mapeo + descanso), `5595e9e` (tests). La §9 es el registro de las decisiones.
> **Issue**: [#1 · C6 · Targets de rutina en la sesión](https://github.com/PabloJustDevelops/strain-repo/issues/1)
> — publicado y cerrado; este doc queda como borrador y registro de los hechos verificados.
> **Origen**: candidate C6 del review de arquitectura (`/improve-codebase-architecture`).

---

## 1. El problema en una frase

La rutina define `restSeconds`, `targetSets` y `targetReps` por ejercicio, `SessionsRepo.start` los
**recibe y los tira**, y el mapeo a la UI los reemplaza por un `90` fijo y un `'-'`.

## 2. Hechos verificados

**`SessionsRepo.start` recibe los targets y persiste sólo algunos.** El input
(`src/db/repos/sessions.ts`) es:

```ts
fromRoutineExercises?: {
  exerciseId: string;
  targetSets: number;
  targetReps: string;
  targetWeight?: number;
  restSeconds: number;
  supersetGroup?: string | null;
}[];
```

y el insert sólo escribe `exerciseId`, `orderIndex` y `supersetGroup`. `targetSets` se usa nada más
que para el loop que siembra sets. **`targetReps`, `targetWeight` y `restSeconds` no se guardan en
ningún lado.**

**`session_exercises` no tiene columnas para ellos.** Esquema (`src/db/schema.ts`): `id`, `sessionId`,
`exerciseId`, `orderIndex`, `supersetGroup`, `notes`.

**El mapeo los hardcodea** (`src/db/shapes.ts`, `toActiveSessionView`):

```ts
targetSets: ex.sets.length,   // "cuántos sets hay", no la intención de la rutina
targetReps: '-',
restSeconds: 90,              // ← el número real se perdió al persistir
```

Hay un test que **fija este comportamiento actual a propósito**
(`src/db/shapes.test.ts`, «deja el target de descanso como default fijo»), con un comentario que
dice que es C6 — así el cambio queda visible el día que se haga.

**El descanso se arranca desde dos lugares con la misma constante.**

- `src/stores/activeWorkoutStore.ts`, `completeSet`: `get().startRest(90); // TODO: obtener rest del ejercicio`
- `app/workout/active.tsx`, dos sitios: `startRest(exercise.restSeconds)` (que hoy es el 90 mapeado)

O sea: dos caminos, un solo número, ninguno de los dos correcto. El de la pantalla gana por orden de
ejecución, pero ambos están mal.

**Lo único con consumidor real es `restSeconds`.** `targetSets` y `targetReps` del modo activo **no los
lee nadie**: el único lugar que muestra `targetSets × targetReps` es la pantalla de rutina
(`app/routines/[id].tsx:96`), y ahí los lee de la **fila de la rutina**, no de la sesión.

**Se necesita persistencia, no sólo memoria.** `loadActive()` rehidrata desde la base al abrir
`/workout/active`. Un arreglo que sólo pase los targets por el store se pierde al reiniciar la app.

**El espejo de Supabase también los ignora.** `supabase/migrations/initial_app_schema.sql` define
`session_exercises` con `order_index`, `superset_group` y `notes`; tampoco tiene targets.

**La migración nueva sería la id 3.** El array de `src/db/migrations.ts` llega hoy hasta la id 2.

## 3. Por qué es más grande de lo que decía el reporte

El reporte lo resumía como «un `90` duplicado en tres lugares». En realidad hay **un cambio de
schema**: sin columnas, los targets no sobreviven el ciclo de vida de la sesión, y la decisión no se
puede tomar sólo en el mapeo.

## 4. Cambio propuesto (borrador, sujeto al grilling)

1. **Migración id 3**: `ALTER TABLE session_exercises ADD COLUMN rest_seconds INTEGER NOT NULL DEFAULT 90;`
   (+ `target_sets`/`target_reps` si el grilling los aprueba — ver D1).
2. **`SessionsRepo.start`** escribe lo que ya recibe, en vez de descartarlo.
3. **`addSessionExercise`** acepta los mismos targets (para el import y para agregar ejercicios a mano).
4. **`toActiveSessionView`** los lee de la fila en vez de hardcodearlos.
5. **Un solo lugar arranca el descanso**, con el valor real. Candidato: el store, que ya tiene la
   sesión mapeada; se borra el `startRest` duplicado de la pantalla.
6. **Espejo de Supabase**: decidir si las columnas nuevas también van a `supabase/migrations/`.

> Resuelto en la §9: el punto 3 se descartó (D7) y el 6 también (D5). Los otros cuatro se
> implementaron tal como estaban planteados.

## 5. Frontera a grillear (decisiones abiertas)

- **D1 — ¿Qué se persiste?** Sólo `rest_seconds` (único con consumidor) o también `target_sets` /
  `target_reps` (hoy sin consumidor → sería superficie especulativa).
- **D2 — Semántica de `targetSets`.** ¿La intención de la rutina, o «cuántos sets hay» (lo que
  devuelve hoy `ex.sets.length`)? Divergen en cuanto el usuario agrega un set a mitad de sesión.
- **D3 — Nulos y fallback.** Una sesión vacía o importada no tiene targets. ¿`NULL` + fallback a 90 en
  el mapeo, o `NOT NULL DEFAULT 90` y se pierde la distinción?
- **D4 — Quién arranca el descanso.** El store o la pantalla (hoy los dos). Un solo dueño.
- **D5 — Supabase.** ¿Se replica la migración en `supabase/migrations/`? ¿Los archivos de ahí son
  idempotentes y re-ejecutables como los locales?
- **D6 — Backfill.** Las filas existentes quedan con el default; ¿alcanza?

## 6. Verificación

- El test que hoy fija `[90, 90]` y `['-', '-']` **tiene que cambiar**: es la señal de que el fix
  llegó.
- Caso nuevo en `sessions.test.ts`: iniciar desde rutina con `restSeconds: 120`, **recargar la
  sesión** (`getFullSession`) y confirmar que el 120 sobrevivió — es la prueba de que la persistencia
  funciona, no sólo el paso por memoria.
- Caso de fallback: una sesión sin targets (import) cae al default sin romper.
- La migración id 3 se aplica sola en los tests, porque el adapter in-memory corre el array real.

## 7. Hallazgos del review que tocan esta área

Del `/code-review` de la fase anterior, sin resolver y relacionados:

- **Duplicated Code**: la regla «el primer set es warmup» está en `SessionsRepo.start`
  (`s === 1 ? 'warmup' : 'working'`) y otra vez en `exportImport` (`i === 0 ? ...`).
- **Speculative Generality**: `BetterSqliteStack.seam` se devuelve y ningún consumidor lo lee.

## 8. Contexto que no hay que re-descubrir

- La sesión se mapea en **un solo lugar**: `src/db/shapes.ts` (`toActiveSessionView`). No hay otra
  proyección desde C2.
- Los targets viajan rutina → `start` → (hoy se pierden). El nombre del input,
  `fromRoutineExercises`, es el punto exacto donde hay que escribirlos.
- `CONTEXT.md` documenta que este hueco existe a propósito («es C6, no un olvido»); al cerrarlo, hay
  que actualizar esa línea (hecho: ver §9).

## 9. Decisiones resueltas (grilling)

D2, D3 y D6 dependían de D1, por eso fueron una segunda ronda. D7 no estaba en el doc: salió al
grillear el punto 3 de la §4.

| # | Decisión | Resultado |
|---|----------|-----------|
| D1 | ¿Qué se persiste? | Los 3 targets que ya declara `SessionExerciseView`: `rest_seconds`, `target_sets`, `target_reps`. `target_weight` afuera (el DTO no lo declara). |
| D2 | Semántica de `targetSets` | La intención del plan, no `sets.length`. El conteo real sigue disponible en `sets`. |
| D3 | Nulos y fallback | Columnas y campos del DTO nullable. `null` = sin plan. El mapeo no sintetiza el default. |
| D4 | Quién arranca el descanso | El store (`completeSet`), dueño único. Se borraron los dos `startRest` de `active.tsx`. |
| D5 | Supabase | No se replica; la divergencia queda anotada en `06-known-issues.md` (F). |
| D6 | Backfill | Ninguno: el target real no es recuperable con fidelidad. |
| D7 | `addSessionExercise` y los targets | No crece la firma: su único caller es el import, que no tiene targets. La fila queda con `null`. |

Decisiones que aparecieron al grillear, fuera de la frontera original:

- **El default del descanso es una preferencia, no una constante.** `preferences.defaultRestSeconds`
  existía desde antes, con default 90, y no lo leía nadie. El store lo usa cuando no hay plan.
- **El disparo del descanso no cambia**: cada set, como antes. La regla de supersets («descansa sólo
  al cerrar el grupo») queda como candidato aparte, anotada en `06-known-issues.md` (G).
- **La duplicación de «el primer set es warmup» queda fuera de C6**, anotada en
  `06-known-issues.md` (H).

Fuera de alcance, ya anotado por el review: `BetterSqliteStack.seam` sin consumidor
(`06-known-issues.md`, I).

### Verificación

- El test que fijaba `[90, 90]` y `['-', '-']` se reescribió: ahora verifica los valores reales.
- `start()` desde rutina con `restSeconds: 120` → `getFullSession()` devuelve 120. Es la prueba de que
  la persistencia funciona, no sólo el paso por memoria.
- `addSessionExercise` (camino del import) deja los targets en `NULL`.
- `activeWorkoutStore.test.ts` (primer test de store del repo): el descanso arranca con el
  `restSeconds` real y cae a la preferencia (75, no el 90 hardcodeado) cuando no hay plan.
- `pnpm test` (37/37), `pnpm typecheck` y `pnpm lint` (0 errores) en verde.
