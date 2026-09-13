import { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, TextInput, ScrollView } from 'react-native';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { usePreferences } from '@stores/preferencesStore';
import { darkTheme, lightTheme, spacing, radius, fontSize } from '@lib/theme';
import { Button } from '@components/Button';
import type { SetView } from '@db/shapes';

interface SetDetailsSheetProps {
  visible: boolean;
  set: SetView | null;
  units: 'kg' | 'lb';
  onSave: (patch: { rpe?: number | null; notes?: string | null }) => void;
  onClose: () => void;
}

/**
 * Bottom sheet para editar los detalles opcionales de un set:
 * - RPE (1-10) mediante chips seleccionables.
 * - Notas libres (hasta 280 caracteres).
 *
 * No edita peso ni reps, eso sigue siendo el keypad principal.
 */
export function SetDetailsSheet({ visible, set, units, onSave, onClose }: SetDetailsSheetProps) {
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const haptics = usePreferences((s) => s.hapticsEnabled);
  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;

  const [rpe, setRpe] = useState<number | null>(null);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (set) {
      setRpe(set.rpe ?? null);
      setNotes(set.notes ?? '');
    }
  }, [set]);

  const rpeOptions = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

  const handleSave = () => {
    if (haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSave({ rpe, notes: notes.trim() || null });
    onClose();
  };

  if (!set) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            padding: spacing.lg,
            paddingBottom: spacing.xxl,
            maxHeight: '85%',
          }}
        >
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
              <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '700' }}>
                Detalles del set {set.setIndex}
              </Text>
              <Pressable onPress={onClose} hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.md, padding: spacing.md, backgroundColor: colors.background, borderRadius: radius.md, marginBottom: spacing.lg }}>
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>PESO</Text>
                <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '700' }}>
                  {set.weight} {units}
                </Text>
              </View>
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>REPS</Text>
                <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '700' }}>
                  {set.reps}
                </Text>
              </View>
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>ESTADO</Text>
                <Text style={{ color: set.isCompleted ? colors.success : colors.textMuted, fontSize: fontSize.lg, fontWeight: '700' }}>
                  {set.isCompleted ? '✓' : '—'}
                </Text>
              </View>
            </View>

            <Text style={{ color: colors.text, fontWeight: '600', marginBottom: spacing.sm }}>
              RPE (esfuerzo percibido)
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.lg }}>
              {rpeOptions.map((val) => {
                const selected = rpe === val;
                return (
                  <Pressable
                    key={val}
                    onPress={() => {
                      setRpe(selected ? null : val);
                      if (haptics) Haptics.selectionAsync();
                    }}
                    style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      borderRadius: radius.full,
                      backgroundColor: selected ? colors.primary : colors.background,
                      borderWidth: 1,
                      borderColor: selected ? colors.primary : colors.border,
                      minWidth: 48,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: selected ? '#fff' : colors.text, fontWeight: '600' }}>
                      {val}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={{ color: colors.text, fontWeight: '600', marginBottom: spacing.sm }}>
              Notas (opcional)
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              multiline
              maxLength={280}
              placeholder="Cómo te has sentido, técnica, sensaciones..."
              placeholderTextColor={colors.textMuted}
              style={{
                backgroundColor: colors.background,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                color: colors.text,
                padding: spacing.md,
                minHeight: 80,
                textAlignVertical: 'top',
                fontSize: fontSize.base,
              }}
            />
            <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, alignSelf: 'flex-end', marginTop: 2 }}>
              {notes.length}/280
            </Text>

            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
              <View style={{ flex: 1 }}>
                <Button title="Cancelar" variant="secondary" onPress={onClose} />
              </View>
              <View style={{ flex: 2 }}>
                <Button title="Guardar" onPress={handleSave} />
              </View>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}