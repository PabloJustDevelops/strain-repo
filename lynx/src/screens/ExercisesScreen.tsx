import { useState } from '@lynx-js/react';

import { getRepos } from '@db';
import { Card } from '@components/Card';
import { EmptyState } from '@components/EmptyState';
import { ErrorNote, Loading } from '@components/Loading';
import { MuscleChip } from '@components/MuscleChip';
import { Screen } from '@components/Screen';
import { equipmentLabel, muscleGroupLabel } from '@lib/labels';
import { remountKey } from '@lib/reactKeys';
import { useRouter } from '@lib/router';
import { useLoad } from '@lib/useLoad';
import { useTheme } from '@lib/useTheme';
import { MUSCLE_GROUP_LABELS, type Exercise, type MuscleGroup } from '@/types/domain';

const MUSCLE_FILTERS: readonly (MuscleGroup | 'all')[] = [
  'all',
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
  'other',
];

/**
 * Biblioteca de ejercicios sobre `exercisesRepo`.
 *
 * La búsqueda y el filtro se resuelven en memoria sobre la lista ya cargada
 * (igual que en la app Expo), así que no vuelven a consultar la seam KV.
 */
export function ExercisesScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MuscleGroup | 'all'>('all');

  const exercises = useLoad<Exercise[]>([], () => getRepos().exercises.list());

  const needle = query.trim().toLowerCase();
  const filtered = exercises.data.filter(
    (ex) =>
      (filter === 'all' || ex.muscleGroup === filter) &&
      (needle.length === 0 || ex.name.toLowerCase().includes(needle)),
  );

  return (
    <Screen
      title="Ejercicios"
      subtitle={exercises.loading ? undefined : `${filtered.length} de ${exercises.data.length}`}
    >
      <input
        className="Input"
        style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}
        placeholder="Buscar ejercicio"
        bindinput={(e) => setQuery(e.detail.value)}
      />

      <view className="ChipRow">
        {MUSCLE_FILTERS.map((group) => (
          <MuscleChip
            key={remountKey('muscle', group)}
            group={group === 'all' ? 'chest' : group}
            label={group === 'all' ? 'Todos' : MUSCLE_GROUP_LABELS[group]}
            active={filter === group}
            onPress={() => setFilter(group)}
          />
        ))}
      </view>

      {exercises.loading ? <Loading /> : null}
      {exercises.error ? <ErrorNote message={exercises.error} /> : null}

      {!exercises.loading && filtered.length === 0 ? (
        <EmptyState
          title="Sin resultados"
          body="Ningún ejercicio coincide con la búsqueda y el filtro actuales."
        />
      ) : null}

      {filtered.map((exercise) => (
        <Card key={remountKey('exercise', exercise.id)}>
          <view bindtap={() => router.push('exercises/[id]', { id: exercise.id })}>
            <text className="ListTitle" style={{ color: colors.text }}>
              {exercise.name}
            </text>
            <text className="ListSubtitle" style={{ color: colors.textMuted }}>
              {muscleGroupLabel(exercise.muscleGroup)} · {equipmentLabel(exercise.equipment)}
            </text>
          </view>
        </Card>
      ))}
    </Screen>
  );
}
