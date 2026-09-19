import { useEffect } from '@lynx-js/react';

import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { Screen } from '@components/Screen';
import { Text, type TextTone } from '@components/Text';
import {
  useHealthConnect,
  type HealthConnectStatus,
} from '@stores/healthConnectStore';

const STATUS_LABEL: Record<HealthConnectStatus, string> = {
  unknown: 'Comprobando…',
  unavailable: 'No disponible en este dispositivo',
  needsInstall: 'Instala Health Connect para empezar',
  notAuthorized: 'Concede permisos a Strain',
  ready: 'Conectado a Health Connect',
};

function statusTone(status: HealthConnectStatus): TextTone {
  if (status === 'ready') return 'success';
  if (status === 'unavailable') return 'danger';
  if (status === 'needsInstall' || status === 'notAuthorized') return 'warning';

  return 'textSecondary';
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
          <Text role="title" tone="textPrimary">
            Health Connect
          </Text>
          <Text role="title" tone={statusTone(status)}>
            {isLoading ? '…' : STATUS_LABEL[status]}
          </Text>
        </view>

        <Text role="support" tone="textSecondary">
          El bridge nativo todavía no existe: en Lynx, Health Connect pide un native
          module propio expuesto con lynx.getJSModule. Sin él, el driver es nulo y todo
          esto reporta no disponible.
        </Text>

        <view className="RowActions">
          <Button title="Volver a comprobar" variant="secondary" onPress={probe} />
        </view>
      </Card>

      {status === 'ready' && today ? (
        <Card>
          <Text role="title" tone="textPrimary">
            Hoy
          </Text>
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
          <Text role="support" tone="danger">
            {lastError}
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <view className="Stat">
      <Text role="detail" tone="textSecondary">
        {label}
      </Text>
      <Text role="support" tone="textPrimary">
        {value}
      </Text>
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
