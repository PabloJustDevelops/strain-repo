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
import { SessionsRepo } from '@db/repositories';
import { darkTheme, lightTheme, spacing, radius, fontSize } from '@lib/theme';
import { formatDuration } from '@lib/format';
import { calculatePlates, type PlateResult } from '@lib/plateCalculator';
import { SetRow } from '@components/SetRow';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { PlateCalculatorSheet } from '@components/PlateCalculatorSheet';
import { RestTimer } from '@components/RestTimer';
import { NumericKeypad } from '@components/NumericKeypad';
import type { SetView } from '@types/domain';

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
  const startRest = useActiveWorkout((s) => s.startRest);
  const finishWorkout = useActiveWorkout((s) => s.finishWorkout);
  const discardWorkout = useActiveWorkout((s) => s.discardWorkout);

  // Estados de UI
  const [platesFor, setPlatesFor] = useState<PlateResult | null>(null);
  const [editingSet, setEditingSet] = useState<{ id: string; weight: number; reps: number; previousWeight: number | null; previousReps: number | null; field: 'weight' | 'reps' } | null>(null);
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
    await completeSet(setId);
    const exercise = session.exercises.find((e) => e.sets.some((s) => s.id === setId));
    if (exercise) startRest(exercise.restSeconds);
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
      const exercise = session.exercises.find((e) => e.sets.some((s) => s.id === editingSet.id));
      if (exercise) startRest(exercise.restSeconds);
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
        {session.exercises.map((ex) => (
          <Card key={ex.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '700' }}>
                  {ex.name}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
                  {ex.sets.filter((s) => s.isCompleted).length} / {ex.sets.length} series
                </Text>
              </View>
              <Pressable onPress={() => addSet(ex.id)} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="add-circle" size={22} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: '600' }}>Set</Text>
              </Pressable>
            </View>

            <View style={{ marginTop: spacing.sm }}>
              {ex.sets.map((s) => {
                const previous = ex.sets.filter((p) => p.setIndex < s.setIndex && p.isCompleted).pop();
                return (
                  <SetRow
                    key={s.id}
                    set={s}
                    previous={previous}
                    units={units}
                    onComplete={() => handleComplete(s.id)}
                    onUncomplete={() => uncompleteSet(s.id)}
                    onUpdate={(patch) => updateSet(s.id, patch)}
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
                );
              })}
            </View>
          </Card>
        ))}
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
    </SafeAreaView>
  );
}
