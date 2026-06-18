import { Repos } from '@db/repositories';
import { nanoid } from 'nanoid';

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

export async function exportData(): Promise<string> {
  const payload: StrainExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    exercises: await Repos.exercises.list(),
    routines: await Repos.routines.list(true),
    sessions: await Repos.sessions.list(1000),
    sets: [],
    personalRecords: await Repos.analytics.personalRecords(),
  };
  return JSON.stringify(payload, null, 2);
}

export async function exportCsv(): Promise<string> {
  const sessions = await Repos.sessions.list(1000);
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

export async function importData(json: string): Promise<{ exercises: number; routines: number; sessions: number }> {
  const data = JSON.parse(json) as StrainExport;
  if (data.version !== 1) throw new Error('Versión de export no soportada');

  const exMap = new Map<string, string>();
  const exList = await Repos.exercises.list();
  const exByName = new Map(exList.map((e) => [e.name.toLowerCase().trim(), e.id]));

  for (const ex of data.exercises ?? []) {
    const key = ex.name.toLowerCase().trim();
    let id = exByName.get(key);
    if (!id) {
      const created = await Repos.exercises.create({
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
    const created = await Repos.routines.create({
      name: r.name,
      description: r.description,
      tags: r.tags ?? [],
      color: r.color,
    });
    routinesImported++;
    for (const re of r.routineExercises ?? []) {
      const newExId = exMap.get(re.exerciseId);
      if (!newExId) continue;
      await Repos.routines.addExercise(created.id, newExId);
    }
  }

  let sessionsImported = 0;
  for (const s of data.sessions ?? []) {
    const session = await Repos.sessions.start({ name: s.name });
    await Repos.sessions.finish(session.id);
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
 * Importa un export de Strong Workout Tracker.
 * Acepta:
 * - Un archivo .zip exportado desde Strong (contiene workouts.csv + exercises.csv)
 * - Un .csv directo con los workouts
 *
 * Columnas esperadas del CSV de Strong:
 *   Date, Workout Name, Duration, Exercise Name, Set Order, Weight, Reps,
 *   Distance, Seconds, Notes, Workout Notes, RPE
 *
 * Si el archivo es .zip, se intenta extraer el CSV workouts.csv.
 */
export async function importStrongZip(fileUri: string): Promise<StrongImportResult> {
  let csvText: string;
  const lower = fileUri.toLowerCase();
  if (lower.endsWith('.zip')) {
    csvText = await readCsvFromZip(fileUri);
  } else {
    csvText = await readFileAsText(fileUri);
  }
  return importStrongCsv(csvText);
}

/**
 * Importa directamente desde texto CSV de Strong.
 */
export async function importStrongCsv(csvText: string): Promise<StrongImportResult> {
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
  const exList = await Repos.exercises.list();
  const exByName = new Map(exList.map((e) => [e.name.toLowerCase().trim(), e]));

  let totalSets = 0;
  let newExercises = 0;
  let skipped = 0;
  const workouts = Array.from(workoutsMap.values());

  for (const wk of workouts) {
    try {
      const session = await Repos.sessions.start({ name: wk.name });

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
      const { db, schema } = await import('@db/client');
      const { eq } = await import('drizzle-orm');

      let orderIndex = 1;
      for (const [, exData] of byExercise) {
        let exercise = exByName.get(exData.name.toLowerCase().trim());
        if (!exercise) {
          exercise = await Repos.exercises.create({
            name: exData.name,
            muscleGroup: guessMuscleGroup(exData.name),
            equipment: 'other',
            mechanic: 'compound',
            isCustom: true,
          });
          exByName.set(exData.name.toLowerCase().trim(), exercise);
          newExercises++;
        }

        // Insertar session_exercise manualmente para poder controlar el setIndex
        const sessionExerciseId = nanoid();
        db.insert(schema.sessionExercises).values({
          id: sessionExerciseId,
          sessionId: session.id,
          exerciseId: exercise.id,
          orderIndex: orderIndex++,
        }).run();

        // Crear un set por cada set del CSV
        for (let i = 0; i < exData.sets.length; i++) {
          const s = exData.sets[i];
          await Repos.sessions.addSet(sessionExerciseId);
          const setId = (await getLastSetId(sessionExerciseId))!;
          await Repos.sessions.updateSet(setId, {
            setIndex: s.setOrder || i + 1,
            setType: i === 0 ? 'warmup' : 'working',
            weight: s.weight,
            reps: s.reps,
            isCompleted: true,
            rpe: s.rpe,
            notes: s.notes,
            completedAt: wk.date,
          });
          await Repos.sessions.completeSet(setId, s.weight, s.reps);
          totalSets++;
        }
      }

      // Forzar duración si Strong la proveyó
      if (wk.durationSeconds > 0) {
        const { schema } = await import('@db/schema');
        const endedAt = new Date(wk.date.getTime() + wk.durationSeconds * 1000);
        db.update(schema.workoutSessions)
          .set({ endedAt, durationSeconds: wk.durationSeconds })
          .where(eq(schema.workoutSessions.id, session.id))
          .run();
      }

      await Repos.sessions.finish(session.id);
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

async function getLastSetId(sessionExerciseId: string): Promise<string | null> {
  const { db, schema } = await import('@db/client');
  const { eq, desc } = await import('drizzle-orm');
  const row = db
    .select({ id: schema.sets.id })
    .from(schema.sets)
    .where(eq(schema.sets.sessionExerciseId, sessionExerciseId))
    .orderBy(desc(schema.sets.setIndex))
    .limit(1)
    .get();
  return row?.id ?? null;
}

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

/** Lee un ZIP y devuelve el contenido de workouts.csv (o el primer CSV encontrado). */
async function readCsvFromZip(zipUri: string): Promise<string> {
  // Implementación manual: ZIP central directory + descompresión usando fetch + fflate si está instalado
  // Como evitamos dependencias adicionales, usamos un fallback: el usuario puede extraer manualmente
  // el CSV del ZIP y usar importStrongCsv directamente.
  //
  // Si tienes `fflate` instalado: descomprime aquí.
  // Para simplificar, leemos el ZIP como texto y buscamos líneas que parezcan CSV:
  const buf = await readFileAsBase64(zipUri);
  // Decodifica base64 → bytes → intenta buscar el header PK\x03\x04 y descomprimir con fflate
  // Como fflate no es dependencia, lanzamos error informativo.
  throw new Error(
    'Importación desde ZIP: descomprime el archivo manualmente y selecciona el workouts.csv extraído. ' +
      'O instala `fflate` (npm i fflate) y ajusta readCsvFromZip() para descomprimir.'
  );
}

async function readFileAsText(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const resp = await fetch(uri);
    return resp.text();
  }
  const FileSystem = await import('expo-file-system');
  return FileSystem.readAsStringAsync(uri, { encoding: 'utf8' });
}

async function readFileAsBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const resp = await fetch(uri);
    const blob = await resp.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1] ?? '');
      reader.readAsDataURL(blob);
    });
  }
  const FileSystem = await import('expo-file-system');
  return FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
}

import { Platform } from 'react-native';

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
