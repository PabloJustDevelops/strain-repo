import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, useWindowDimensions , useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { getRepos } from '@db';
import { useActiveWorkout } from '@stores/activeWorkoutStore';
import { usePreferences } from '@stores/preferencesStore';
import { darkTheme, lightTheme, spacing, fontSize } from '@lib/theme';
import { formatDateTime } from '@lib/format';
import type { Routine } from '@/types/domain';
import { Card } from '@components/Card';
import { Button } from '@components/Button';
import { Sidebar } from '@components/Sidebar';

/**
 * Lista de rutinas (plantillas reutilizables).
 * - Toca para abrir detalle
 * - Long-press para ver opciones (clonar, archivar, eliminar)
 * - Botón "Nueva rutina"
 */
export default function RoutinesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 1024;

  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);

  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';

  const colors = isDark ? darkTheme : lightTheme;

  const [items, setItems] = useState<Routine[]>([]);
  const startFromRoutine = useActiveWorkout((s) => s.startFromRoutine);

  // Recarga al recuperar el foco: navegar atrás no remonta la pantalla.
  useFocusEffect(
    useCallback(() => {
      getRepos().routines.list().then(setItems);
    }, [])
  );

  const handleStart = async (routine: Routine) => {
    await startFromRoutine(routine.id);
    router.push('/workout/active');
  };

  const content = (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg }}>
        <Text style={{ color: colors.text, fontSize: fontSize.xxl, fontWeight: '800' }}>Rutinas</Text>
        <Button title="Nueva" onPress={() => router.push({ pathname: '/routines/new' })} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 80, gap: spacing.sm }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: spacing.xxl, gap: spacing.md }}>
            <Ionicons name="list-outline" size={56} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
              No tienes rutinas todavía.{'\n'}Crea la primera para empezar.
            </Text>
            <Button title="Crear rutina" onPress={() => router.push({ pathname: '/routines/new' })} />
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push({ pathname: '/routines/[id]', params: { id: item.id } })} onLongPress={() => {/* menú opciones */}}>
            <Card padded={false}>
              <View style={{ padding: spacing.lg, gap: spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <View style={{ width: 8, height: 36, backgroundColor: item.color ?? colors.primary, borderRadius: 4 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: fontSize.lg }}>{item.name}</Text>
                    {item.description && (
                      <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }} numberOfLines={1}>
                        {item.description}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs }}>
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>
                    Actualizada {formatDateTime(new Date(item.updatedAt))}
                  </Text>
                  <Pressable
                    onPress={() => handleStart(item)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    hitSlop={10}
                  >
                    <Ionicons name="play" size={16} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>Empezar</Text>
                  </Pressable>
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
