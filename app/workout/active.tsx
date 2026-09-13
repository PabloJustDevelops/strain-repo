import { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, Pressable, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useActiveWorkout } from '@stores/activeWorkoutStore';
import { usePreferences } from '@stores/preferencesStore';
import { darkTheme, lightTheme, spacing, radius, fontSize } from '@lib/theme';
import { formatDuration } from '@lib/format';
import { calculatePlates, type PlateResult } from '@lib/plateCalculator';
import { nextSupersetLetter } from '@lib/supersets';
import { SetRow } from '@components/SetRow';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { PlateCalculatorSheet } from '@components/PlateCalculatorSheet';
import { RestTimer } from '@components/RestTimer';
import { NumericKeypad } from '@components/NumericKeypad';
import { SetDetailsSheet } from '@components/SetDetailsSheet';
import type { SetView } from '@db/shapes';

/**
 * Pantalla del workout activo.
 *
 * Estructura:
 * - Cabecera fija: nombre + tiempo transcurrido + finalizar/descartar
 * - Lista de ejercicios del día (scroll vertical)
 * - Timer de descanso flotante (bottom)
 * - Modal para añadir ejercicios (FAB)
 * - Modal para introducir peso/reps de un set (bottom sheet)
 */
export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isWide = width >= 1024;

  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const units = usePreferences((s) => s.units);
  const haptics = usePreferences((s) => s.hapticsEnabled);
  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;

  const session = useActiveWorkout((s) => s.session);
  const completeSet = useActiveWorkout((s) => s.completeSet);
  const uncompleteSet = useActiveWorkout((s) => s.uncompleteSet);
  const updateSet = useActiveWorkout((s) => s.updateSet);
  const deleteSet = useActiveWorkout((s) => s.deleteSet);
  const addSet = useActiveWorkout((s) => s.addSet);
  const setSupersetGroup = useActiveWorkout((s) => s.setSupersetGroup);
  const finishWorkout = useActiveWorkout((s) => s.finishWorkout);
  const discardWorkout = useActiveWorkout((s) => s.discardWorkout);

  // Estados de UI
  const [platesFor, setPlatesFor] = useState<PlateResult | null>(null);
  const [editingSet, setEditingSet] = useState<{ id: string; weight: number; reps: number; previousWeight: number | null; previousReps: number | null; field: 'weight' | 'reps' } | null>(null);
  const [detailsSet, setDetailsSet] = useState<SetView | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Re-render cada segundo para el cronómetro
  const [, setTick] = useState(0);
  useEffect(() => {
    intervalRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (!session) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.text, fontSize: fontSize.lg }}>No hay workout activo</Text>
        <Button title="Volver" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const elapsed = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);

  // Cargar últimos sets del mismo ejercicio para mostrar referencia
  const handleComplete = async (setId: string) => {
    const setDef = session.exercises.flatMap((e) => e.sets).find((s) => s.id === setId);
    if (!setDef) return;
    if (setDef.weight === 0 || setDef.reps === 0) {
      // Buscar el set anterior (mismo ejercicio, índice menor)
      const exercise = session.exercises.find((e) => e.sets.some((s) => s.id === setId));
      const previous = exercise?.sets.filter((s) => s.setIndex < setDef.setIndex).pop();
      setEditingSet({
        id: setId,
        weight: 0,
        reps: 0,
        previousWeight: previous?.weight ?? null,
        previousReps: previous?.reps ?? null,
        field: 'weight',
      });
      return;
    }
    // El descanso lo arranca el store junto con el completado del set.
    await completeSet(setId);
  };

  const handleKeypadConfirm = async (value: number) => {
    if (!editingSet) return;
    if (editingSet.field === 'weight') {
      // Guardar peso y pasar a pedir reps
      await updateSet(editingSet.id, { weight: value });
      setEditingSet({ ...editingSet, weight: value, field: 'reps' });
    } else {
      // Guardar reps y completar
      await updateSet(editingSet.id, { reps: value });
      await completeSet(editingSet.id, editingSet.weight, value);
      setEditingSet(null);
    }
  };

  const handleKeypadCancel = async () => {
    // Si cancela en la segunda pantalla, deshace el peso
    if (editingSet && editingSet.field === 'reps' && editingSet.weight > 0) {
      await updateSet(editingSet.id, { weight: 0 });
    }
    setEditingSet(null);
  };

  const handleFinish = async () => {
    if (haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await finishWorkout();
    router.replace('/workout/finish');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Cabecera */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.md }}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={28} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '700' }} numberOfLines={1}>
            {session.name}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
            {session.completedSets} series · {formatDuration(elapsed)}
          </Text>
        </View>
        <Pressable onPress={handleFinish} style={{ backgroundColor: colors.success, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Finalizar</Text>
        </Pressable>
      </View>

      {/* Contenido */}
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 200, gap: spacing.lg }}>
        {session.exercises.map((ex, exIdx) => {
          const prevEx = exIdx > 0 ? session.exercises[exIdx - 1] : null;
          const showSupersetHeader =
            ex.supersetGroup &&
            (!prevEx || prevEx.supersetGroup !== ex.supersetGroup);
          const nextEx = exIdx < session.exercises.length - 1 ? session.exercises[exIdx + 1] : null;
          const isSupersetEnd = ex.supersetGroup && (!nextEx || nextEx.supersetGroup !== ex.supersetGroup);

          return (
            <View key={ex.id}>
              {showSupersetHeader && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                    backgroundColor: colors.primary + '22',
                    borderRadius: radius.md,
                    marginBottom: spacing.sm,
                  }}
                >
                  <Ionicons name="link" size={18} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontWeight: '700', fontSize: fontSize.sm }}>
                    Superset {ex.supersetGroup}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, marginLeft: 'auto' }}>
                    descansá al cerrar el grupo
                  </Text>
                </View>
              )}

              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '700' }}>
                      {ex.name}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
                      {ex.sets.filter((s) => s.isCompleted).length} / {ex.sets.length} series
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => addSet(ex.id)}
                    hitSlop={10}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Ionicons name="add-circle" size={22} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontWeight: '600' }}>Set</Text>
                  </Pressable>
                </View>

                <View style={{ marginTop: spacing.sm }}>
                  {ex.sets.map((s) => {
                    const previous = ex.sets.filter((p) => p.setIndex < s.setIndex && p.isCompleted).pop();
                    return (
                      <Pressable key={s.id} onLongPress={() => setDetailsSet(s)} delayLongPress={350}>
                        <SetRow
                          set={s}
                          previous={previous}
                          units={units}
                          onComplete={() => handleComplete(s.id)}
                          onUncomplete={() => uncompleteSet(s.id)}
                          onDelete={() => deleteSet(s.id)}
                          onShowPlates={(r) => setPlatesFor(r)}
                          onEditWeight={() => {
                            setEditingSet({
                              id: s.id,
                              weight: s.weight,
                              reps: s.reps,
                              previousWeight: previous?.weight ?? null,
                              previousReps: previous?.reps ?? null,
                              field: 'weight',
                            });
                          }}
                          onEditReps={() => {
                            setEditingSet({
                              id: s.id,
                              weight: s.weight,
                              reps: s.reps,
                              previousWeight: previous?.weight ?? null,
                              previousReps: previous?.reps ?? null,
                              field: 'reps',
                            });
                          }}
                        />
                        {(s.rpe != null || (s.notes && s.notes.length > 0)) && (
                          <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.sm, marginTop: -spacing.xs, marginBottom: spacing.sm }}>
                            {s.rpe != null && (
                              <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>
                                RPE {s.rpe}
                              </Text>
                            )}
                            {s.notes && s.notes.length > 0 && (
                              <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, flex: 1 }} numberOfLines={1}>
                                {s.notes}
                              </Text>
                            )}
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                {!isSupersetEnd && (
                  <Pressable
                    onPress={() => {
                      const newGroup = ex.supersetGroup ? null : nextSupersetLetter(session.exercises);
                      setSupersetGroup(ex.id, newGroup);
                    }}
                    style={{
                      marginTop: spacing.sm,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingVertical: spacing.xs,
                    }}
                  >
                    <Ionicons
                      name={ex.supersetGroup ? 'link' : 'add-circle-outline'}
                      size={16}
                      color={ex.supersetGroup ? colors.primary : colors.textMuted}
                    />
                    <Text style={{ color: ex.supersetGroup ? colors.primary : colors.textMuted, fontSize: fontSize.xs }}>
                      {ex.supersetGroup ? `En superset ${ex.supersetGroup} (toca para quitar)` : 'Hacer superset con el siguiente'}
                    </Text>
                  </Pressable>
                )}
              </Card>
            </View>
          );
        })}
      </ScrollView>

      {/* Timer de descanso */}
      <RestTimer />

      {/* Sheet: calculadora de discos */}
      <PlateCalculatorSheet result={platesFor} onClose={() => setPlatesFor(null)} />

      {/* Sheet: edición rápida de peso/reps con teclado numérico custom */}
      <NumericKeypad
        visible={!!editingSet}
        initialValue={editingSet ? (editingSet.field === 'weight' ? editingSet.weight : editingSet.reps) : 0}
        field={editingSet?.field ?? 'weight'}
        units={units}
        previousValue={
          editingSet
            ? editingSet.field === 'weight'
              ? editingSet.previousWeight ?? null
              : editingSet.previousReps ?? null
            : null
        }
        onConfirm={handleKeypadConfirm}
        onCancel={handleKeypadCancel}
      />

      {/* Sheet: detalles opcionales del set (RPE + notas).
          `key` por set: remonta el sheet en cada apertura, así el estado del
          formulario y el arrastre arrancan limpios sin efectos de reseteo. */}
      <SetDetailsSheet
        key={detailsSet?.id ?? 'none'}
        visible={!!detailsSet}
        set={detailsSet}
        units={units}
        onSave={(patch) => {
          if (detailsSet) updateSet(detailsSet.id, patch);
        }}
        onClose={() => setDetailsSet(null)}
      />
    </SafeAreaView>
  );
}
