import { useEffect, useState } from '@lynx-js/react';

import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { EmptyState } from '@components/EmptyState';
import { ExercisePickerModal } from '@components/ExercisePickerModal';
import { NumericKeypad } from '@components/NumericKeypad';
import { PlateCalculatorSheet } from '@components/PlateCalculatorSheet';
import { RestTimer } from '@components/RestTimer';
import { SetDetailsSheet } from '@components/SetDetailsSheet';
import { SetRow } from '@components/SetRow';
import { formatDuration } from '@lib/format';
import type { KeypadField } from '@lib/keypad';
import type { PlateResult } from '@lib/plateCalculator';
import { remountKey } from '@lib/reactKeys';
import { useRouter } from '@lib/router';
import { nextSupersetLetter } from '@lib/supersets';
import { useTheme } from '@lib/useTheme';
import type { SetView } from '@db/shapes';
import { useActiveWorkout } from '@stores/activeWorkoutStore';
import { usePreferences } from '@stores/preferencesStore';
import { Text } from '@components/Text';

/** El set que el keypad está editando, con el contexto que la UI necesita. */
interface EditingSet {
  id: string;
  weight: number;
  reps: number;
  previousWeight: number | null;
  previousReps: number | null;
  field: KeypadField;
}

/**
 * Pantalla del workout activo: el corazón de la app.
 *
 * - Cabecera fija con nombre, series completadas y cronómetro.
 * - Lista de ejercicios con sus sets (scroll), con cabecera por superset.
 * - Descanso automático: lo arranca el store al completar el set, acá sólo se
 *   pinta (`RestTimer`).
 * - Peso/reps se cargan con el keypad; el peso del set ya completado se toca
 *   para editarlo y el pendiente para ver los discos.
 * - Salir sin perder nada es el "‹ Atrás" del shell; finalizar cierra la sesión
 *   y va al resumen.
 *
 * Los botones flotantes (descanso, añadir ejercicio) y las hojas van fuera del
 * `<scroll-view>`: dentro, se desplazarían con el contenido.
 */
export function WorkoutActiveScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const units = usePreferences((s) => s.units);

  const session = useActiveWorkout((s) => s.session);
  const loadActive = useActiveWorkout((s) => s.loadActive);
  const completeSet = useActiveWorkout((s) => s.completeSet);
  const uncompleteSet = useActiveWorkout((s) => s.uncompleteSet);
  const updateSet = useActiveWorkout((s) => s.updateSet);
  const deleteSet = useActiveWorkout((s) => s.deleteSet);
  const addSet = useActiveWorkout((s) => s.addSet);
  const addExercise = useActiveWorkout((s) => s.addExercise);
  const setSupersetGroup = useActiveWorkout((s) => s.setSupersetGroup);
  const finishWorkout = useActiveWorkout((s) => s.finishWorkout);
  const discardWorkout = useActiveWorkout((s) => s.discardWorkout);

  const [platesFor, setPlatesFor] = useState<PlateResult | null>(null);
  const [editingSet, setEditingSet] = useState<EditingSet | null>(null);
  const [detailsSet, setDetailsSet] = useState<SetView | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!session) loadActive();
    // Sólo al montar: si no hay sesión activa, el store deja `session` en null y
    // volver a pedirla en cada cambio dispararía un bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startedAt = session?.startedAt;

  useEffect(() => {
    if (!startedAt) return;

    const update = () => setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000));
    update();
    const interval = setInterval(update, 1000);

    return () => clearInterval(interval);
  }, [startedAt]);

  if (!session) {
    return (
      <view className="Screen" style={{ backgroundColor: colors.bg }}>
        <EmptyState
          title="No hay workout activo"
          body="Empezá uno desde la pestaña Hoy o desde una rutina."
          action={<Button title="Volver" variant="secondary" onPress={router.back} />}
        />
      </view>
    );
  }

  /** Abre el keypad: si el set no tiene peso ni reps, pide peso; si no, completa. */
  function handleComplete(setId: string) {
    const target = session?.exercises.flatMap((ex) => ex.sets).find((s) => s.id === setId);

    if (!target) return;

    if (target.weight === 0 || target.reps === 0) {
      const exercise = session?.exercises.find((ex) => ex.sets.some((s) => s.id === setId));
      const previous = exercise?.sets.filter((s) => s.setIndex < target.setIndex).pop();

      setEditingSet({
        id: setId,
        weight: target.weight,
        reps: target.reps,
        previousWeight: previous?.weight ?? null,
        previousReps: previous?.reps ?? null,
        field: 'weight',
      });

      return;
    }

    // El descanso lo arranca el store junto con el completado del set.
    completeSet(setId);
  }

  function handleEdit(set: SetView) {
    const exercise = session?.exercises.find((ex) => ex.sets.some((s) => s.id === set.id));
    const previous = exercise?.sets.filter((s) => s.setIndex < set.setIndex).pop();

    setEditingSet({
      id: set.id,
      weight: set.weight,
      reps: set.reps,
      previousWeight: previous?.weight ?? null,
      previousReps: previous?.reps ?? null,
      field: 'weight',
    });
  }

  async function handleKeypadConfirm(value: number) {
    if (!editingSet) return;

    if (editingSet.field === 'weight') {
      // El peso se guarda y el teclado pasa a pedir las reps.
      await updateSet(editingSet.id, { weight: value });
      setEditingSet({ ...editingSet, weight: value, field: 'reps' });

      return;
    }

    await updateSet(editingSet.id, { reps: value });
    await completeSet(editingSet.id, editingSet.weight, value);
    setEditingSet(null);
  }

  async function handleKeypadCancel() {
    // Cancelar en el paso de reps deshace el peso que ya se había guardado.
    if (editingSet && editingSet.field === 'reps' && editingSet.weight > 0) {
      await updateSet(editingSet.id, { weight: 0 });
    }

    setEditingSet(null);
  }

  async function handleFinish() {
    await finishWorkout();
    router.replace('workout/finish');
  }

  return (
    <view className="Screen" style={{ backgroundColor: colors.bg }}>
      <view className="WorkoutHeader" style={{ borderColor: colors.line }}>
        <view className="WorkoutHeaderText">
          <Text role="title" tone="textPrimary">
            {session.name}
          </Text>
          <Text role="detail" tone="textSecondary">
            {session.completedSets} de {session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)}{' '}
            series · {formatDuration(elapsed)}
          </Text>
        </view>

        <view
          className="WorkoutFinish"
          style={{ backgroundColor: colors.success }}
          bindtap={handleFinish}
        >
          <Text role="support" tone="onAccent">Finalizar</Text>
        </view>
      </view>

      <scroll-view className="ScreenScroll" scroll-orientation="vertical">
        <view className="ScreenContent">
          {session.exercises.length === 0 ? (
            <EmptyState
              title="Este workout no tiene ejercicios"
              body="Añadí el primero con el botón + para empezar a registrar series."
            />
          ) : null}

          {session.exercises.map((exercise, exerciseIndex) => {
            const previousExercise = exerciseIndex > 0 ? session.exercises[exerciseIndex - 1] : null;
            const nextExercise =
              exerciseIndex < session.exercises.length - 1 ? session.exercises[exerciseIndex + 1] : null;

            const opensSuperset =
              exercise.supersetGroup !== null &&
              (!previousExercise || previousExercise.supersetGroup !== exercise.supersetGroup);
            const closesSuperset =
              exercise.supersetGroup !== null &&
              (!nextExercise || nextExercise.supersetGroup !== exercise.supersetGroup);

            return (
              <view key={remountKey('sessionExercise', exercise.id)}>
                {opensSuperset ? (
                  <view
                    className="SupersetBanner"
                    style={{ backgroundColor: colors.accentSoft }}
                  >
                    <Text role="support" tone="accent">
                      Superset {exercise.supersetGroup} · descansá al cerrar el grupo
                    </Text>
                  </view>
                ) : null}

                <Card>
                  <view className="ExerciseHeader">
                    <view className="RowFill">
                      <Text role="title" tone="textPrimary">
                        {exercise.name}
                      </Text>
                      <Text role="support" tone="textSecondary">
                        {exercise.sets.filter((s) => s.isCompleted).length} / {exercise.sets.length}{' '}
                        series
                      </Text>
                    </view>

                    <view className="AddSetLink" bindtap={() => addSet(exercise.id)}>
                      <Text role="support" tone="accent">
                        + Set
                      </Text>
                    </view>
                  </view>

                  <view>
                    {exercise.sets.map((set) => {
                      const previous = exercise.sets
                        .filter((candidate) => candidate.setIndex < set.setIndex && candidate.isCompleted)
                        .pop();

                      return (
                        <SetRow
                          key={remountKey('set', set.id)}
                          set={set}
                          previous={previous}
                          units={units}
                          onComplete={() => handleComplete(set.id)}
                          onUncomplete={() => uncompleteSet(set.id)}
                          onDelete={() => deleteSet(set.id)}
                          onShowPlates={setPlatesFor}
                          onEditWeight={() => handleEdit(set)}
                          onEditReps={() =>
                            setEditingSet({
                              id: set.id,
                              weight: set.weight,
                              reps: set.reps,
                              previousWeight: previous?.weight ?? null,
                              previousReps: previous?.reps ?? null,
                              field: 'reps',
                            })
                          }
                          onOpenDetails={() => setDetailsSet(set)}
                        />
                      );
                    })}
                  </view>

                  {!closesSuperset ? (
                    <view
                      className="SupersetToggle"
                      bindtap={() =>
                        setSupersetGroup(
                          exercise.id,
                          exercise.supersetGroup ? null : nextSupersetLetter(session.exercises)
                        )
                      }
                    >
                      <Text
                        role="detail"
                        tone={exercise.supersetGroup ? 'accent' : 'textSecondary'}
                       
                      >
                        {exercise.supersetGroup
                          ? `En superset ${exercise.supersetGroup} (tocá para quitar)`
                          : 'Hacer superset con el siguiente'}
                      </Text>
                    </view>
                  ) : null}
                </Card>
              </view>
            );
          })}

          <Button
            title="Descartar workout"
            variant="danger"
            onPress={() => {
              discardWorkout();
              router.back();
            }}
          />
        </view>
      </scroll-view>

      <RestTimer />

      <view
        className="Fab"
        style={{ backgroundColor: colors.accent }}
        bindtap={() => setPickerOpen(true)}
      >
        <Text role="display" tone="onAccent">+</Text>
      </view>

      <PlateCalculatorSheet result={platesFor} onClose={() => setPlatesFor(null)} />

      <NumericKeypad
        key={remountKey('keypad', editingSet ? `${editingSet.id}-${editingSet.field}` : null)}
        visible={editingSet !== null}
        initialValue={
          editingSet ? (editingSet.field === 'weight' ? editingSet.weight : editingSet.reps) : 0
        }
        field={editingSet?.field ?? 'weight'}
        units={units}
        previewWeight={editingSet?.weight ?? null}
        previousValue={
          editingSet
            ? editingSet.field === 'weight'
              ? editingSet.previousWeight
              : editingSet.previousReps
            : null
        }
        onConfirm={handleKeypadConfirm}
        onCancel={handleKeypadCancel}
      />

      {/* `key` por set: el formulario de RPE/notas arranca limpio en cada apertura. */}
      <SetDetailsSheet
        key={remountKey('details', detailsSet?.id)}
        visible={detailsSet !== null}
        set={detailsSet}
        units={units}
        onSave={(patch) => {
          if (detailsSet) updateSet(detailsSet.id, patch);
        }}
        onClose={() => setDetailsSet(null)}
      />

      <ExercisePickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(exerciseId) => {
          setPickerOpen(false);
          addExercise(exerciseId);
        }}
      />
    </view>
  );
}
