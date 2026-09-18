import { Input } from '@lynx-js/lynx-ui';
import { useEffect, useState } from '@lynx-js/react';

import { getRepos } from '@db';
import { Button } from '@components/Button';
import { EmptyState } from '@components/EmptyState';
import { ErrorNote, Loading } from '@components/Loading';
import { MuscleChip } from '@components/MuscleChip';
import { Text } from '@components/Text';
import {
  MUSCLE_FILTERS,
  equipmentLabel,
  muscleFilterChip,
  muscleGroupLabel,
  type MuscleFilter,
} from '@lib/labels';
import { remountKey } from '@lib/reactKeys';
import { useRouter } from '@lib/router';
import { toggleId, withoutExisting } from '@lib/routineEditor';
import { useTheme } from '@lib/useTheme';
import type { RouteProps } from '@/app/routes';
import type { Exercise } from '@/types/domain';

/** Texto del botón de confirmación, según cuántos ejercicios se marcaron. */
function confirmLabel(count: number): string {
  if (count === 1) return 'Añadir 1 ejercicio';

  return `Añadir ${count} ejercicios`;
}

/**
 * Selector de ejercicios para una rutina, con selección múltiple.
 *
 * Reutiliza el vocabulario de la biblioteca (búsqueda y chips por grupo) y sólo
 * ofrece lo que la rutina todavía no tiene, para no crear duplicados. Marcar
 * varios y confirmar agrega todos y vuelve al detalle, que se recarga al
 * montarse de nuevo.
 */
export function AddExerciseScreen({ params }: RouteProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const id = params.id ?? '';

  const [available, setAvailable] = useState<Exercise[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MuscleFilter>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);

      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all([
      getRepos().exercises.list(),
      getRepos().routines.getWithExercises(id),
    ]).then(
      ([catalog, routine]) => {
        if (cancelled) return;

        const existing = (routine?.exercises ?? []).map((row) => row.exerciseId);
        setAvailable(withoutExisting(catalog, existing));
        setError(null);
        setLoading(false);
      },
      (err) => {
        if (cancelled) return;

        setError(String(err));
        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [id]);

  const needle = query.trim().toLowerCase();
  const filtered = available.filter(
    (exercise) =>
      (filter === 'all' || exercise.muscleGroup === filter) &&
      (needle.length === 0 || exercise.name.toLowerCase().includes(needle)),
  );

  async function handleConfirm() {
    if (!id || selected.length === 0 || saving) return;

    setSaving(true);

    try {
      for (const exerciseId of selected) {
        await getRepos().routines.addExercise(id, exerciseId);
      }

      router.back();
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  }

  if (!id) {
    return (
      <view className="Screen" style={{ backgroundColor: colors.bg }}>
        <ErrorNote message="No se recibió la rutina a la que agregar ejercicios." />
      </view>
    );
  }

  return (
    <view className="Screen" style={{ backgroundColor: colors.bg }}>
      <view className="PanelHeader" style={{ borderColor: colors.line }}>
        <Input
          className="Input"
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.line,
            color: colors.textPrimary,
          }}
          placeholder="Buscar ejercicio"
          confirmType="search"
          value={query}
          onInput={(value) => setQuery(value)}
        />

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
      </view>

      <scroll-view className="ScreenScroll" scroll-orientation="vertical">
        <view className="ScreenContent">
          {loading ? <Loading /> : null}
          {error ? <ErrorNote message={error} /> : null}

          {!loading && available.length === 0 ? (
            <EmptyState
              title="Ya tenés todos los ejercicios"
              body="La rutina ya incluye todo el catálogo. Quitá alguno para poder volver a agregarlo."
            />
          ) : null}

          {!loading && available.length > 0 && filtered.length === 0 ? (
            <EmptyState
              title="Sin resultados"
              body="Ningún ejercicio coincide con la búsqueda y el filtro actuales."
            />
          ) : null}

          {filtered.map((exercise) => {
            const isSelected = selected.includes(exercise.id);

            return (
              <view
                className="SelectRow"
                key={remountKey('select', exercise.id)}
                style={{ borderColor: colors.line }}
                bindtap={() => setSelected((ids) => toggleId(ids, exercise.id))}
              >
                <view
                  className="PickerBadge"
                  style={{
                    backgroundColor: isSelected ? colors.accent : colors.accentSoft,
                  }}
                >
                  <Text role="heading" tone={isSelected ? 'onAccent' : 'accent'}>
                    {isSelected ? '✓' : '+'}
                  </Text>
                </view>

                <view className="RowFill">
                  <Text role="title" tone="textPrimary">
                    {exercise.name}
                  </Text>
                  <Text role="support" tone="textSecondary">
                    {muscleGroupLabel(exercise.muscleGroup)} ·{' '}
                    {equipmentLabel(exercise.equipment)}
                  </Text>
                </view>
              </view>
            );
          })}
        </view>
      </scroll-view>

      <view
        className="FooterBar"
        style={{ borderColor: colors.line, backgroundColor: colors.bg }}
      >
        <Button
          title={saving ? 'Añadiendo…' : confirmLabel(selected.length)}
          fullWidth
          disabled={selected.length === 0 || saving}
          onPress={handleConfirm}
        />
      </view>
    </view>
  );
}
