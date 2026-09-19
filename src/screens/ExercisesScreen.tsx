import { Input } from '@lynx-js/lynx-ui';
import { useState } from '@lynx-js/react';

import { getRepos } from '@db';
import { EmptyState } from '@components/EmptyState';
import { Icon } from '@components/Icon';
import { ListRow } from '@components/ListRow';
import { ErrorNote, Loading } from '@components/Loading';
import { MuscleChip } from '@components/MuscleChip';
import { Screen } from '@components/Screen';
import {
  MUSCLE_FILTERS,
  equipmentLabel,
  exerciseCountLabel,
  muscleFilterChip,
  muscleGroupLabel,
  type MuscleFilter,
} from '@lib/labels';
import { remountKey } from '@lib/reactKeys';
import { useRouter } from '@lib/router';
import { useLoad } from '@lib/useLoad';
import { useTheme } from '@lib/useTheme';
import type { Exercise } from '@/types/domain';

/**
 * Biblioteca de ejercicios sobre `exercisesRepo`.
 *
 * La búsqueda y el filtro se resuelven en memoria sobre la lista ya cargada
 * (igual que en la app anterior), así que no vuelven a consultar la seam KV.
 */
export function ExercisesScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MuscleFilter>('all');

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
      subtitle={
        exercises.loading
          ? undefined
          : exerciseCountLabel(filtered.length, exercises.data.length)
      }
    >
      <view
        className="SearchField"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        <Icon name="search" size={18} tone="textSecondary" className="SearchFieldIcon" />
        <Input
          className="SearchFieldInput"
          style={{ color: colors.textPrimary }}
          placeholder="Buscar ejercicio"
          confirmType="search"
          value={query}
          onInput={(value) => setQuery(value)}
        />
      </view>

      <view className="ChipRow">
        {MUSCLE_FILTERS.map((group) => {
          const chip = muscleFilterChip(group);

          return (
            <MuscleChip
              key={remountKey('muscle', group)}
              group={chip.group}
              label={chip.label}
              active={filter === group}
              onPress={() => setFilter(group)}
            />
          );
        })}
      </view>

      {exercises.loading ? <Loading /> : null}
      {exercises.error ? <ErrorNote message={exercises.error} /> : null}

      {!exercises.loading && exercises.data.length === 0 ? (
        <EmptyState
          icon="dumbbell"
          title="Biblioteca vacía"
          body="Todavía no hay ejercicios en la biblioteca."
        />
      ) : null}

      {!exercises.loading && exercises.data.length > 0 && filtered.length === 0 ? (
        <EmptyState
          icon="list"
          title="Sin coincidencias"
          body="Ningún ejercicio coincide con la búsqueda o el filtro activo."
        />
      ) : null}

      {filtered.map((exercise) => (
        <ListRow
          key={remountKey('exercise', exercise.id)}
          dense
          chevron
          title={exercise.name}
          meta={`${muscleGroupLabel(exercise.muscleGroup)} · ${equipmentLabel(exercise.equipment)}`}
          onPress={() => router.push('exercises/[id]', { id: exercise.id })}
        />
      ))}
    </Screen>
  );
}
