import { useEffect } from '@lynx-js/react';

import { formatDuration } from '@lib/format';
import { useTheme } from '@lib/useTheme';
import { useActiveWorkout } from '@stores/activeWorkoutStore';
import { Text } from '@components/Text';

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
      style={{ backgroundColor: colors.surfaceRaised, borderColor: colors.line }}
    >
      <view className="RowFill">
        <Text role="detail" tone="textSecondary">
          DESCANSO
        </Text>
        <Text role="display" tone={almostDone ? 'warning' : 'textPrimary'}>
          {formatDuration(restRemaining)}
        </Text>
      </view>

      <view
        className="RestSmallButton"
        style={{ backgroundColor: colors.surface }}
        bindtap={() => startRest(restRemaining - 15)}
      >
        <Text role="support" tone="textPrimary">
          −15
        </Text>
      </view>

      <view
        className="RestSmallButton"
        style={{ backgroundColor: colors.surface }}
        bindtap={() => startRest(restRemaining + 15)}
      >
        <Text role="support" tone="textPrimary">
          +15
        </Text>
      </view>

      <view
        className="RestSkip"
        style={{ backgroundColor: colors.accent }}
        bindtap={skipRest}
      >
        <Text role="support" tone="onAccent">Saltar</Text>
      </view>
    </view>
  );
}
