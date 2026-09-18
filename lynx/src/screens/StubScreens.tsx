import { StubScreen } from '@components/StubScreen';
import type { RouteProps } from '@/app/routes';

/**
 * Rutas de pila que siguen pendientes.
 *
 * Queda acá el editor de rutinas (`routines/[id]`): añadir ejercicios, supersets
 * y reordenar. El resto de las rutas de pila ya tiene pantalla propia
 * (`workout/active`, `workout/finish`, `exercises/[id]` y `history/[id]`).
 * El stub conserva la navegación y los params, así que llegar a él es una acción
 * con respuesta y no una pantalla en blanco.
 */

export function RoutineDetailScreen({ params }: RouteProps) {
  return (
    <StubScreen
      title="Detalle de rutina"
      note="El detalle editable de la rutina (añadir ejercicios, supersets, reordenar) queda para el próximo run: es el editor de rutinas."
      params={params}
    />
  );
}
