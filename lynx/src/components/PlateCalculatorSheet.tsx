import { Sheet } from '@components/Sheet';
import { formatWeight } from '@lib/format';
import { plateShortfallMessage, type PlateResult } from '@lib/plateCalculator';
import { useTheme } from '@lib/useTheme';
import { usePreferences } from '@stores/preferencesStore';

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
              <text className="StatLabel" style={{ color: colors.textSecondary }}>
                Objetivo
              </text>
              <text className="ListTitle" style={{ color: colors.textPrimary }}>
                {formatWeight(result.totalWeight + result.remainder, units)}
              </text>
            </view>
            <view className="Stat">
              <text className="StatLabel" style={{ color: colors.textSecondary }}>
                Alcanzable
              </text>
              <text
                className="ListTitle"
                style={{ color: result.achievable ? colors.success : colors.warning }}
              >
                {formatWeight(result.totalWeight, units)}
              </text>
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
            <text className="CardBody" style={{ color: colors.textSecondary }}>
              Solo la barra ({formatWeight(result.barWeight, units)}).
            </text>
          ) : (
            result.platesPerSide.map((plate) => (
              <view className="RowBetween" key={`plate-${plate.plateKg}`}>
                <text className="ListSubtitle" style={{ color: colors.textPrimary }}>
                  {plate.plateKg} kg
                </text>
                <text className="ListSubtitle" style={{ color: colors.textSecondary }}>
                  ×{plate.perSide} por lado
                </text>
              </view>
            ))
          )}

          {shortfall ? (
            <text className="CardBody" style={{ color: colors.warning }}>
              {shortfall}
            </text>
          ) : null}
        </view>
      ) : null}
    </Sheet>
  );
}

function PlateDisk({ kg }: { kg: number }) {
  const height = Math.min(60, 12 + kg * 1.8);
  const backgroundColor = kg >= 20 ? '#ef4444' : kg >= 10 ? '#3b82f6' : kg >= 5 ? '#22c55e' : '#a3a3a3';

  return <view className="PlateDisk" style={{ height, backgroundColor }} />;
}
