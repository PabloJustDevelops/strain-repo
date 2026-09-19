import { Sheet } from '@components/Sheet';
import { formatWeight } from '@lib/format';
import { plateShortfallMessage, type PlateResult } from '@lib/plateCalculator';
import { px } from '@lib/theme';
import { useTheme } from '@lib/useTheme';
import { usePreferences } from '@stores/preferencesStore';
import { Text } from '@components/Text';

/**
 * Distribución de discos para un peso objetivo.
 *
 * El cálculo vive en `@lib/plateCalculator`; acá sólo se pinta. Los discos se
 * dibujan a mano con `<view>` (altura proporcional al peso), sin SVG ni
 * librería de gráficos.
 */
interface PlateCalculatorSheetProps {
  result: PlateResult | null;
  onClose: () => void;
}

export function PlateCalculatorSheet({ result, onClose }: PlateCalculatorSheetProps) {
  const { colors } = useTheme();
  const units = usePreferences((s) => s.units);

  const shortfall = result ? plateShortfallMessage(result) : null;

  /** Los discos de un lado, del más pesado (pegado a la barra) al más liviano. */
  const perSide = result
    ? result.platesPerSide.flatMap((p) => Array.from({ length: p.perSide }, () => p.plateKg))
    : [];

  return (
    <Sheet visible={result !== null} title="Calculadora de discos" onClose={onClose}>
      {result ? (
        <view>
          <view className="RowBetween">
            <view className="Stat">
              <Text role="detail" tone="textSecondary">
                Objetivo
              </Text>
              <Text role="title" tone="textPrimary">
                {formatWeight(result.totalWeight + result.remainder, units)}
              </Text>
            </view>
            <view className="Stat">
              <Text role="detail" tone="textSecondary">
                Alcanzable
              </Text>
              <Text
                role="title"
                tone={result.achievable ? 'success' : 'warning'}
              >
                {formatWeight(result.totalWeight, units)}
              </Text>
            </view>
          </view>

          <view className="PlateBar" style={{ backgroundColor: colors.bg }}>
            <view className="PlateSide">
              {[...perSide].reverse().map((kg, index) => (
                <PlateDisk key={`L-${index}-${kg}`} kg={kg} />
              ))}
            </view>
            <view className="PlateRod" style={{ backgroundColor: colors.textPrimary }} />
            <view className="PlateSide">
              {perSide.map((kg, index) => (
                <PlateDisk key={`R-${index}-${kg}`} kg={kg} />
              ))}
            </view>
          </view>

          {result.platesPerSide.length === 0 ? (
            <Text role="support" tone="textSecondary">
              Solo la barra ({formatWeight(result.barWeight, units)}).
            </Text>
          ) : (
            result.platesPerSide.map((plate) => (
              <view className="RowBetween" key={`plate-${plate.plateKg}`}>
                <Text role="support" tone="textPrimary">
                  {plate.plateKg} kg
                </Text>
                <Text role="support" tone="textSecondary">
                  ×{plate.perSide} por lado
                </Text>
              </view>
            ))
          )}

          {shortfall ? (
            <Text role="support" tone="warning">
              {shortfall}
            </Text>
          ) : null}
        </view>
      ) : null}
    </Sheet>
  );
}

function PlateDisk({ kg }: { kg: number }) {
  const height = Math.min(60, 12 + kg * 1.8);
  const backgroundColor = kg >= 20 ? '#ef4444' : kg >= 10 ? '#3b82f6' : kg >= 5 ? '#22c55e' : '#a3a3a3';

  return <view className="PlateDisk" style={{ height: px(height), backgroundColor }} />;
}
