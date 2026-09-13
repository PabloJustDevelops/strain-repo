import { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, Pressable, FlatList, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';

import { getRepos } from '@db';
import { usePreferences } from '@stores/preferencesStore';
import { darkTheme, lightTheme, spacing, radius, fontSize } from '@lib/theme';
import {
  MUSCLE_GROUP_LABELS,
  EQUIPMENT_LABELS,
  type Exercise,
  type MuscleGroup,
  type Equipment,
} from '@/types/domain';

interface ExercisePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onPick: (exerciseId: string) => void;
}

/**
 * Selector de ejercicio para el workout activo.
 *
 * Carga el catálogo al abrir (nunca en render) con búsqueda por nombre y
 * devuelve el id del elegido. Es el que le da salida a un workout vacío.
 */
export function ExercisePickerModal({ visible, onClose, onPick }: ExercisePickerModalProps) {
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;

  const [items, setItems] = useState<Exercise[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setQuery('');
    getRepos()
      .exercises.list()
      .then((list) => {
        if (!cancelled) setItems(list);
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const filtered = useMemo(
    () =>
      items.filter(
        (ex) => query.length === 0 || ex.name.toLowerCase().includes(query.toLowerCase())
      ),
    [items, query]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose} />
      <View
        style={{
          backgroundColor: colors.surfaceElevated,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          paddingTop: spacing.lg,
          paddingBottom: spacing.xxl,
          maxHeight: '78%',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.lg,
            marginBottom: spacing.md,
          }}
        >
          <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '700' }}>
            Añadir ejercicio
          </Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginHorizontal: spacing.lg,
            marginBottom: spacing.md,
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

        <FlatList
          data={filtered}
          keyExtractor={(ex) => ex.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.lg,
            gap: spacing.sm,
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', padding: spacing.xxl }}>
              <Text style={{ color: colors.textMuted }}>Sin resultados.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onPick(item.id)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                padding: spacing.md,
                borderRadius: radius.md,
                backgroundColor: pressed ? colors.surface : colors.background,
                borderWidth: 1,
                borderColor: colors.border,
              })}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radius.md,
                  backgroundColor: colors.primaryMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="add" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{item.name}</Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
                  {MUSCLE_GROUP_LABELS[item.muscleGroup as MuscleGroup]} ·{' '}
                  {EQUIPMENT_LABELS[item.equipment as Equipment]}
                </Text>
              </View>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}
