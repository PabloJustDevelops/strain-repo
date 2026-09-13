import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useActiveWorkout } from '@stores/activeWorkoutStore';
import { useColorScheme } from 'react-native';
import { usePreferences } from '@stores/preferencesStore';
import { getRepos } from '@db';
import { darkTheme, lightTheme, spacing, radius, fontSize } from '@lib/theme';
import { formatDuration, formatDateLong } from '@lib/format';
import { Sidebar } from '@components/Sidebar';
import { Button } from '@components/Button';
import { Card } from '@components/Card';

/**
 * Pantalla "Hoy": punto de entrada principal.
 *
 * - Si hay un workout activo: muestra CTA grande para volver.
 * - Si no: muestra acciones rápidas (nuevo workout, rutinas recientes, streak).
 * - En web/desktop se renderiza con sidebar a la izquierda.
 */
export default function TodayScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 1024;

  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const haptics = usePreferences((s) => s.hapticsEnabled);
  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;

  const session = useActiveWorkout((s) => s.session);
  const startEmpty = useActiveWorkout((s) => s.startEmpty);

  const [streak, setStreak] = useState(0);

  useEffect(() => {
    getRepos().analytics.currentStreak().then(setStreak).catch(() => setStreak(0));
  }, []);

  const handleStartEmpty = async () => {
    if (haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await startEmpty(`Workout ${formatDateLong(new Date())}`);
    router.push('/workout/active');
  };

  const content = (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
    >
      <Text style={{ color: colors.text, fontSize: fontSize.xxl, fontWeight: '800' }}>
        Hoy
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: fontSize.base }}>
        {formatDateLong(new Date())}
      </Text>

      {/* Workout activo */}
      {session ? (
        <Pressable
          onPress={() => router.push('/workout/active')}
          style={{
            backgroundColor: colors.primary,
            padding: spacing.xl,
            borderRadius: radius.lg,
            gap: spacing.sm,
          }}
        >
          <Text style={{ color: '#fff', fontSize: fontSize.sm, opacity: 0.85 }}>
            Workout en curso
          </Text>
          <Text style={{ color: '#fff', fontSize: fontSize.xl, fontWeight: '700' }}>
            {session.name}
          </Text>
          <Text style={{ color: '#fff', fontSize: fontSize.base }}>
            {session.completedSets} series · {formatDuration(session.elapsedSeconds)}
          </Text>
        </Pressable>
      ) : (
        <Card>
          <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '700' }}>
            Empieza un workout
          </Text>
          <Text style={{ color: colors.textMuted, marginTop: spacing.xs }}>
            Comienza uno vacío o elige una de tus rutinas.
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
            <Button title="Vacío" onPress={handleStartEmpty} />
            <Button
              title="Elegir rutina"
              variant="secondary"
              onPress={() => router.push('/routines')}
            />
          </View>
        </Card>
      )}

      {/* Streak */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Ionicons name="flame-outline" size={36} color={colors.warning} />
          <View>
            <Text style={{ color: colors.text, fontSize: fontSize.xxl, fontWeight: '800' }}>
              {streak}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
              {streak === 1 ? 'día seguido entrenando' : 'días seguidos entrenando'}
            </Text>
          </View>
        </View>
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '700' }}>
          Acciones rápidas
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md }}>
          <Button title="Biblioteca" onPress={() => router.push('/exercises')} />
          <Button title="Historial" variant="secondary" onPress={() => router.push('/history')} />
          <Button title="Progreso" variant="secondary" onPress={() => router.push('/progress')} />
        </View>
      </Card>
    </ScrollView>
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
