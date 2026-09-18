import { getRepos } from '@db';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { EmptyState } from '@components/EmptyState';
import { ErrorNote, Loading } from '@components/Loading';
import { Screen } from '@components/Screen';
import { formatDateTime } from '@lib/format';
import { remountKey } from '@lib/reactKeys';
import { useRouter } from '@lib/router';
import { useLoad } from '@lib/useLoad';
import { useTheme } from '@lib/useTheme';
import { useActiveWorkout } from '@stores/activeWorkoutStore';
import type { Routine } from '@/types/domain';

/**
 * Lista de rutinas (plantillas reutilizables).
 *
 * "Empezar" crea la sesión desde los targets de la rutina y navega al modo
 * activo; el detalle editable todavía es un stub.
 */
export function RoutinesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const startFromRoutine = useActiveWorkout((s) => s.startFromRoutine);

  const routines = useLoad<Routine[]>([], () => getRepos().routines.list());

  async function handleStart(routine: Routine) {
    await startFromRoutine(routine.id);
    router.push('workout/active', { id: routine.id });
  }

  return (
    <Screen title="Rutinas" subtitle={`${routines.data.length} en total`}>
      {routines.loading ? <Loading /> : null}
      {routines.error ? <ErrorNote message={routines.error} /> : null}

      {!routines.loading && routines.data.length === 0 ? (
        <EmptyState
          title="No tienes rutinas todavía"
          body="Crea la primera para empezar a entrenar desde una plantilla."
        />
      ) : null}

      {routines.data.map((routine) => (
        <Card key={remountKey('routine', routine.id)}>
          <view className="RowBetween">
            <view className="RowFill">
              <text className="ListTitle" style={{ color: colors.textPrimary }}>
                {routine.name}
              </text>
              {routine.description ? (
                <text className="ListSubtitle" style={{ color: colors.textSecondary }}>
                  {routine.description}
                </text>
              ) : null}
            </view>
            <view
              className="ColorSwatch"
              style={{ backgroundColor: routine.color ?? colors.accent }}
            />
          </view>

          <text className="Meta" style={{ color: colors.textSecondary }}>
            Actualizada {formatDateTime(new Date(routine.updatedAt))}
          </text>

          <view className="RowActions">
            <Button title="Empezar" onPress={() => handleStart(routine)} />
            <Button
              title="Ver detalle"
              variant="secondary"
              onPress={() => router.push('routines/[id]', { id: routine.id })}
            />
          </view>
        </Card>
      ))}
    </Screen>
  );
}
