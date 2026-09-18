import { useEffect } from '@lynx-js/react';

import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { Screen } from '@components/Screen';
import { useTheme } from '@lib/useTheme';
import {
  useHealthConnect,
  type HealthConnectStatus,
} from '@stores/healthConnectStore';
import type { ThemeColors } from '@lib/theme';

const STATUS_LABEL: Record<HealthConnectStatus, string> = {
  unknown: 'Comprobando…',
  unavailable: 'No disponible en este dispositivo',
  needsInstall: 'Instala Health Connect para empezar',
  notAuthorized: 'Concede permisos a Strain',
  ready: 'Conectado a Health Connect',
};

function statusColor(status: HealthConnectStatus, colors: ThemeColors): string {
  if (status === 'ready') return colors.success;
  if (status === 'unavailable') return colors.danger;
  if (status === 'needsInstall' || status === 'notAuthorized') return colors.warning;

  return colors.textSecondary;
}

/**
 * Pantalla de salud.
 *
 * El estado sale de `healthConnectStore`, que habla con el driver de
 * `@lib/healthConnect`. En Lynx no hay driver nativo registrado todavía, así que
 * el árbol reporta "no disponible" y no hay datos que mostrar: eso es lo correcto,
 * no un fallo de la pantalla.
 */
export function HealthScreen() {
  const { colors } = useTheme();

  const status = useHealthConnect((s) => s.status);
  const isLoading = useHealthConnect((s) => s.isLoading);
  const today = useHealthConnect((s) => s.today);
  const lastError = useHealthConnect((s) => s.lastError);
  const probe = useHealthConnect((s) => s.probe);

  useEffect(() => {
    probe();
  }, []);

  return (
    <Screen title="Salud" subtitle="Health Connect">
      <Card>
        <view className="RowBetween">
          <text className="ListTitle" style={{ color: colors.textPrimary }}>
            Health Connect
          </text>
          <text className="ListTitle" style={{ color: statusColor(status, colors) }}>
            {isLoading ? '…' : STATUS_LABEL[status]}
          </text>
        </view>

        <text className="CardBody" style={{ color: colors.textSecondary }}>
          El bridge nativo todavía no existe: en Lynx, Health Connect pide un native
          module propio expuesto con lynx.getJSModule. Sin él, el driver es nulo y todo
          esto reporta no disponible.
        </text>

        <view className="RowActions">
          <Button title="Volver a comprobar" variant="secondary" onPress={probe} />
        </view>
      </Card>

      {status === 'ready' && today ? (
        <Card>
          <text className="CardTitle" style={{ color: colors.textPrimary }}>
            Hoy
          </text>
          <view className="StatRow">
            <Metric label="Pasos" value={formatNumber(today.steps)} />
            <Metric label="Cal. activas" value={formatNumber(today.activeCalories)} />
            <Metric label="Distancia" value={`${(today.distanceMeters / 1000).toFixed(2)} km`} />
            <Metric label="FC media" value={formatNumber(today.avgHeartRate, ' bpm')} />
            <Metric label="FC reposo" value={formatNumber(today.restingHeartRate, ' bpm')} />
            <Metric label="Sueño" value={formatSleep(today.sleepMinutes)} />
          </view>
        </Card>
      ) : null}

      {lastError ? (
        <Card>
          <text className="CardBody" style={{ color: colors.danger }}>
            {lastError}
          </text>
        </Card>
      ) : null}
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();

  return (
    <view className="Stat">
      <text className="StatLabel" style={{ color: colors.textSecondary }}>
        {label}
      </text>
      <text className="StatText" style={{ color: colors.textPrimary }}>
        {value}
      </text>
    </view>
  );
}

/** `—` cuando no hay dato: no se sintetiza un 0 que parecería una medición. */
function formatNumber(value: number | null | undefined, suffix = ''): string {
  if (value === null || value === undefined) return '—';

  return `${Math.round(value)}${suffix}`;
}

function formatSleep(minutes: number | null): string {
  if (minutes === null) return '—';
  const hours = Math.floor(minutes / 60);

  return `${hours}h ${minutes % 60}m`;
}
