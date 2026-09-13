import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import * as Haptics from 'expo-haptics';

import { getRepos } from '@db';
import { usePreferences } from '@stores/preferencesStore';
import { darkTheme, lightTheme, spacing, radius, fontSize } from '@lib/theme';
import { MUSCLE_GROUP_LABELS, type Exercise, type Routine, type RoutineExercise } from '@/types/domain';
import { Card } from '@components/Card';
import { Button } from '@components/Button';
import { Sidebar } from '@components/Sidebar';

interface RoutineExerciseRow extends RoutineExercise {
  exercise: Exercise;
}

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 1024;

  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const haptics = usePreferences((s) => s.hapticsEnabled);
  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [exercises, setExercises] = useState<RoutineExerciseRow[]>([]);

  const refresh = async () => {
    if (!id) return;
    const data = await getRepos().routines.getWithExercises(id);
    if (!data) return;
    setRoutine(data.routine);
    setExercises(data.exercises);
  };

  useEffect(() => {
    refresh();
  }, [id]);

  const handleDragEnd = async ({ data }: { data: RoutineExerciseRow[] }) => {
    setExercises(data);
    if (!id) return;
    await getRepos().routines.reorderExercises(
      id,
      data.map((d) => d.id)
    );
  };

  const handleRemove = async (reId: string) => {
    await getRepos().routines.removeExercise(reId);
    await refresh();
  };

  /**
   * Asigna una letra de superset reutilizando huecos libres: A, B, C...
   * Si el ejercicio ya está en un grupo, devuelve la siguiente letra libre
   * para permitir reasignarlo rápidamente.
   */
  const promptSupersetLetter = (current: string | null): string | null => {
    const used = new Set(exercises.map((e) => e.supersetGroup).filter(Boolean) as string[]);
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    for (const l of letters) {
      if (!used.has(l)) return l;
    }
    return current ?? 'A';
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<RoutineExerciseRow>) => (
    <ScaleDecorator>
      <Pressable onLongPress={drag} disabled={isActive} delayLongPress={150}>
        <Card padded={false}>
          <View style={{ padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            {item.supersetGroup ? (
              <View style={{ width: 26, alignItems: 'center' }}>
                <Text style={{ color: colors.primary, fontWeight: '800' }}>{item.supersetGroup}</Text>
              </View>
            ) : (
              <Ionicons name="menu" size={22} color={colors.textMuted} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{item.exercise.name}</Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
                {item.targetSets} × {item.targetReps} · {item.restSeconds}s descanso
              </Text>
            </View>
            <Pressable
              onPress={async () => {
                if (!id) return;
                const next = item.supersetGroup ? null : promptSupersetLetter(item.supersetGroup);
                await getRepos().routines.setSupersetGroup(id, [item.id], next);
                if (haptics) Haptics.selectionAsync();
                await refresh();
              }}
              hitSlop={10}
              style={{ paddingHorizontal: 4 }}
            >
              <Ionicons
                name={item.supersetGroup ? 'link' : 'link-outline'}
                size={20}
                color={item.supersetGroup ? colors.primary : colors.textMuted}
              />
            </Pressable>
            <Pressable onPress={() => handleRemove(item.id)} hitSlop={10}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </Pressable>
          </View>
        </Card>
      </Pressable>
    </ScaleDecorator>
  );

  const content = (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          title: routine?.name ?? 'Rutina',
          headerRight: () => (
            <Pressable onPress={() => {/* menú opciones */}} hitSlop={10}>
              <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
            </Pressable>
          ),
        }}
      />

      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        {routine?.description && (
          <Text style={{ color: colors.textMuted }}>{routine.description}</Text>
        )}
        <Button title="Añadir ejercicio" onPress={() => router.push(`/routines/${id}/add-exercise`)} />
      </View>

      {exercises.length === 0 ? (
        <View style={{ alignItems: 'center', padding: spacing.xxl, gap: spacing.md }}>
          <Ionicons name="barbell-outline" size={56} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
            Esta rutina no tiene ejercicios todavía.
          </Text>
        </View>
      ) : (
        <DraggableFlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onDragEnd={({ data }) => {
            if (haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            handleDragEnd({ data });
          }}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80, gap: spacing.sm }}
        />
      )}
    </View>
  );

  if (isWide) {
    return (
      <SafeAreaView style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.background }}>
        <Sidebar />
        {content}
      </SafeAreaView>
    );
  }
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>{content}</SafeAreaView>;
}
