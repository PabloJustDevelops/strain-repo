import { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Alert, useWindowDimensions, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';

import { getRepos } from '@db';
import { toExerciseSummaries, type SessionExerciseSummary } from '@db/shapes';
import { usePreferences } from '@stores/preferencesStore';
import { darkTheme, lightTheme, spacing, radius, fontSize } from '@lib/theme';
import { Card } from '@components/Card';
import { Button } from '@components/Button';
import { WorkoutSummaryCard } from '@components/WorkoutSummaryCard';
import { shareWorkout } from '@lib/shareWorkout';
import type { WorkoutSession } from '@/types/domain';
import { formatDateTime, formatDuration } from '@lib/format';

/**
 * Detalle de un workout finalizado:
 * - Resumen de los ejercicios realizados
 * - Card preparada para capturar y compartir
 * - Botón de "Compartir workout" (imagen + texto vía el diálogo nativo)
 */
export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cardRef = useRef<View | null>(null);

  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const isDark = themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;

  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - spacing.lg * 2, 380);
  const cardHeight = Math.round(cardWidth * 1.5);

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exercises, setExercises] = useState<SessionExerciseSummary[]>([]);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const full = await getRepos().sessions.getFullSession(id);

      if (full) {
        setSession(full.session);
        setExercises(toExerciseSummaries(full));
      }
    })();
  }, [id]);

  const handleShare = async () => {
    if (!session) return;
    setSharing(true);

    try {
      // pequeña espera para asegurar que la card está renderizada
      await new Promise((r) => setTimeout(r, 120));
      const ok = await shareWorkout({ viewRef: cardRef, session, previewOnly: false });

      if (!ok) {
        Alert.alert('No se pudo compartir', 'Inténtalo de nuevo.');
      }
    } finally {
      setSharing(false);
    }
  };

  if (!session) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ title: 'Workout' }} />
        <Text style={{ color: colors.textMuted }}>Cargando…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <Stack.Screen options={{ title: session.name, headerRight: () => null }} />

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 80 }}>
        {/* Card visual, off-screen layout real: la pintamos primero para que ViewShot
            tenga el layout listo, luego la subimos. */}
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, textTransform: 'uppercase' }}>
            Resumen compartible
          </Text>
        </View>

        {/* Vista previa visible */}
        <View style={{ alignItems: 'center' }}>
          <View
            style={{
              width: cardWidth,
              height: cardHeight,
              borderRadius: radius.lg,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <WorkoutSummaryCard
              ref={cardRef}
              session={{ ...session, exercises }}
              width={cardWidth}
              height={cardHeight}
            />
          </View>
        </View>

        <Button title={sharing ? 'Compartiendo…' : 'Compartir workout'} onPress={handleShare} disabled={sharing} />

        {/* Detalle completo */}
        <Card>
          <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '700' }}>Resumen</Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
            {formatDateTime(new Date(session.startedAt))}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md }}>
            <Stat label="Series" value={String(session.totalSets)} colors={colors} />
            <Stat label="Volumen" value={`${Math.round(session.totalVolume).toLocaleString('es-ES')} kg`} colors={colors} />
            <Stat label="Duración" value={formatDuration(session.durationSeconds ?? 0)} colors={colors} />
          </View>
        </Card>

        {exercises.map((ex) => {
          const completed = ex.sets.filter((s) => s.isCompleted);

          if (completed.length === 0) return null;

          return (
            <Card key={ex.id}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{ex.name}</Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>
                {completed.length} series
              </Text>
              <View style={{ marginTop: spacing.sm, gap: 2 }}>
                {completed.map((s, i) => (
                  <Text key={i} style={{ color: colors.text, fontSize: fontSize.sm }}>
                    {i + 1}. {s.weight} kg × {s.reps} reps
                  </Text>
                ))}
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View>
      <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, textTransform: 'uppercase', fontWeight: '700' }}>
        {label}
      </Text>
      <Text style={{ color: colors.text, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}