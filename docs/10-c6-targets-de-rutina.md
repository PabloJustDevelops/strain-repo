# 10 · C6 — Targets de rutina en la sesión (spec pendiente)

> **Estado**: spec sin grilling. Los hechos están verificados; **las decisiones abiertas no**.
> **Origen**: candidate C6 del review de arquitectura (`/improve-codebase-architecture`).
> **Por qué está acá y no en un issue**: el tracker del repo es GitHub (`docs/agents/issue-tracker.md`);
> esto es el borrador previo. Si se quiere, `/to-spec` lo publica como issue.

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
  que actualizar esa línea.
