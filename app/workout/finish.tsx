import { useEffect } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useActiveWorkout } from '@stores/activeWorkoutStore';
import { usePreferences } from '@stores/preferencesStore';
import { darkTheme, lightTheme, spacing, radius, fontSize } from '@lib/theme';
import { formatDuration } from '@lib/format';
import { Button } from '@components/Button';
import { Card } from '@components/Card';

/**
 * Pantalla final tras cerrar el workout.
 *
 * Muestra resumen de la sesión:
 * - Volumen total
 * - Series totales
 * - Duración
 * - PRs batidos (si los hay)
 * - Acciones: ver detalle, ir al inicio
 */
export default function WorkoutFinishScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const units = usePreferences((s) => s.units);
  const haptics = usePreferences((s) => s.hapticsEnabled);
  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;

  const session = useActiveWorkout((s) => s.session);

  useEffect(() => {
    if (haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [haptics]);

  if (!session) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.text, fontSize: fontSize.lg, marginBottom: spacing.lg }}>
          ¡Buen trabajo!
        </Text>
        <Button title="Volver al inicio" onPress={() => router.replace('/')} />
      </SafeAreaView>
    );
  }

  const elapsed = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, padding: spacing.xl, gap: spacing.xl, maxWidth: isWide ? 600 : undefined, alignSelf: 'center', width: '100%' }}>
        <View style={{ alignItems: 'center', gap: spacing.sm, marginTop: spacing.xxl }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="checkmark" size={48} color="#fff" />
          </View>
          <Text style={{ color: colors.text, fontSize: fontSize.xxl, fontWeight: '900' }}>
            ¡Workout completado!
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.base }}>{session.name}</Text>
        </View>

        <Card>
          <StatRow label="Duración" value={formatDuration(elapsed)} />
          <StatRow label="Volumen total" value={`${Math.round(session.totalVolume)} ${units}`} />
          <StatRow label="Series completadas" value={String(session.completedSets)} />
          <StatRow label="Ejercicios" value={String(session.exercises.length)} />
        </Card>

        <Card>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: fontSize.lg }}>
            Resumen por ejercicio
          </Text>
          {session.exercises.map((ex) => {
            const completedSets = ex.sets.filter((s) => s.isCompleted);
            const best = completedSets.reduce<typeof completedSets[number] | null>(
              (best, s) => (best && best.weight >= s.weight ? best : s),
              null
            );
            return (
              <View key={ex.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>{ex.name}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
                    {completedSets.length} series
                  </Text>
                </View>
                {best && (
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>
                    {best.weight} {units} × {best.reps}
                  </Text>
                )}
              </View>
            );
          })}
        </Card>

        <Button title="Volver al inicio" onPress={() => router.replace('/')} />
      </View>
    </SafeAreaView>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs }}>
      <Text style={{ color: colors.textMuted }}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}
