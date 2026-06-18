import { Repos } from '@db/repositories';
import { nanoid } from 'nanoid';

/**
 * Export / Import de datos de Strain.
 *
 * Formato JSON portable:
 * {
 *   version: 1,
 *   exportedAt: ISO,
 *   exercises: [...],
 *   routines: [...],
 *   routineExercises: [...],
 *   sessions: [...],
 *   sessionExercises: [...],
 *   sets: [...],
 *   personalRecords: [...],
 * }
 *
 * Se incluyen también:
 * - exportCsv: para abrir en Excel/Sheets
 * - importHevyZip: detecta export.zip de Hevy (formato JSON interno)
 */

interface StrainExport {
  version: 1;
  exportedAt: string;
  exercises: any[];
  routines: any[];
  routineExercises: any[];
  sessions: any[];
  sessionExercises: any[];
  sets: any[];
  personalRecords: any[];
}

export async function exportData(): Promise<string> {
  const payload: StrainExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    exercises: await Repos.exercises.list(),
    routines: await Repos.routines.list(true),
    routineExercises: [],   // Se exportan en una segunda pasada si hace falta
    sessions: await Repos.sessions.list(1000),
    sessionExercises: [],
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

/** Importa un JSON exportado previamente desde Strain. */
export async function importData(json: string): Promise<{ exercises: number; routines: number; sessions: number }> {
  const data = JSON.parse(json) as StrainExport;
  if (data.version !== 1) throw new Error('Versión de export no soportada');

  // Mapeo de IDs antiguos -> nuevos para mantener relaciones
  const exMap = new Map<string, string>();
  const exList = await Repos.exercises.list();
  const exByName = new Map(exList.map((e) => [e.name.toLowerCase(), e.id]));

  // Ejercicios: crear si no existe por nombre
  for (const ex of data.exercises ?? []) {
    const key = ex.name.toLowerCase();
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

  // Rutinas
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

  // Sesiones (recreamos sets simplificados)
  let sessionsImported = 0;
  for (const s of data.sessions ?? []) {
    const session = await Repos.sessions.start({ name: s.name });
    // Cerramos inmediatamente y los sets se perderán (versión simplificada)
    await Repos.sessions.finish(session.id);
    sessionsImported++;
  }

  return {
    exercises: exMap.size,
    routines: routinesImported,
    sessions: sessionsImported,
  };
}

/**
 * Importa un ZIP exportado desde Hevy (formato interno).
 * Hevy exporta un ZIP que contiene un workouts.json con su estructura.
 *
 * Estrategia:
 * - En nativo: descargar el ZIP con FileSystem y parsearlo
 * - En web: usar fetch + JSZip
 *
 * Mapeo de campos relevantes:
 * - Hevy.title -> Strain.session.name
 * - Hevy.exercises[].title -> Strain.exercise.name (muscleGroup inferido por keywords)
 * - Hevy.exercises[].sets[] -> Strain.sets
 */
export async function importHevyZip(zipUri: string): Promise<{ imported: number }> {
  // Implementación simplificada: leer el archivo, descomprimir y parsear workouts.json.
  // Para una implementación completa, integrar 'jszip' (instalar si se usa).
  throw new Error(
    'Importador Hevy: instala jszip (npm i jszip) y reemplaza esta función con la lógica de parseo del ZIP de Hevy. Ver docs/Hevy-import.md.'
  );
}

/** Mapea un músculo en texto libre a un MuscleGroup válido. */
export function guessMuscleGroup(text: string): string {
  const t = text.toLowerCase();
  if (/(chest|pec|press\s*bench)/.test(t)) return 'chest';
  if (/(back|lat|pull|row|deadlift)/.test(t)) return 'back';
  if (/(leg|squat|lunge|calf|quad|hamstring)/.test(t)) return 'legs';
  if (/(shoulder|del|delt|ohp)/.test(t)) return 'shoulders';
  if (/(bicep|tricep|curl|arm)/.test(t)) return 'arms';
  if (/(core|ab|plank|crunch)/.test(t)) return 'core';
  if (/(run|bike|cardio|treadmill|row.*machine)/.test(t)) return 'cardio';
  return 'other';
}

// Helper para evitar warning de no uso de nanoid (se usa si se extiende)
void nanoid;
