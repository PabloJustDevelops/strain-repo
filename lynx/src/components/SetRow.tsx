import { useTheme } from '@lib/useTheme';
import { calculatePlates, type PlateResult } from '@lib/plateCalculator';
import type { SetView } from '@db/shapes';
import { Text } from '@components/Text';

/**
 * Fila de un set dentro del workout activo.
 *
 * Qué cambia respecto de la app Expo:
 * - **No hay swipe.** Lynx no trae `gesture-handler`/`reanimated`, y el elemento
 *   `<SwipeAction>` de Lynx UI no está en `@lynx-js/types` (ni instalado). Las
 *   acciones de swipe ("completar" / "eliminar") pasan a ser botones explícitos
 *   en la propia fila: más descubribles y sin depender de un gesto nativo.
 *   `@lib/swipeActions` (la opacidad del fondo durante el swipe) queda sin
 *   consumidor por el mismo motivo, lista para cuando exista el gesto.
 * - El detalle opcional del set (RPE/notas) se abría con long-press; ahora hay
 *   un botón "…" además de `bindlongpress`, así la acción se ve.
 *
 * El resto se mantiene: tap en el peso abre la calculadora de discos (o el
 * keypad si el set ya está completado) y tap en las reps abre el keypad.
 */
interface SetRowProps {
  set: SetView;
  previous?: SetView | null;
  units: 'kg' | 'lb';
  onComplete: () => void;
  onUncomplete: () => void;
  onDelete: () => void;
  onShowPlates: (result: PlateResult) => void;
  onEditWeight?: () => void;
  onEditReps?: () => void;
  onOpenDetails?: () => void;
}

export function SetRow({
  set,
  previous,
  units,
  onComplete,
  onUncomplete,
  onDelete,
  onShowPlates,
  onEditWeight,
  onEditReps,
  onOpenDetails,
}: SetRowProps) {
  const { colors } = useTheme();

  const hasDetails = set.rpe !== null || (set.notes ?? '').length > 0;

  const handleWeightTap = () => {
    // Completado: el peso se corrige con el keypad. Sin completar: el peso que
    // hay es el objetivo, así que lo útil es ver cómo se arma con los discos.
    if (set.isCompleted && onEditWeight) {
      onEditWeight();

      return;
    }

    onShowPlates(calculatePlates(set.weight));
  };

  return (
    <view
      className="WorkoutSet"
      style={{ borderColor: colors.line, backgroundColor: colors.surface }}
      bindlongpress={onOpenDetails}
    >
      <view className="WorkoutSetRow">
        <Text role="detail" tone="textSecondary">
          {set.setIndex}
        </Text>

        <view className="SetPrev">
          {previous ? (
            <Text role="detail" tone="textSecondary">
              ant. {previous.reps}×{previous.weight}
            </Text>
          ) : null}
        </view>

        <view className="SetCell" bindtap={handleWeightTap}>
          <Text role="heading" tone="textPrimary">
            {set.weight || '—'}
          </Text>
          <Text role="detail" tone="textSecondary">
            {units}
          </Text>
        </view>

        <view className="SetDivider" style={{ backgroundColor: colors.line }} />

        <view className="SetCell" bindtap={onEditReps}>
          <Text role="heading" tone="textPrimary">
            {set.reps || '—'}
          </Text>
          <Text role="detail" tone="textSecondary">
            reps
          </Text>
        </view>

        <view
          className="SetToggle"
          style={{
            backgroundColor: set.isCompleted ? colors.success : 'transparent',
            borderColor: set.isCompleted ? colors.success : colors.line,
          }}
          bindtap={set.isCompleted ? onUncomplete : onComplete}
        >
          {set.isCompleted ? (
            <Text role="support" tone="onAccent">
              ✓
            </Text>
          ) : null}
        </view>

        <view className="SetIconButton" bindtap={onDelete}>
          <Text role="title" tone="danger">
            ✕
          </Text>
        </view>

        {onOpenDetails ? (
          <view className="SetIconButton" bindtap={onOpenDetails}>
            <Text role="title" tone="textSecondary">
              ⋯
            </Text>
          </view>
        ) : null}
      </view>

      {hasDetails ? (
        <view className="SetDetailsLine">
          {set.rpe !== null ? (
            <Text role="detail" tone="textSecondary">
              RPE {set.rpe}
            </Text>
          ) : null}
          {set.notes ? (
            <Text role="detail" tone="textSecondary">
              {set.notes}
            </Text>
          ) : null}
        </view>
      ) : null}
    </view>
  );
}
