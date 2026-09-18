import { StubScreen } from '@components/StubScreen';
import type { RouteProps } from '@/app/routes';

/**
 * Rutas de pila fuera de las pestañas.
 *
 * Quedan como stub: el detalle de rutina/ejercicio y el workout activo
 * completo necesitan UI que no entra en esta fase (keypad de peso/reps, hojas
 * de detalle, gestos de swipe). El stub conserva la navegación y los params.
 */

export function RoutineDetailScreen({ params }: RouteProps) {
  return (
    <StubScreen
      title="Detalle de rutina"
      note="El detalle editable de la rutina (añadir ejercicios, supersets, reordenar) queda para la Fase 3."
      params={params}
    />
  );
}

export function ExerciseDetailScreen({ params }: RouteProps) {
  return (
    <StubScreen
      title="Detalle de ejercicio"
      note="La ficha del ejercicio (historial, récords, progresión) queda para la Fase 3."
      params={params}
    />
  );
}

export function WorkoutActiveScreen({ params }: RouteProps) {
  return (
    <StubScreen
      title="Workout activo"
      note="El modo activo completo (registrar series, descanso, supersets) queda para la Fase 3. La sesión ya se crea y persiste en la seam KV."
      params={params}
    />
  );
}

export function WorkoutFinishScreen({ params }: RouteProps) {
  return (
    <StubScreen
      title="Resumen del workout"
      note="El resumen de cierre y la sincronización con Health Connect quedan para la Fase 3."
      params={params}
    />
  );
}
