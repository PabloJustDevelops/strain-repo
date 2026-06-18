import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExercisesRepo } from '@db/repositories';
import { usePreferences } from '@stores/preferencesStore';
import { darkTheme, lightTheme, spacing, radius, fontSize } from '@lib/theme';
import { MUSCLE_GROUP_LABELS, EQUIPMENT_LABELS, type Exercise } from '@types/domain';
import { Card } from '@components/Card';
import { Button } from '@components/Button';

/**
 * Detalle de un ejercicio:
 * - Datos básicos (músculos, equipo, mecánica)
 * - Instrucciones
 * - Botón para iniciar un workout solo con este ejercicio
 */
export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;

  const [exercise, setExercise] = useState<Exercise | null>(null);

  useEffect(() => {
    if (id) ExercisesRepo.byId(id).then(setExercise);
  }, [id]);

  if (!exercise) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textMuted }}>Cargando…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <Stack.Screen options={{ title: exercise.name }} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <View style={{ gap: spacing.xs }}>
          <Text style={{ color: colors.text, fontSize: fontSize.xxl, fontWeight: '800' }}>
            {exercise.name}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
            <Tag text={MUSCLE_GROUP_LABELS[exercise.muscleGroup]} />
            <Tag text={EQUIPMENT_LABELS[exercise.equipment]} />
            <Tag text={exercise.mechanic === 'compound' ? 'Compuesto' : 'Aislamiento'} />
          </View>
        </View>

        {exercise.instructions && (
          <Card>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: fontSize.lg }}>Instrucciones</Text>
            <Text style={{ color: colors.text, marginTop: spacing.xs, lineHeight: 22 }}>
              {exercise.instructions}
            </Text>
          </Card>
        )}

        <Button
          title="Empezar workout con este ejercicio"
          onPress={() => router.push(`/workout/active`)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Tag({ text }: { text: string }) {
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;
  return (
    <View style={{ backgroundColor: colors.primaryMuted, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full }}>
      <Text style={{ color: colors.primary, fontSize: fontSize.xs, fontWeight: '700' }}>
        {text}
      </Text>
    </View>
  );
}
