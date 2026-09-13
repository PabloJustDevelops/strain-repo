import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, Modal , useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';


import { usePreferences } from '@stores/preferencesStore';
import { darkTheme, lightTheme, spacing, radius, fontSize } from '@lib/theme';
import { oneRmPreview } from '@lib/metrics';
import { formatWeight } from '@lib/format';
import {
  backspace,
  initialKeypadState,
  keypadDisplay,
  keypadValue,
  pressDecimal,
  pressDigit,
  quickPickState,
  stepKeypadValue,
  type KeypadField,
  type KeypadState,
} from '@lib/keypad';

/**
 * Teclado numérico táctil para introducir peso o repeticiones en el workout activo.
 *
 * Características:
 * - Botones grandes (mínimo 56px) fáciles de pulsar con dedos sudados
 * - Feedback háptico en cada tap
 * - Steppers rápidos: ±2.5kg / ±5kg / ±1kg / ±5 reps / ±1 rep
 * - Presets del último peso registrado
 * - Soporte para decimales (peso) y enteros (reps)
 * - Confirmar con doble-tap o botón verde
 * - Cancelar manteniendo pulsado el botón rojo
 */

interface NumericKeypadProps {
  visible: boolean;
  initialValue: number;
  field: KeypadField;
  units: 'kg' | 'lb';
  previousValue?: number | null;
  /** Peso ya introducido del set; alimenta el 1RM en vivo en el paso de reps. */
  previewWeight?: number | null;
  onConfirm: (value: number) => void;
  onCancel: () => void;
}

const WEIGHT_STEP_LARGE = 5;

const WEIGHT_STEP_SMALL = 2.5;

const REPS_STEP = 1;

export function NumericKeypad({
  visible,
  initialValue,
  field,
  units,
  previousValue,
  previewWeight,
  onConfirm,
  onCancel,
}: NumericKeypadProps) {
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const hapticsEnabled = usePreferences((s) => s.hapticsEnabled);

  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';

  const colors = isDark ? darkTheme : lightTheme;

  // Estado del valor en edición: un único buffer de texto.
  const [state, setState] = useState<KeypadState>(() => initialKeypadState(initialValue, field));

  const hapticTap = useCallback(() => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [hapticsEnabled]);

  const hapticSuccess = useCallback(() => {
    if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [hapticsEnabled]);

  // Animación del número principal
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withSequence(withTiming(1.15, { duration: 80 }), withTiming(1, { duration: 100 }));
  }, [state.buffer, scale]);
  const numberStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  // Lo mostrado y lo que se confirma salen del mismo buffer.
  const display = keypadDisplay(state, field);

  // 1RM en vivo: sólo en el paso de reps, que es cuando ya se conoce el peso.
  const oneRm =
    field === 'reps' && previewWeight != null
      ? oneRmPreview(previewWeight, keypadValue(state))
      : null;

  // Manejo de teclas: todo pasa por el reducer puro.
  const handleDigit = (d: string) => {
    hapticTap();
    setState((s) => pressDigit(s, d, field));
  };

  const handleDecimal = () => {
    hapticTap();
    setState((s) => pressDecimal(s, field));
  };

  const handleBackspace = () => {
    hapticTap();
    setState(backspace);
  };

  const step = (delta: number) => {
    hapticTap();
    setState((s) => stepKeypadValue(s, delta));
  };

  const handleConfirm = () => {
    hapticSuccess();
    onConfirm(keypadValue(state));
  };

  const handleQuickPick = (v: number) => {
    hapticTap();
    setState(quickPickState(v, field));
  };

  const label = field === 'weight' ? `Peso (${units})` : 'Repeticiones';
  const stepLarge = field === 'weight' ? WEIGHT_STEP_LARGE : REPS_STEP * 5;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable
        onPress={onCancel}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
      />

      <View
        style={{
          backgroundColor: colors.surfaceElevated,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          padding: spacing.lg,
          paddingBottom: spacing.xxl,
          gap: spacing.lg,
        }}
      >
        {/* Cabecera */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pressable onPress={onCancel} hitSlop={10}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.base, fontWeight: '600' }}>
              Cancelar
            </Text>
          </Pressable>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
            {label}
          </Text>
          <Pressable onPress={handleConfirm} hitSlop={10}>
            <Text style={{ color: colors.success, fontSize: fontSize.base, fontWeight: '700' }}>
              Listo
            </Text>
          </Pressable>
        </View>

        {/* Display grande */}
        <View style={{ alignItems: 'center', gap: spacing.xs }}>
          <Animated.Text
            style={[
              {
                color: colors.text,
                fontSize: 88,
                fontWeight: '900',
                fontVariant: ['tabular-nums'],
                lineHeight: 96,
              },
              numberStyle,
            ]}
          >
            {display}
          </Animated.Text>
          {field === 'weight' && (
            <Text style={{ color: colors.textMuted, fontSize: fontSize.lg, fontWeight: '600' }}>
              {units}
            </Text>
          )}
          {field === 'reps' && oneRm != null && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                backgroundColor: colors.surface,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
                borderRadius: radius.full,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Ionicons name="trending-up" size={16} color={colors.primary} />
              <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>1RM estimado</Text>
              <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: '700' }}>
                {formatWeight(oneRm, units)}
              </Text>
            </View>
          )}
        </View>

        {/* Steppers rápidos */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.md }}>
          <StepButton label={`−${stepLarge}`} onPress={() => step(-stepLarge)} />
          {field === 'weight' && (
            <StepButton label={`−${WEIGHT_STEP_SMALL}`} onPress={() => step(-WEIGHT_STEP_SMALL)} />
          )}
          {field === 'weight' && (
            <StepButton label={`+${WEIGHT_STEP_SMALL}`} onPress={() => step(WEIGHT_STEP_SMALL)} />
          )}
          <StepButton label={`+${stepLarge}`} onPress={() => step(stepLarge)} />
        </View>

        {/* Preset del último valor */}
        {previousValue != null && previousValue > 0 && (
          <Pressable
            onPress={() => handleQuickPick(previousValue)}
            style={{
              backgroundColor: colors.surface,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.md,
              borderRadius: radius.md,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons name="time-outline" size={16} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
              Anterior: <Text style={{ color: colors.text, fontWeight: '700' }}>{previousValue}</Text>
            </Text>
          </Pressable>
        )}

        {/* Teclado */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm }}>
          {['1', '2', '3'].map((d) => <Key key={d} label={d} onPress={() => handleDigit(d)} />)}
          <Key label="⌫" variant="muted" onPress={handleBackspace} />
          {['4', '5', '6'].map((d) => <Key key={d} label={d} onPress={() => handleDigit(d)} />)}
          <Key label="0" variant="wide" onPress={() => handleDigit('0')} />
          {['7', '8', '9'].map((d) => <Key key={d} label={d} onPress={() => handleDigit(d)} />)}
          {field === 'weight' && (
            <Key label="." variant="muted" onPress={handleDecimal} />
          )}
        </View>

        {/* Botón confirmar grande */}
        <Pressable
          onPress={handleConfirm}
          style={{
            backgroundColor: colors.success,
            paddingVertical: spacing.lg,
            borderRadius: radius.md,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: spacing.sm,
          }}
        >
          <Ionicons name="checkmark-circle" size={24} color="#fff" />
          <Text style={{ color: '#fff', fontSize: fontSize.lg, fontWeight: '700' }}>
            Confirmar
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function Key({
  label,
  variant = 'default',
  onPress,
  wide,
}: {
  label: string;
  variant?: 'default' | 'muted' | 'wide';
  onPress: () => void;
  wide?: boolean;
}) {
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);

  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';

  const colors = isDark ? darkTheme : lightTheme;

  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const base = {
    width: wide ? 140 : 72,
    height: 64,
    borderRadius: radius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  const bg = variant === 'muted' ? colors.surface : colors.background;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          base,
          animStyle,
          { backgroundColor: bg, borderWidth: 1, borderColor: colors.border },
        ]}
      >
        <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: '700' }}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

function StepButton({ label, onPress }: { label: string; onPress: () => void }) {
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);

  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';

  const colors = isDark ? darkTheme : lightTheme;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        backgroundColor: pressed ? colors.primaryMuted : colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      })}
    >
      <Text style={{ color: colors.text, fontWeight: '700', fontSize: fontSize.base }}>
        {label}
      </Text>
    </Pressable>
  );
}
