import { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';

import { getRepos } from '@db';
import { usePreferences } from '@stores/preferencesStore';
import { darkTheme, lightTheme, spacing, radius, fontSize } from '@lib/theme';
import { MUSCLE_GROUP_LABELS, EQUIPMENT_LABELS, type Exercise, type MuscleGroup, type Equipment } from '@/types/domain';
import { Card } from '@components/Card';

/**
 * Selector de ejercicio para una rutina.
 *
 * Lista el catálogo menos los que la rutina ya tiene, y agrega al tocar
 * (`routines.addExercise`) volviendo al detalle.
 */
export default function AddExerciseToRoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;

  const [items, setItems] = useState<Exercise[]>([]);
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [catalog, routine] = await Promise.all([
        getRepos().exercises.list(),
        id ? getRepos().routines.getWithExercises(id) : Promise.resolve(null),
      ]);
      if (cancelled) return;
      const already = new Set((routine?.exercises ?? []).map((re) => re.exerciseId));
      setItems(catalog.filter((ex) => !already.has(ex.id)));
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const filtered = useMemo(
    () =>
      items.filter(
        (ex) => query.length === 0 || ex.name.toLowerCase().includes(query.toLowerCase())
      ),
    [items, query]
  );

  const handlePick = async (exercise: Exercise) => {
    if (!id || pending) return;
    setPending(exercise.id);
    try {
      await getRepos().routines.addExercise(id, exercise.id);
      router.back();
    } finally {
      setPending(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Añadir ejercicio' }} />

      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar ejercicio"
            placeholderTextColor={colors.textMuted}
            style={{
              flex: 1,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.sm,
              color: colors.text,
              fontSize: fontSize.base,
            }}
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(ex) => ex.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 80, gap: spacing.sm }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: spacing.xxl, gap: spacing.md }}>
            <Ionicons name="barbell-outline" size={56} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
              No hay ejercicios para agregar.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => handlePick(item)} disabled={pending !== null}>
            <Card padded={false}>
              <View style={{ padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: radius.md,
                    backgroundColor: colors.primaryMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={pending === item.id ? 'hourglass-outline' : 'add'} size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{item.name}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
                    {MUSCLE_GROUP_LABELS[item.muscleGroup as MuscleGroup]} · {EQUIPMENT_LABELS[item.equipment as Equipment]}
                  </Text>
                </View>
              </View>
            </Card>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
