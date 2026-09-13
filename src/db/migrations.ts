import type { RawSqlite } from './seam';

/**
 * Migraciones SQL idempotentes.
 *
 * Para apps reales con Drizzle se usa `drizzle-kit generate` y se ejecuta el SQL generado.
 * Aquí dejamos una función simple que aplica migraciones inline — útil para arranque
 * inicial y para tests. Las migraciones generadas deben estar en ./migrations/*.sql.
 */

const MIGRATIONS: { id: number; name: string; sql: string }[] = [
  {
    id: 1,
    name: 'initial_schema',
    sql: `
      CREATE TABLE IF NOT EXISTS exercises (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        muscle_group TEXT NOT NULL,
        secondary_muscles TEXT DEFAULT '[]',
        equipment TEXT NOT NULL DEFAULT 'other',
        mechanic TEXT NOT NULL DEFAULT 'compound',
        instructions TEXT,
        is_custom INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE INDEX IF NOT EXISTS exercises_name_idx ON exercises(name);
      CREATE INDEX IF NOT EXISTS exercises_muscle_idx ON exercises(muscle_group);

      CREATE TABLE IF NOT EXISTS routines (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        tags TEXT DEFAULT '[]',
        color TEXT DEFAULT '#3b82f6',
        is_archived INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE INDEX IF NOT EXISTS routines_name_idx ON routines(name);

      CREATE TABLE IF NOT EXISTS routine_exercises (
        id TEXT PRIMARY KEY NOT NULL,
        routine_id TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
        order_index INTEGER NOT NULL,
        target_sets INTEGER NOT NULL DEFAULT 3,
        target_reps TEXT NOT NULL DEFAULT '8-12',
        target_weight REAL,
        rest_seconds INTEGER NOT NULL DEFAULT 90,
        notes TEXT
      );
      CREATE INDEX IF NOT EXISTS routine_exercises_routine_idx ON routine_exercises(routine_id);
      CREATE UNIQUE INDEX IF NOT EXISTS routine_exercises_order_idx ON routine_exercises(routine_id, order_index);

      CREATE TABLE IF NOT EXISTS workout_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        routine_id TEXT REFERENCES routines(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        duration_seconds INTEGER,
        notes TEXT,
        total_volume REAL NOT NULL DEFAULT 0,
        total_sets INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE INDEX IF NOT EXISTS workout_sessions_started_idx ON workout_sessions(started_at);
      CREATE INDEX IF NOT EXISTS workout_sessions_status_idx ON workout_sessions(status);

      CREATE TABLE IF NOT EXISTS session_exercises (
        id TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
        order_index INTEGER NOT NULL,
        notes TEXT
      );
      CREATE INDEX IF NOT EXISTS session_exercises_session_idx ON session_exercises(session_id);

      CREATE TABLE IF NOT EXISTS sets (
        id TEXT PRIMARY KEY NOT NULL,
        session_exercise_id TEXT NOT NULL REFERENCES session_exercises(id) ON DELETE CASCADE,
        set_index INTEGER NOT NULL,
        set_type TEXT NOT NULL DEFAULT 'working',
        weight REAL NOT NULL DEFAULT 0,
        reps INTEGER NOT NULL DEFAULT 0,
        is_completed INTEGER NOT NULL DEFAULT 0,
        rpe REAL,
        actual_rest_seconds INTEGER,
        notes TEXT,
        completed_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS sets_session_exercise_idx ON sets(session_exercise_id);

      CREATE TABLE IF NOT EXISTS personal_records (
        id TEXT PRIMARY KEY NOT NULL,
        exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        record_type TEXT NOT NULL,
        value REAL NOT NULL,
        reps INTEGER,
        weight REAL,
        set_id TEXT REFERENCES sets(id) ON DELETE SET NULL,
        achieved_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS pr_exercise_idx ON personal_records(exercise_id);
      CREATE UNIQUE INDEX IF NOT EXISTS pr_exercise_type_idx ON personal_records(exercise_id, record_type);

      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        row_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        synced_at INTEGER
      );
    `,
  },
  {
    id: 2,
    name: 'add_superset_group',
    sql: `
      -- Supersets/tri-sets: agrupar ejercicios consecutivos en rutinas y sesiones
      ALTER TABLE routine_exercises ADD COLUMN superset_group TEXT;
      ALTER TABLE session_exercises ADD COLUMN superset_group TEXT;

      -- Índices para acelerar el render del workout activo y el builder
      CREATE INDEX IF NOT EXISTS routine_exercises_superset_idx ON routine_exercises(superset_group);
      CREATE INDEX IF NOT EXISTS session_exercises_superset_idx ON session_exercises(superset_group);
    `,
  },
  {
    id: 3,
    name: 'add_session_exercise_targets',
    sql: `
      -- Snapshot de la intención de la rutina al iniciar la sesión (ver D11).
      -- Nullable a propósito: una sesión sin rutina (o un ejercicio agregado
      -- después) no tiene plan, y eso no es lo mismo que "plan por defecto".
      ALTER TABLE session_exercises ADD COLUMN target_sets INTEGER;
      ALTER TABLE session_exercises ADD COLUMN target_reps TEXT;
      ALTER TABLE session_exercises ADD COLUMN rest_seconds INTEGER;
    `,
  },
];

/**
 * Aplica todas las migraciones pendientes en orden.
 * Registra las versiones aplicadas en una tabla interna.
 */
export function runMigrations(raw: RawSqlite): void {
  // Tabla de control de migraciones
  raw.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  const applied = new Set<number>(
    raw.all<{ id: number }>('SELECT id FROM _migrations').map((r) => r.id)
  );

  for (const m of MIGRATIONS) {
    if (applied.has(m.id)) continue;

    try {
      raw.exec(`BEGIN; ${m.sql}; INSERT INTO _migrations (id, name) VALUES (${m.id}, '${m.name}'); COMMIT;`);

      // `__DEV__` es un global de React Native: en Node (tests y scripts) no existe.
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log(`[db] Migración ${m.id} (${m.name}) aplicada`);
      }
    } catch (err) {
      raw.exec('ROLLBACK;');
      console.error(`[db] Error en migración ${m.id}:`, err);
      throw err;
    }
  }
}
