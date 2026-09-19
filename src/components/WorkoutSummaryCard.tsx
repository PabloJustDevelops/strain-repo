import { formatDateShort, formatNumber } from '@lib/format';
import { topByVolume } from '@lib/metrics';
import { px } from '@lib/theme';
import { useTheme } from '@lib/useTheme';
import type { SessionExerciseSummary } from '@db/shapes';
import type { WorkoutSession } from '@/types/domain';
import { Text } from '@components/Text';

/**
 * Tarjeta resumen de un workout finalizado, pensada para verse y compartirse.
 *
 * En la app anterior esta tarjeta se capturaba con ViewShot para compartirla como
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
      style={{ width: px(width), height: px(height), backgroundColor: colors.bg, borderColor: colors.line }}
    >
      <view>
        <view className="SummaryBrand">
          <view className="SummaryBrandBadge" style={{ backgroundColor: colors.accent }}>
            <Text role="title" tone="onAccent">S</Text>
          </view>
          <Text role="title" tone="textPrimary">
            STRAIN
          </Text>
        </view>

        <Text role="detail" tone="textSecondary">
          {formatDateShort(start)}
        </Text>
        <Text role="heading" tone="textPrimary">
          {session.name}
        </Text>
      </view>

      <view>
        <view className="StatRow">
          <Stat label="Duración" value={`${durationMin} min`} />
          <Stat label="Series" value={String(session.totalSets)} />
          <Stat label="Volumen" value={formatNumber(session.totalVolume)} unit="kg" />
        </view>

        {top.length > 0 ? (
          <view className="SummaryTop">
            <Text role="detail" tone="textSecondary">
              Top ejercicios
            </Text>
            {top.map((entry, index) => (
              <view className="RowBetween" key={`top-${index}-${entry.name}`}>
                <Text role="support" tone="accent">
                  {index + 1}
                </Text>
                <Text role="support" tone="textPrimary">
                  {entry.name}
                </Text>
                <Text role="detail" tone="textSecondary">
                  {formatNumber(entry.volume)} kg
                </Text>
              </view>
            ))}
          </view>
        ) : null}
      </view>

      <Text role="detail" tone="textSecondary">
        strain.app · workout #{session.id.slice(-4)}
      </Text>
    </view>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  const { colors } = useTheme();

  return (
    <view className="Stat">
      <Text role="detail" tone="textSecondary">
        {label}
      </Text>
      <Text role="title" tone="textPrimary">
        {value}
        {unit ? ` ${unit}` : ''}
      </Text>
    </view>
  );
}
