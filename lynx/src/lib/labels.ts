import { MUSCLE_GROUP_LABELS, EQUIPMENT_LABELS, type MuscleGroup, type Equipment } from '@/types/domain';

/**
 * Etiquetas para mostrar a partir de los valores crudos de una fila `Exercise`.
 *
 * Las columnas `muscle_group` y `equipment` son de texto; el seed y los inputs
 * solo escriben los enums del dominio, así que la proyección es segura. El cast
 * vive acá una sola vez, con su invariante, y las pantallas no lo repiten.
 */
export function muscleGroupLabel(value: string): string {
  // SAFETY: la columna muscle_group solo contiene valores de MuscleGroup.
  return MUSCLE_GROUP_LABELS[value as MuscleGroup];
}

export function equipmentLabel(value: string): string {
  // SAFETY: la columna equipment solo contiene valores de Equipment.
  return EQUIPMENT_LABELS[value as Equipment];
}
