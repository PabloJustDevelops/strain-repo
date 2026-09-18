import { useEffect } from '@lynx-js/react';

import { formatDuration } from '@lib/format';
import { useTheme } from '@lib/useTheme';
import { useActiveWorkout } from '@stores/activeWorkoutStore';

/**
 * Barra flotante del descanso entre series.
 *
 * El estado y el reloj viven en el store: acá sólo se le pide un tick por
 * segundo mientras hay descanso. La cuenta atrás se calcula contra el instante
 * de fin (`@lib/rest`), así que el intervalo no acumula error.
 *
 * No hay háptica (es un native module, fuera de alcance) ni animación de pulso
 * (`reanimated` no existe en Lynx): cuando quedan 5 segundos o menos, el número
 * cambia de color y eso es toda la señal.
 */
export function RestTimer() {
  const { colors } = useTheme();

  const isResting = useActiveWorkout((s) => s.isResting);
  const restRemaining = useActiveWorkout((s) => s.restRemaining);
  const skipRest = useActiveWorkout((s) => s.skipRest);
  const tickRest = useActiveWorkout((s) => s.tickRest);
  const startRest = useActiveWorkout((s) => s.startRest);

  useEffect(() => {
    if (!isResting) return;

    const id = setInterval(() => tickRest(), 1000);

    return () => clearInterval(id);
  }, [isResting, tickRest]);

  if (!isResting) return null;

  const almostDone = restRemaining <= 5;

  return (
    <view
      className="RestTimer"
      style={{ backgroundColor: colors.surfaceElevated, borderColor: colors.border }}
    >
      <view className="RowFill">
        <text className="RestLabel" style={{ color: colors.textMuted }}>
          DESCANSO
        </text>
        <text
          className="RestClock"
          style={{ color: almostDone ? colors.warning : colors.text }}
        >
          {formatDuration(restRemaining)}
        </text>
      </view>

      <view
        className="RestSmallButton"
        style={{ backgroundColor: colors.surface }}
        bindtap={() => startRest(restRemaining - 15)}
      >
        <text className="RestSmallLabel" style={{ color: colors.text }}>
          −15
        </text>
      </view>

      <view
        className="RestSmallButton"
        style={{ backgroundColor: colors.surface }}
        bindtap={() => startRest(restRemaining + 15)}
      >
        <text className="RestSmallLabel" style={{ color: colors.text }}>
          +15
        </text>
      </view>

      <view
        className="RestSkip"
        style={{ backgroundColor: colors.primary }}
        bindtap={skipRest}
      >
        <text className="RestSkipLabel">Saltar</text>
      </view>
    </view>
  );
}
