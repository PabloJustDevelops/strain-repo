import type { Repos } from '@db';

/**
 * Export / Import de datos de Strain.
 *
 * Formatos soportados:
 * - JSON nativo de Strain
 * - CSV (export genérico para Excel/Sheets)
 * - Strong Workout Tracker (CSV o ZIP)
 *
 * Strong exporta un archivo ZIP con workouts.csv + exercises.csv dentro.
 * Columnas del CSV de Strong (formato 2024+):
 *   "Date","Workout Name","Duration","Exercise Name","Set Order","Weight","Reps","Distance","Seconds","Notes","Workout Notes","RPE"
 */

interface StrainExport {
  version: 1;
  exportedAt: string;
  exercises: any[];
  routines: any[];
  sessions: any[];
  sets: any[];
  personalRecords: any[];
}

// ============================================================
// EXPORT JSON / CSV
// ============================================================

export async function exportData(repos: Repos): Promise<string> {
  const payload: StrainExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    exercises: await repos.exercises.list(),
    routines: await repos.routines.list(true),
    sessions: await repos.sessions.list(1000),
    sets: [],
    personalRecords: await repos.analytics.personalRecords(),
  };

  return JSON.stringify(payload, null, 2);
}

export async function exportCsv(repos: Repos): Promise<string> {
  const sessions = await repos.sessions.list(1000);

  const rows: string[] = [
    'Fecha,Nombre,Duración (s),Volumen (kg),Series',
    ...sessions.map((s) =>
      [
        new Date(s.startedAt).toISOString(),
        csvEscape(s.name),
        String(s.durationSeconds ?? 0),
        String(Math.round(s.totalVolume)),
        String(s.totalSets),
      ].join(',')
    ),
  ];

  return rows.join('\n');
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

// ============================================================
// IMPORT JSON nativo
// ============================================================

export async function importData(json: string, repos: Repos): Promise<{ exercises: number; routines: number; sessions: number }> {
  // SAFETY: JSON de un export propio; la version se valida justo abajo.
  const data = JSON.parse(json) as StrainExport;

  if (data.version !== 1) throw new Error('Versión de export no soportada');

  const exMap = new Map<string, string>();
  const exList = await repos.exercises.list();
  const exByName = new Map(exList.map((e) => [e.name.toLowerCase().trim(), e.id]));

  for (const ex of data.exercises ?? []) {
    const key = ex.name.toLowerCase().trim();
    let id = exByName.get(key);

    if (!id) {
      const created = await repos.exercises.create({
        name: ex.name,
        muscleGroup: ex.muscleGroup ?? 'other',
        equipment: ex.equipment ?? 'other',
        mechanic: ex.mechanic ?? 'compound',
        isCustom: true,
        instructions: ex.instructions,
        notes: ex.notes,
        secondaryMuscles: ex.secondaryMuscles ?? [],
      });

      id = created.id;
      exByName.set(key, id);
    }

    exMap.set(ex.id, id);
  }

  let routinesImported = 0;

  for (const r of data.routines ?? []) {
    const created = await repos.routines.create({
      name: r.name,
      description: r.description,
      tags: r.tags ?? [],
      color: r.color,
    });

    routinesImported++;

    for (const re of r.routineExercises ?? []) {
      const newExId = exMap.get(re.exerciseId);

      if (!newExId) continue;
      await repos.routines.addExercise(created.id, newExId);
    }
  }

  let sessionsImported = 0;

  for (const s of data.sessions ?? []) {
    const session = await repos.sessions.start({ name: s.name });
    await repos.sessions.finish(session.id);
    sessionsImported++;
  }

  return { exercises: exMap.size, routines: routinesImported, sessions: sessionsImported };
}

// ============================================================
// IMPORT STRONG (CSV / ZIP)
// ============================================================

/**
 * Resultado del import de Strong.
 */
export interface StrongImportResult {
  workouts: number;
  sets: number;
  exercises: number;
  skipped: number;
}

/**
 * Importa directamente desde texto CSV de Strong.
 */
export async function importStrongCsv(csvText: string, repos: Repos): Promise<StrongImportResult> {
  const rows = parseCsv(csvText);

  if (rows.length < 2) return { workouts: 0, sets: 0, exercises: 0, skipped: 0 };

  const header = rows[0].map((h) => h.toLowerCase().trim());

  const idx = {
    date: header.indexOf('date'),
    workoutName: header.indexOf('workout name'),
    duration: header.indexOf('duration'),
    exerciseName: header.indexOf('exercise name'),
    setOrder: header.indexOf('set order'),
    weight: header.indexOf('weight'),
    reps: header.indexOf('reps'),
    distance: header.indexOf('distance'),
    seconds: header.indexOf('seconds'),
    notes: header.indexOf('notes'),
    workoutNotes: header.indexOf('workout notes'),
    rpe: header.indexOf('rpe'),
  };

  // Verificar columnas mínimas
  if (idx.date < 0 || idx.workoutName < 0 || idx.exerciseName < 0 || idx.setOrder < 0) {
    throw new Error('CSV no parece ser un export de Strong. Faltan columnas: Date, Workout Name, Exercise Name, Set Order');
  }

  // Agrupar filas por (fecha, nombre de workout) -> workout
  type Row = { exerciseName: string; setOrder: number; weight: number; reps: number; rpe: number | null; notes: string | null };

  const workoutsMap = new Map<string, { name: string; date: Date; durationSeconds: number; notes: string | null; rows: Row[] }>();

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];

    if (!r || r.length < 4) continue;
    const dateStr = r[idx.date]?.trim();
    const workoutName = r[idx.workoutName]?.trim();
    const exerciseName = r[idx.exerciseName]?.trim();

    if (!dateStr || !workoutName || !exerciseName) continue;

    const date = parseStrongDate(dateStr);

    if (!date) continue;

    const key = `${date.toISOString().slice(0, 16)}::${workoutName}`;
    let wk = workoutsMap.get(key);

    if (!wk) {
      wk = {
        name: workoutName,
        date,
        durationSeconds: parseInt(r[idx.duration] ?? '0', 10) || 0,
        notes: idx.workoutNotes >= 0 ? r[idx.workoutNotes] || null : null,
        rows: [],
      };
      workoutsMap.set(key, wk);
    }

    wk.rows.push({
      exerciseName,
      setOrder: parseInt(r[idx.setOrder] ?? '0', 10) || 0,
      weight: parseFloat(r[idx.weight] ?? '0') || 0,
      reps: parseInt(r[idx.reps] ?? '0', 10) || 0,
      rpe: idx.rpe >= 0 && r[idx.rpe] ? parseFloat(r[idx.rpe]) : null,
      notes: idx.notes >= 0 ? r[idx.notes] || null : null,
    });
  }

  // Importar workouts
  const exList = await repos.exercises.list();
  const exByName = new Map(exList.map((e) => [e.name.toLowerCase().trim(), e]));

  let totalSets = 0;
  let newExercises = 0;
  let skipped = 0;
  const workouts = Array.from(workoutsMap.values());

  for (const wk of workouts) {
    try {
      const session = await repos.sessions.start({ name: wk.name, startedAt: wk.date });

      // Agrupar sets por ejercicio
      const byExercise = new Map<string, { name: string; sets: Row[] }>();
      wk.rows.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName) || a.setOrder - b.setOrder);

      for (const row of wk.rows) {
        const key = row.exerciseName.toLowerCase().trim();
        let ex = byExercise.get(key);

        if (!ex) {
          ex = { name: row.exerciseName, sets: [] };
          byExercise.set(key, ex);
        }

        ex.sets.push(row);
      }

      // Para cada ejercicio: crear exercise si no existe, añadir sessionExercise, actualizar sets
      let orderIndex = 1;

      for (const [, exData] of byExercise) {
        let exercise = exByName.get(exData.name.toLowerCase().trim());

        if (!exercise) {
          exercise = await repos.exercises.create({
            name: exData.name,
            muscleGroup: guessMuscleGroup(exData.name),
            equipment: 'other',
            mechanic: 'compound',
            isCustom: true,
          });
          exByName.set(exData.name.toLowerCase().trim(), exercise);
          newExercises++;
        }

        const sessionExercise = await repos.sessions.addSessionExercise(session.id, exercise.id, {
          orderIndex: orderIndex++,
        });

        // Crear un set por cada set del CSV
        for (let i = 0; i < exData.sets.length; i++) {
          const s = exData.sets[i];
          const created = await repos.sessions.addSet(sessionExercise.id);
          await repos.sessions.updateSet(created.id, {
            setIndex: s.setOrder || i + 1,
            setType: i === 0 ? 'warmup' : 'working',
            weight: s.weight,
            reps: s.reps,
            isCompleted: true,
            rpe: s.rpe,
            notes: s.notes,
            completedAt: wk.date,
          });
          await repos.sessions.completeSet(created.id, s.weight, s.reps);
          totalSets++;
        }
      }

      // Strong trae la duración real. Se la pasamos a finish en vez de escribirla
      // aparte: la escritura separada la sobrescribía y la duración se perdía.
      const endedAt =
        wk.durationSeconds > 0
          ? new Date(wk.date.getTime() + wk.durationSeconds * 1000)
          : undefined;

      await repos.sessions.finish(session.id, { endedAt });
    } catch (err) {
      console.error('[strain] Error importando workout:', wk.name, err);
      skipped++;
    }
  }

  return {
    workouts: workouts.length,
    sets: totalSets,
    exercises: newExercises,
    skipped,
  };
}

// ============================================================
// Helpers
// ============================================================

/** Parsea fecha de Strong. Formatos comunes: "2024-01-15 10:30:00", "2024-01-15T10:30:00", "15/01/2024". */
function parseStrongDate(s: string): Date | null {
  // ISO con T o espacio
  let d = new Date(s.includes('T') ? s : s.replace(' ', 'T'));

  if (!isNaN(d.getTime())) return d;
  // dd/mm/yyyy
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);

  if (m) {
    d = new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));

    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

/** Parser CSV que respeta comillas y comas dentro de campos. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        current.push(field);
        field = '';
      } else if (ch === '\n' || ch === '\r') {
        if (field.length > 0 || current.length > 0) {
          current.push(field);
          rows.push(current);
          current = [];
          field = '';
        }

        if (ch === '\r' && text[i + 1] === '\n') i++;
      } else {
        field += ch;
      }
    }
  }

  if (field.length > 0 || current.length > 0) {
    current.push(field);
    rows.push(current);
  }

  return rows;
}

/** Mapea un nombre de ejercicio a un MuscleGroup aproximado. */
export function guessMuscleGroup(text: string): string {
  const t = text.toLowerCase();

  if (/(bench|pec|chest|fly|cruss|flye|incline\s*press|chest\s*press)/.test(t)) return 'chest';

  if (/(deadlift|pull[-\s]?up|chin[-\s]?up|lat\s*pull|row|pullover|back\s*ext|shrug)/.test(t)) return 'back';

  if (/(squat|lunge|leg\s*press|leg\s*ext|leg\s*curl|calf|hip\s*thrust|romanian|rdl|step\s*up|glute|hamstring|quad)/.test(t)) return 'legs';

  if (/(shoulder|ohp|military|overhead\s*press|lateral\s*raise|front\s*raise|rear\s*delt|face\s*pull|arnold|upright\s*row)/.test(t)) return 'shoulders';

  if (/(bicep|tricep|curl|extension|pushdown|skull|pullover.*tri|tricep\s*ext)/.test(t)) return 'arms';

  if (/(ab|crunch|plank|sit[-\s]?up|leg\s*raise|russian|hollow|core|mountain\s*climber)/.test(t)) return 'core';

  if (/(run|bike|cycle|swim|treadmill|rowing|cardio|elliptical|jump\s*rope)/.test(t)) return 'cardio';

  return 'other';
}
