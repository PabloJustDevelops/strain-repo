import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real, primaryKey, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * Definición del esquema de la base de datos local de Strain.
 * Toda la app funciona offline con SQLite (expo-sqlite) + Drizzle ORM.
 * Si se activa Supabase, las tablas se sincronizan con tablas equivalentes en la nube.
 */

// ============================================================
// EJERCICIOS — Biblioteca (predefinidos + personalizados)
// ============================================================
export const exercises = sqliteTable(
  'exercises',
  {
    id: text('id').primaryKey(),                                   // nanoid
    name: text('name').notNull(),
    // Grupo muscular principal: chest, back, legs, shoulders, arms, core, cardio, other
    muscleGroup: text('muscle_group').notNull(),
    // Grupos secundarios (JSON array: ["biceps","forearms"])
    secondaryMuscles: text('secondary_muscles', { mode: 'json' }).$type<string[]>().default([]),
    // Tipo de equipo: barbell, dumbbell, machine, cable, bodyweight, kettlebell, other
    equipment: text('equipment').notNull().default('other'),
    // Mecánica: compound | isolation
    mechanic: text('mechanic').notNull().default('compound'),
    instructions: text('instructions'),
    // true = ejercicio creado por el usuario, false = predefinido
    isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    nameIdx: index('exercises_name_idx').on(table.name),
    muscleIdx: index('exercises_muscle_idx').on(table.muscleGroup),
  })
);

// ============================================================
// RUTINAS — Plantillas reutilizables de entrenamiento
// ============================================================
export const routines = sqliteTable(
  'routines',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    // Etiquetas (JSON array) ej: ["push","leg","upper"]
    tags: text('tags', { mode: 'json' }).$type<string[]>().default([]),
    color: text('color').default('#3b82f6'),
    isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    nameIdx: index('routines_name_idx').on(table.name),
  })
);

// ============================================================
// RUTINA_EJERCICIOS — Ejercicios dentro de una rutina (ordenados)
// ============================================================
export const routineExercises = sqliteTable(
  'routine_exercises',
  {
    id: text('id').primaryKey(),
    routineId: text('routine_id')
      .notNull()
      .references(() => routines.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'restrict' }),
    orderIndex: integer('order_index').notNull(),
    // Sets planificados (por defecto 3)
    targetSets: integer('target_sets').notNull().default(3),
    // Repeticiones objetivo (texto libre: "8-12" o "AMRAP")
    targetReps: text('target_reps').notNull().default('8-12'),
    // Peso objetivo (en kg, se convierte según unidad preferida)
    targetWeight: real('target_weight'),
    // Descanso entre series en segundos
    restSeconds: integer('rest_seconds').notNull().default(90),
    // Etiqueta de superset: "A", "B", "C"... Si dos ejercicios comparten etiqueta, forman superset.
    supersetGroup: text('superset_group'),
    notes: text('notes'),
  },
  (table) => ({
    routineIdx: index('routine_exercises_routine_idx').on(table.routineId),
    orderIdx: uniqueIndex('routine_exercises_order_idx').on(table.routineId, table.orderIndex),
  })
);

// ============================================================
// SESIONES — Workout real ejecutado (lo que se guarda al terminar)
// ============================================================
export const workoutSessions = sqliteTable(
  'workout_sessions',
  {
    id: text('id').primaryKey(),
    // Opcional: si la sesión se generó desde una rutina
    routineId: text('routine_id').references(() => routines.id, { onDelete: 'set null' }),
    name: text('name').notNull(),                                  // ej: "Push Day A"
    startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
    endedAt: integer('ended_at', { mode: 'timestamp' }),
    durationSeconds: integer('duration_seconds'),
    // Notas generales de la sesión
    notes: text('notes'),
    // Volumen total calculado (kg * reps sumadas) — cache para analytics rápidas
    totalVolume: real('total_volume').notNull().default(0),
    totalSets: integer('total_sets').notNull().default(0),
    // Estado: active | completed | discarded
    status: text('status').notNull().default('active'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    startedIdx: index('workout_sessions_started_idx').on(table.startedAt),
    statusIdx: index('workout_sessions_status_idx').on(table.status),
  })
);

// ============================================================
// SESIÓN_EJERCICIOS — Ejercicios dentro de una sesión ejecutada
// ============================================================
export const sessionExercises = sqliteTable(
  'session_exercises',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => workoutSessions.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'restrict' }),
    orderIndex: integer('order_index').notNull(),
    // Etiqueta de superset (copiada de la rutina al iniciar la sesión)
    supersetGroup: text('superset_group'),
    notes: text('notes'),
  },
  (table) => ({
    sessionIdx: index('session_exercises_session_idx').on(table.sessionId),
  })
);

// ============================================================
// SETS — Series ejecutadas (la unidad mínima de tracking)
// ============================================================
export const sets = sqliteTable(
  'sets',
  {
    id: text('id').primaryKey(),
    sessionExerciseId: text('session_exercise_id')
      .notNull()
      .references(() => sessionExercises.id, { onDelete: 'cascade' }),
    // Número de set dentro del ejercicio (1, 2, 3...)
    setIndex: integer('set_index').notNull(),
    // Tipo: warmup | working | failure | dropset
    setType: text('set_type').notNull().default('working'),
    // Peso en kg
    weight: real('weight').notNull().default(0),
    // Repeticiones completadas
    reps: integer('reps').notNull().default(0),
    // true si se completó (swipe right en active workout)
    isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
    // RPE opcional (1-10)
    rpe: real('rpe'),
    // Tiempo de descanso real tomado (segundos)
    actualRestSeconds: integer('actual_rest_seconds'),
    notes: text('notes'),
    completedAt: integer('completed_at', { mode: 'timestamp' }),
  },
  (table) => ({
    sessionExIdx: index('sets_session_exercise_idx').on(table.sessionExerciseId),
  })
);

// ============================================================
// RECORDS PERSONALES (PRs) — 1RM calculado por ejercicio
// ============================================================
export const personalRecords = sqliteTable(
  'personal_records',
  {
    id: text('id').primaryKey(),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    // Tipo: one_rm | max_volume | max_reps | max_weight
    recordType: text('record_type').notNull(),
    value: real('value').notNull(),
    // Repeticiones con las que se logró (para 1RM estimado por fórmula de Epley)
    reps: integer('reps'),
    weight: real('weight'),
    // Referencia al set que lo originó
    setId: text('set_id').references(() => sets.id, { onDelete: 'set null' }),
    achievedAt: integer('achieved_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    exerciseIdx: index('pr_exercise_idx').on(table.exerciseId),
    uniquePR: uniqueIndex('pr_exercise_type_idx').on(table.exerciseId, table.recordType),
  })
);

// ============================================================
// HISTORIAL DE SINCRONIZACIÓN (para cola de sync con Supabase)
// ============================================================
export const syncQueue = sqliteTable('sync_queue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tableName: text('table_name').notNull(),
  rowId: text('row_id').notNull(),
  // create | update | delete
  operation: text('operation').notNull(),
  payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>(),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  syncedAt: integer('synced_at', { mode: 'timestamp' }),
});

// ============================================================
// TIPOS inferidos (útil para type-safety en todo el código)
// ============================================================
export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;
export type Routine = typeof routines.$inferSelect;
export type NewRoutine = typeof routines.$inferInsert;
export type RoutineExercise = typeof routineExercises.$inferSelect;
export type NewRoutineExercise = typeof routineExercises.$inferInsert;
export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type NewWorkoutSession = typeof workoutSessions.$inferInsert;
export type SessionExercise = typeof sessionExercises.$inferSelect;
export type NewSessionExercise = typeof sessionExercises.$inferInsert;
export type Set = typeof sets.$inferSelect;
export type NewSet = typeof sets.$inferInsert;
export type PersonalRecord = typeof personalRecords.$inferSelect;
export type NewPersonalRecord = typeof personalRecords.$inferInsert;

// ============================================================
// Namespace `schema` — para usar con `db.select().from(schema.X)`
// y para hacer destructuring dinámico desde repositorios.
// ============================================================
export const schema = {
  exercises,
  routines,
  routineExercises,
  workoutSessions,
  sessionExercises,
  sets,
  personalRecords,
  syncQueue,
};
export default schema;
