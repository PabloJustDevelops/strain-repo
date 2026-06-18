import { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TextInput, Pressable, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';

import { ExercisesRepo } from '@db/repositories';
import { usePreferences } from '@stores/preferencesStore';
import { darkTheme, lightTheme, spacing, radius, fontSize } from '@lib/theme';
import { MUSCLE_GROUP_LABELS, type Exercise, type MuscleGroup } from '@/types/domain';
import { Card } from '@components/Card';
import { MuscleChip } from '@components/MuscleChip';
import { Sidebar } from '@components/Sidebar';

const MUSCLE_FILTERS: (MuscleGroup | 'all')[] = [
  'all', 'chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'other',
];

/**
 * Biblioteca de ejercicios.
 * - Búsqueda por nombre
 * - Filtro por grupo muscular
 * - Lista plana con scroll
 */
export default function ExercisesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 1024;

  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;

  const [items, setItems] = useState<Exercise[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MuscleGroup | 'all'>('all');

  useEffect(() => {
    ExercisesRepo.list().then(setItems);
  }, []);

  const filtered = useMemo(() => {
    return items.filter((ex) => {
      const matchesFilter = filter === 'all' || ex.muscleGroup === filter;
      const matchesQuery = query.length === 0 ||
        ex.name.toLowerCase().includes(query.toLowerCase());
      return matchesFilter && matchesQuery;
    });
  }, [items, filter, query]);

  const content = (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <Text style={{ color: colors.text, fontSize: fontSize.xxl, fontWeight: '800' }}>
          Ejercicios
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border }}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar ejercicio"
            placeholderTextColor={colors.textMuted}
            style={{ flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, color: colors.text, fontSize: fontSize.base }}
          />
        </View>

        <FlatList
          data={MUSCLE_FILTERS}
          horizontal
          keyExtractor={(g) => g}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm }}
          renderItem={({ item }) => (
            <MuscleChip
              group={item === 'all' ? 'chest' : item}
              active={filter === item}
              onPress={() => setFilter(item)}
            />
          )}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(ex) => ex.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 80, gap: spacing.sm }}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/exercises/${item.id}`)}>
            <Card padded={false}>
              <View style={{ padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="barbell-outline" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{item.name}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
                    {MUSCLE_GROUP_LABELS[item.muscleGroup]} · {item.equipment}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
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
