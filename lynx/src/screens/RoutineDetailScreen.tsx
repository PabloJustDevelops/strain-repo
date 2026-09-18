import {
  Input,
  SortableItem,
  SortableItemArea,
  SortableRoot,
  TextArea,
  type SortableData,
} from '@lynx-js/lynx-ui';
import { useEffect, useMemo, useState } from '@lynx-js/react';

import { getRepos } from '@db';
import { Button } from '@components/Button';
import { EmptyState } from '@components/EmptyState';
import { ErrorNote, Loading } from '@components/Loading';
import { Sheet } from '@components/Sheet';
import { Text } from '@components/Text';
import { remountKey } from '@lib/reactKeys';
import { useRouter } from '@lib/router';
import {
  ROUTINE_NOTE_MAX,
  orderRowsByIds,
  prescriptionLabel,
  removeById,
  validateRoutineName,
} from '@lib/routineEditor';
import { useTheme } from '@lib/useTheme';
import { useActiveWorkout } from '@stores/activeWorkoutStore';
import type { RouteProps } from '@/app/routes';
import type { Exercise, Routine, RoutineExercise } from '@/types/domain';

/** Una fila de la rutina con su ejercicio ya resuelto (el join del repo). */
type RoutineExerciseRow = RoutineExercise & { exercise: Exercise };

/**
 * Detalle y edición de una rutina.
 *
 * - Lista de ejercicios ordenable: el asa arrastra (`Sortable` de lynx-ui) y el
 *   orden se persiste al soltar.
 * - Quitar pide confirmación en una hoja: es una acción destructiva y la app no
 *   tiene un patrón de "deshacer".
 * - Nombre y nota se editan en otra hoja; el nombre es el título de la pantalla.
 * - "Empezar entrenamiento" arma la sesión con los targets de la rutina, igual
 *   que la pestaña Rutinas.
 *
 * Al empujar el selector de ejercicios esta pantalla se desmonta (el shell sólo
 * pinta el tope de la pila), así que al volver se recarga sola y se ve lo nuevo:
 * no hace falta un efecto de foco.
 */
export function RoutineDetailScreen({ params }: RouteProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const startFromRoutine = useActiveWorkout((s) => s.startFromRoutine);
  const id = params.id ?? '';

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [rows, setRows] = useState<RoutineExerciseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editKey, setEditKey] = useState(0);
  const [removing, setRemoving] = useState<RoutineExerciseRow | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);

      return;
    }

    let cancelled = false;
    setLoading(true);

    getRepos().routines.getWithExercises(id).then(
      (data) => {
        if (cancelled) return;

        setRoutine(data?.routine ?? null);
        setRows(data?.exercises ?? []);
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

  const data: SortableData<RoutineExerciseRow>[] = useMemo(
    () => rows.map((row) => ({ getSortingKey: () => row.id, dataItem: row })),
    [rows],
  );

  function openEdit() {
    setEditKey((key) => key + 1);
    setEditing(true);
  }

  function goToAddExercise() {
    router.push('routines/[id]/add-exercise', { id });
  }

  async function handleSortEnd(sorted: SortableData<RoutineExerciseRow>[]) {
    const ids = sorted.map((item) => item.getSortingKey());
    setRows((current) => orderRowsByIds(current, ids));

    if (!routine) return;

    try {
      await getRepos().routines.reorderExercises(routine.id, ids);
    } catch (err) {
      setError(String(err));
    }
  }

  async function handleRemove() {
    const target = removing;

    if (!target) return;

    setRemoving(null);
    setRows((current) => removeById(current, target.id));

    try {
      await getRepos().routines.removeExercise(target.id);
    } catch (err) {
      setError(String(err));
    }
  }

  async function handleSave(patch: { name: string; description: string | null }) {
    if (!routine) return;

    try {
      await getRepos().routines.update(routine.id, {
        name: patch.name,
        description: patch.description,
      });
      setRoutine({ ...routine, name: patch.name, description: patch.description });
      setEditing(false);
    } catch (err) {
      setError(String(err));
    }
  }

  async function handleStart() {
    if (!routine) return;

    await startFromRoutine(routine.id);
    router.push('workout/active', { id: routine.id });
  }

  if (loading) {
    return (
      <view className="Screen" style={{ backgroundColor: colors.bg }}>
        <Loading />
      </view>
    );
  }

  if (error) {
    return (
      <view className="Screen" style={{ backgroundColor: colors.bg }}>
        <ErrorNote message={error} />
      </view>
    );
  }

  if (!routine) {
    return (
      <view className="Screen" style={{ backgroundColor: colors.bg }}>
        <EmptyState
          title="Rutina no encontrada"
          body={`No hay ninguna rutina con el id "${id}".`}
          action={<Button title="Volver" variant="secondary" onPress={router.back} />}
        />
      </view>
    );
  }

  return (
    <view className="Screen" style={{ backgroundColor: colors.bg }}>
      <view className="PanelHeader" style={{ borderColor: colors.line }}>
        <Text role="heading" tone="textPrimary">
          {routine.name}
        </Text>
        <Text role="support" tone="textSecondary">
          {rows.length === 0 ? 'Sin ejercicios todavía' : `${rows.length} ejercicios`}
        </Text>
        {routine.description ? (
          <Text role="support" tone="textSecondary">
            {routine.description}
          </Text>
        ) : null}

        <view className="RowActions">
          <Button title="Editar nombre y nota" variant="secondary" onPress={openEdit} />
        </view>
      </view>

      {rows.length === 0 ? (
        <scroll-view className="ScreenScroll" scroll-orientation="vertical">
          <view className="ScreenContent">
            <EmptyState
              title="Esta rutina no tiene ejercicios"
              body="Añadí el primero para poder armar la sesión desde acá."
            />
          </view>
        </scroll-view>
      ) : (
        <SortableRoot
          as="ScrollView"
          scrollableClassName="ScreenScroll"
          scrollableContentClassName="ScreenContent"
          data={data}
          onSortEnd={handleSortEnd}
        >
          {(item) => (
            <SortableItem
              key={remountKey('routineExercise', item.getSortingKey())}
              sortingKey={item.getSortingKey()}
              as="DraggableRoot"
              className="SortableItem"
            >
              <view className="RoutineRow" style={{ borderColor: colors.line }}>
                <SortableItemArea className="DragHandle">
                  <Text role="title" tone="textSecondary">
                    ≡
                  </Text>
                </SortableItemArea>

                <view className="RoutineRowBody">
                  <Text role="title" tone="textPrimary">
                    {item.dataItem.exercise.name}
                  </Text>
                  <Text role="detail" tone="textSecondary">
                    {prescriptionLabel(
                      item.dataItem.targetSets,
                      item.dataItem.targetReps,
                      item.dataItem.restSeconds,
                    )}
                  </Text>
                </view>

                <view
                  className="RoutineRowAction"
                  bindtap={() => setRemoving(item.dataItem)}
                >
                  <Text role="support" tone="danger">
                    Quitar
                  </Text>
                </view>
              </view>
            </SortableItem>
          )}
        </SortableRoot>
      )}

      <view
        className="FooterBar"
        style={{ borderColor: colors.line, backgroundColor: colors.bg }}
      >
        <view className="RowActions">
          <Button title="Añadir ejercicio" variant="secondary" onPress={goToAddExercise} />
        </view>
        {rows.length > 0 ? (
          <Button title="Empezar entrenamiento" fullWidth onPress={handleStart} />
        ) : null}
      </view>

      <Sheet
        visible={removing !== null}
        title="Quitar ejercicio"
        onClose={() => setRemoving(null)}
        footer={
          <view className="RowActions">
            <Button title="Cancelar" variant="secondary" onPress={() => setRemoving(null)} />
            <Button title="Quitar" variant="danger" onPress={handleRemove} />
          </view>
        }
      >
        <Text role="support" tone="textSecondary">
          {removing
            ? `Se va a quitar ${removing.exercise.name} de la rutina. No se puede deshacer.`
            : ''}
        </Text>
      </Sheet>

      <RoutineEditSheet
        key={remountKey('routineEdit', editKey)}
        visible={editing}
        routine={routine}
        onClose={() => setEditing(false)}
        onSave={handleSave}
      />
    </view>
  );
}

interface RoutineEditSheetProps {
  visible: boolean;
  routine: Routine;
  onClose: () => void;
  onSave: (patch: { name: string; description: string | null }) => void;
}

/**
 * Edición del nombre y la nota.
 *
 * El padre lo monta con una `key` que cambia al abrir, así el formulario arranca
 * con los valores actuales sin un efecto de sincronización (el mismo patrón que
 * la hoja de detalles de un set).
 */
function RoutineEditSheet({ visible, routine, onClose, onSave }: RoutineEditSheetProps) {
  const { colors } = useTheme();

  const [name, setName] = useState(routine.name);
  const [description, setDescription] = useState(routine.description ?? '');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const message = validateRoutineName(name);

    if (message) {
      setError(message);

      return;
    }

    onSave({ name: name.trim(), description: description.trim() || null });
  }

  return (
    <Sheet
      visible={visible}
      title="Editar rutina"
      onClose={onClose}
      footer={
        <view className="RowActions">
          <Button title="Cancelar" variant="secondary" onPress={onClose} />
          <Button title="Guardar" onPress={submit} />
        </view>
      }
    >
      <view className="Field">
        <Text role="detail" tone="textPrimary">
          Nombre
        </Text>
        <Input
          className="Input FieldControl"
          style={{
            backgroundColor: colors.bg,
            borderColor: colors.line,
            color: colors.textPrimary,
          }}
          placeholder="Ej. Empuje A"
          value={name}
          onInput={(value) => {
            setName(value);
            if (error) setError(null);
          }}
        />
      </view>

      <view className="Field">
        <Text role="detail" tone="textPrimary">
          Nota (opcional)
        </Text>
        <TextArea
          className="Notes FieldControl"
          style={{
            backgroundColor: colors.bg,
            borderColor: colors.line,
            color: colors.textPrimary,
          }}
          placeholder="Notas de la rutina"
          maxLength={ROUTINE_NOTE_MAX}
          value={description}
          onInput={(value) => setDescription(value)}
        />
      </view>

      {error ? <ErrorNote message={error} /> : null}
    </Sheet>
  );
}
