/**
 * Catálogo inicial de ejercicios predefinidos.
 * Ejecutar solo la primera vez (o si la BD está vacía).
 */

import { newId } from '@lib/id';
import type { ExercisesRepo } from './repos';
import type { NewExercise } from './schema';

const SEED: Omit<NewExercise, 'id'>[] = [
  // ============ PECHO ============
  { name: 'Press de banca', muscleGroup: 'chest', equipment: 'barbell', mechanic: 'compound', isCustom: false, instructions: 'Acostado en banco, agarra la barra con las manos a la anchura de los hombros. Baja hasta el pecho y empuja hacia arriba.' },
  { name: 'Press inclinado con mancuernas', muscleGroup: 'chest', equipment: 'dumbbell', mechanic: 'compound', isCustom: false, instructions: 'Banco a 30-45°. Empuja las mancuernas desde el pecho hasta la extensión completa.' },
  { name: 'Press declinado con barra', muscleGroup: 'chest', equipment: 'barbell', mechanic: 'compound', isCustom: false },
  { name: 'Aperturas con mancuernas', muscleGroup: 'chest', equipment: 'dumbbell', mechanic: 'isolation', isCustom: false },
  { name: 'Cruce en poleas', muscleGroup: 'chest', equipment: 'cable', mechanic: 'isolation', isCustom: false },
  { name: 'Fondos en paralelas', muscleGroup: 'chest', equipment: 'bodyweight', mechanic: 'compound', isCustom: false },
  { name: 'Press de banca con mancuernas', muscleGroup: 'chest', equipment: 'dumbbell', mechanic: 'compound', isCustom: false },

  // ============ ESPALDA ============
  { name: 'Peso muerto', muscleGroup: 'back', equipment: 'barbell', mechanic: 'compound', isCustom: false, instructions: 'Pies a la anchura de las caderas, agarra la barra. Mantén la espalda recta y empuja con las piernas.' },
  { name: 'Dominadas', muscleGroup: 'back', equipment: 'bodyweight', mechanic: 'compound', isCustom: false },
  { name: 'Remo con barra', muscleGroup: 'back', equipment: 'barbell', mechanic: 'compound', isCustom: false },
  { name: 'Remo con mancuerna a un brazo', muscleGroup: 'back', equipment: 'dumbbell', mechanic: 'compound', isCustom: false },
  { name: 'Remo en polea baja', muscleGroup: 'back', equipment: 'cable', mechanic: 'compound', isCustom: false },
  { name: 'Pullover en polea', muscleGroup: 'back', equipment: 'cable', mechanic: 'isolation', isCustom: false },
  { name: 'Encogimientos con barra', muscleGroup: 'back', equipment: 'barbell', mechanic: 'isolation', isCustom: false },

  // ============ PIERNAS ============
  { name: 'Sentadilla trasera', muscleGroup: 'legs', equipment: 'barbell', mechanic: 'compound', isCustom: false, instructions: 'Barra sobre los trapecios, baja hasta que los muslos estén paralelos al suelo.' },
  { name: 'Sentadilla frontal', muscleGroup: 'legs', equipment: 'barbell', mechanic: 'compound', isCustom: false },
  { name: 'Prensa de piernas', muscleGroup: 'legs', equipment: 'machine', mechanic: 'compound', isCustom: false },
  { name: 'Extensión de piernas', muscleGroup: 'legs', equipment: 'machine', mechanic: 'isolation', isCustom: false },
  { name: 'Curl femoral tumbado', muscleGroup: 'legs', equipment: 'machine', mechanic: 'isolation', isCustom: false },
  { name: 'Curl femoral sentado', muscleGroup: 'legs', equipment: 'machine', mechanic: 'isolation', isCustom: false },
  { name: 'Peso muerto rumano', muscleGroup: 'legs', equipment: 'barbell', mechanic: 'compound', isCustom: false },
  { name: 'Hip thrust', muscleGroup: 'legs', equipment: 'barbell', mechanic: 'compound', isCustom: false },
  { name: 'Zancadas caminando', muscleGroup: 'legs', equipment: 'dumbbell', mechanic: 'compound', isCustom: false },
  { name: 'Extensión de gemelos de pie', muscleGroup: 'legs', equipment: 'machine', mechanic: 'isolation', isCustom: false },
  { name: 'Elevación de gemelos sentado', muscleGroup: 'legs', equipment: 'machine', mechanic: 'isolation', isCustom: false },

  // ============ HOMBROS ============
  { name: 'Press militar', muscleGroup: 'shoulders', equipment: 'barbell', mechanic: 'compound', isCustom: false },
  { name: 'Press con mancuernas sentado', muscleGroup: 'shoulders', equipment: 'dumbbell', mechanic: 'compound', isCustom: false },
  { name: 'Elevaciones laterales', muscleGroup: 'shoulders', equipment: 'dumbbell', mechanic: 'isolation', isCustom: false },
  { name: 'Elevaciones frontales', muscleGroup: 'shoulders', equipment: 'dumbbell', mechanic: 'isolation', isCustom: false },
  { name: 'Pájaros (posterior)', muscleGroup: 'shoulders', equipment: 'dumbbell', mechanic: 'isolation', isCustom: false },
  { name: 'Face pulls', muscleGroup: 'shoulders', equipment: 'cable', mechanic: 'isolation', isCustom: false },
  { name: 'Encogimientos en press', muscleGroup: 'shoulders', equipment: 'barbell', mechanic: 'compound', isCustom: false },

  // ============ BRAZOS ============
  { name: 'Curl con barra', muscleGroup: 'arms', equipment: 'barbell', mechanic: 'isolation', isCustom: false },
  { name: 'Curl con mancuernas alterno', muscleGroup: 'arms', equipment: 'dumbbell', mechanic: 'isolation', isCustom: false },
  { name: 'Curl martillo', muscleGroup: 'arms', equipment: 'dumbbell', mechanic: 'isolation', isCustom: false },
  { name: 'Curl en polea', muscleGroup: 'arms', equipment: 'cable', mechanic: 'isolation', isCustom: false },
  { name: 'Press francés', muscleGroup: 'arms', equipment: 'barbell', mechanic: 'isolation', isCustom: false },
  { name: 'Extensión de tríceps en polea', muscleGroup: 'arms', equipment: 'cable', mechanic: 'isolation', isCustom: false },
  { name: 'Press cerrado', muscleGroup: 'arms', equipment: 'barbell', mechanic: 'compound', isCustom: false },
  { name: 'Fondos en banco', muscleGroup: 'arms', equipment: 'bodyweight', mechanic: 'compound', isCustom: false },

  // ============ CORE ============
  { name: 'Plancha', muscleGroup: 'core', equipment: 'bodyweight', mechanic: 'isolation', isCustom: false },
  { name: 'Plancha lateral', muscleGroup: 'core', equipment: 'bodyweight', mechanic: 'isolation', isCustom: false },
  { name: 'Crunch abdominal', muscleGroup: 'core', equipment: 'bodyweight', mechanic: 'isolation', isCustom: false },
  { name: 'Elevación de piernas colgado', muscleGroup: 'core', equipment: 'bodyweight', mechanic: 'isolation', isCustom: false },
  { name: 'Russian twist', muscleGroup: 'core', equipment: 'bodyweight', mechanic: 'isolation', isCustom: false },
  { name: 'Rueda abdominal', muscleGroup: 'core', equipment: 'other', mechanic: 'isolation', isCustom: false },
  { name: 'Ab wheel rollout', muscleGroup: 'core', equipment: 'other', mechanic: 'isolation', isCustom: false },
];

/** Puebla la tabla exercises si está vacía. */
export async function seedExercises(exercises: ExercisesRepo): Promise<void> {
  if ((await exercises.count()) > 0) return;
  // Asignamos un id (uuid de expo-crypto) a cada ejercicio predefinido
  const withIds: NewExercise[] = SEED.map((ex) => ({ ...ex, id: newId() }));
  await exercises.bulkCreate(withIds);
}
