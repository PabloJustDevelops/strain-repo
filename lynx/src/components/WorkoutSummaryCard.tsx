import { formatDateShort, formatNumber } from '@lib/format';
import { topByVolume } from '@lib/metrics';
import { useTheme } from '@lib/useTheme';
import type { SessionExerciseSummary } from '@db/shapes';
import type { WorkoutSession } from '@/types/domain';

/**
 * Tarjeta resumen de un workout finalizado, pensada para verse y compartirse.
 *
 * En la app Expo esta tarjeta se capturaba con ViewShot para compartirla como
 * imagen. En Lynx la captura de vistas sería un native module (fuera de alcance
 * de esta fase), así que acá queda como tarjeta presentacional: la usa la
 * pantalla de detalle de sesión y el día que exista el módulo de captura se le
 * pasa una `ref` sin cambiar sus props.
 *
 * Sin `Intl`: la fecha y las cifras se formatean a mano (`@lib/format`).
 */
interface WorkoutSummaryCardProps {
  session: WorkoutSession & {
    exercises?: SessionExerciseSummary[];
  };
  width?: number;
  height?: number;
}

export function WorkoutSummaryCard({ session, width = 360, height = 540 }: WorkoutSummaryCardProps) {
  const { colors } = useTheme();

  const start = session.startedAt ?? new Date();
  const end = session.endedAt ?? new Date();
  const durationMin = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));

  const top = topByVolume(session.exercises ?? [], 3).map(({ exercise, volume }) => ({
    name: exercise.name,
    volume,
  }));

  return (
    <view
      className="SummaryCard"
      style={{ width, height, backgroundColor: colors.bg, borderColor: colors.line }}
    >
      <view>
        <view className="SummaryBrand">
          <view className="SummaryBrandBadge" style={{ backgroundColor: colors.accent }}>
            <text className="SummaryBrandMark">S</text>
          </view>
          <text className="SummaryBrandName" style={{ color: colors.textPrimary }}>
            STRAIN
          </text>
        </view>

        <text className="SummaryDate" style={{ color: colors.textSecondary }}>
          {formatDateShort(start)}
        </text>
        <text className="SummaryTitle" style={{ color: colors.textPrimary }}>
          {session.name}
        </text>
      </view>

      <view>
        <view className="StatRow">
          <Stat label="Duración" value={`${durationMin} min`} />
          <Stat label="Series" value={String(session.totalSets)} />
          <Stat label="Volumen" value={formatNumber(session.totalVolume)} unit="kg" />
        </view>

        {top.length > 0 ? (
          <view className="SummaryTop">
            <text className="CardLabel" style={{ color: colors.textSecondary }}>
              Top ejercicios
            </text>
            {top.map((entry, index) => (
              <view className="RowBetween" key={`top-${index}-${entry.name}`}>
                <text className="SummaryRank" style={{ color: colors.accent }}>
                  {index + 1}
                </text>
                <text className="SummaryTopName" style={{ color: colors.textPrimary }}>
                  {entry.name}
                </text>
                <text className="Meta" style={{ color: colors.textSecondary }}>
                  {formatNumber(entry.volume)} kg
                </text>
              </view>
            ))}
          </view>
        ) : null}
      </view>

      <text className="SummaryFooter" style={{ color: colors.textSecondary }}>
        strain.app · workout #{session.id.slice(-4)}
      </text>
    </view>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  const { colors } = useTheme();

  return (
    <view className="Stat">
      <text className="StatLabel" style={{ color: colors.textSecondary }}>
        {label}
      </text>
      <text className="ListTitle" style={{ color: colors.textPrimary }}>
        {value}
        {unit ? ` ${unit}` : ''}
      </text>
    </view>
  );
}
