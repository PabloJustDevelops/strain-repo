import { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';

import { getRepos } from '@db';
import { usePreferences } from '@stores/preferencesStore';
import { darkTheme, lightTheme, spacing, radius, fontSize } from '@lib/theme';
import { formatDuration, formatDateTime } from '@lib/format';
import type { WorkoutSession } from '@/types/domain';
import { Card } from '@components/Card';
import { Sidebar } from '@components/Sidebar';

/**
 * Historial completo de workouts completados.
 */
export default function HistoryScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 1024;

  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const units = usePreferences((s) => s.units);
  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;

  const [sessions, setSessions] = useState<WorkoutSession[]>([]);

  useEffect(() => {
    getRepos().sessions.list(100).then(setSessions);
  }, []);

  const content = (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: spacing.lg }}>
        <Text style={{ color: colors.text, fontSize: fontSize.xxl, fontWeight: '800' }}>
          Historial
        </Text>
      </View>

      <FlatList
        data={sessions}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 80, gap: spacing.sm }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: spacing.xxl }}>
            <Ionicons name="calendar-outline" size={56} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: spacing.md }}>
              Aún no has completado ningún workout.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push({ pathname: '/history/[id]', params: { id: item.id } })}>
            <Card padded={false}>
              <View style={{ padding: spacing.lg, gap: spacing.xs }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: fontSize.lg }}>{item.name}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
                    {formatDateTime(new Date(item.startedAt))}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.lg }}>
                  <Stat label="Volumen" value={`${Math.round(item.totalVolume)} ${units}`} />
                  <Stat label="Series" value={String(item.totalSets)} />
                  <Stat label="Duración" value={formatDuration(item.durationSeconds ?? 0)} />
                </View>
              </View>
            </Card>
          </Pressable>
        )}
      />
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

function Stat({ label, value }: { label: string; value: string }) {
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;
  return (
    <View>
      <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, textTransform: 'uppercase', fontWeight: '700' }}>
        {label}
      </Text>
      <Text style={{ color: colors.text, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}
