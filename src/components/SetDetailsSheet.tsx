import { useState, useRef } from 'react';
import { View, Text, Modal, Pressable, TextInput, ScrollView, Keyboard, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';

import { usePreferences } from '@stores/preferencesStore';
import { darkTheme, lightTheme, spacing, radius, fontSize } from '@lib/theme';
import { clampSheetDrag, shouldDismissSheet } from '@lib/bottomSheet';
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
 *
 * Se puede bajar arrastrando el asidero/cabecera; la política del gesto vive en
 * `@lib/bottomSheet` y el ScrollView de las notas queda libre para hacer scroll.
 */
export function SetDetailsSheet({ visible, set, units, onSave, onClose }: SetDetailsSheetProps) {
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const haptics = usePreferences((s) => s.hapticsEnabled);
  const insets = useSafeAreaInsets();

  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';

  const colors = isDark ? darkTheme : lightTheme;

  // El sheet se monta por set (ver `key` en la pantalla de workout), así que el
  // estado del formulario arranca del set y no necesita sincronizarse con un effect.
  const [rpe, setRpe] = useState<number | null>(set?.rpe ?? null);
  const [notes, setNotes] = useState<string>(set?.notes ?? '');
  const scrollRef = useRef<ScrollView>(null);

  const translateY = useSharedValue(0);
  const sheetHeight = useSharedValue(0);

  const rpeOptions = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  const handleSave = () => {
    if (haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSave({ rpe, notes: notes.trim() || null });
    Keyboard.dismiss();
    onClose();
  };

  const dragGesture = Gesture.Pan()
    .activeOffsetY(10)
    .onUpdate((e) => {
      translateY.value = clampSheetDrag(e.translationY);
    })
    .onEnd((e) => {
      const dismiss = shouldDismissSheet({
        translationY: translateY.value,
        velocityY: e.velocityY,
        height: sheetHeight.value,
      });

      if (dismiss) {
        translateY.value = withTiming(sheetHeight.value || 400, { duration: 180 }, (finished) => {
          if (finished) runOnJS(handleClose)();
        });
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 220 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!set) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      {/* El Modal de RN en Android es un árbol de vistas aparte: sin esta raíz los gestos no llegan. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Pressable style={{ flex: 1 }} onPress={handleClose} />

          <Animated.View
            onLayout={(e) => {
              sheetHeight.value = e.nativeEvent.layout.height;
            }}
            style={[
              sheetStyle,
              {
                backgroundColor: colors.surface,
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
                paddingHorizontal: spacing.lg,
                paddingTop: spacing.sm,
                paddingBottom: insets.bottom + spacing.lg,
                maxHeight: '85%',
              },
            ]}
          >
            <GestureDetector gesture={dragGesture}>
              <View>
                <View style={{ alignItems: 'center', paddingVertical: spacing.xs }}>
                  <View style={{ width: 44, height: 5, borderRadius: radius.full, backgroundColor: colors.border }} />
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
                  <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '700' }}>
                    Detalles del set {set.setIndex}
                  </Text>
                  <Pressable onPress={handleClose} hitSlop={10}>
                    <Ionicons name="close" size={24} color={colors.text} />
                  </Pressable>
                </View>
              </View>
            </GestureDetector>

            <ScrollView
              ref={scrollRef}
              style={{ flexShrink: 1 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
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
                onFocus={() => scrollRef.current?.scrollToEnd({ animated: true })}
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
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
              <View style={{ flex: 1 }}>
                <Button title="Cancelar" variant="secondary" onPress={handleClose} />
              </View>
              <View style={{ flex: 2 }}>
                <Button title="Guardar" onPress={handleSave} />
              </View>
            </View>
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
