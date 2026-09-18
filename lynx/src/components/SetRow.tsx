import { useTheme } from '@lib/useTheme';
import { calculatePlates, type PlateResult } from '@lib/plateCalculator';
import type { SetView } from '@db/shapes';

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
        <text className="SetIndex" style={{ color: colors.textSecondary }}>
          {set.setIndex}
        </text>

        <view className="SetPrev">
          {previous ? (
            <text className="SetPrevText" style={{ color: colors.textSecondary }}>
              ant. {previous.reps}×{previous.weight}
            </text>
          ) : null}
        </view>

        <view className="SetCell" bindtap={handleWeightTap}>
          <text className="SetValue" style={{ color: colors.textPrimary }}>
            {set.weight || '—'}
          </text>
          <text className="SetUnit" style={{ color: colors.textSecondary }}>
            {units}
          </text>
        </view>

        <view className="SetDivider" style={{ backgroundColor: colors.line }} />

        <view className="SetCell" bindtap={onEditReps}>
          <text className="SetValue" style={{ color: colors.textPrimary }}>
            {set.reps || '—'}
          </text>
          <text className="SetUnit" style={{ color: colors.textSecondary }}>
            reps
          </text>
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
            <text className="SetToggleLabel" style={{ color: '#ffffff' }}>
              ✓
            </text>
          ) : null}
        </view>

        <view className="SetIconButton" bindtap={onDelete}>
          <text className="SetIconLabel" style={{ color: colors.danger }}>
            ✕
          </text>
        </view>

        {onOpenDetails ? (
          <view className="SetIconButton" bindtap={onOpenDetails}>
            <text className="SetIconLabel" style={{ color: colors.textSecondary }}>
              ⋯
            </text>
          </view>
        ) : null}
      </view>

      {hasDetails ? (
        <view className="SetDetailsLine">
          {set.rpe !== null ? (
            <text className="SetDetailText" style={{ color: colors.textSecondary }}>
              RPE {set.rpe}
            </text>
          ) : null}
          {set.notes ? (
            <text className="SetDetailText" style={{ color: colors.textSecondary }}>
              {set.notes}
            </text>
          ) : null}
        </view>
      ) : null}
    </view>
  );
}
