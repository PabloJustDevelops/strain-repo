import { useEffect, useState } from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
  interpolateColor,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { usePreferences } from '@stores/preferencesStore';
import { darkTheme, lightTheme, spacing, radius, fontSize } from '@lib/theme';
import { formatDuration } from '@lib/format';
import { calculatePlates, type PlateResult } from '@lib/plateCalculator';
import type { SetView } from '@/types/domain';

interface SetRowProps {
  set: SetView;
  previous?: SetView | null;
  units: 'kg' | 'lb';
  onComplete: () => void;
  onUncomplete: () => void;
  onUpdate: (patch: Partial<SetView>) => void;
  onDelete: () => void;
  onShowPlates: (result: PlateResult) => void;
  onEditWeight?: () => void;
  onEditReps?: () => void;
}

/**
 * Fila de un set dentro del workout activo.
 *
 * Gestos:
 * - Swipe derecha -> completar
 * - Swipe izquierda -> eliminar
 * - Tap en peso -> abrir calculadora de discos
 *
 * Incluye auto-peso de la sesión anterior (si existe) como referencia.
 */
export function SetRow({
  set,
  previous,
  units,
  onComplete,
  onUncomplete,
  onUpdate,
  onDelete,
  onShowPlates,
  onEditWeight,
  onEditReps,
}: SetRowProps) {
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const haptics = usePreferences((s) => s.hapticsEnabled);
  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;

  const translateX = useSharedValue(0);
  const itemHeight = useSharedValue(72);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      const threshold = 80;
      if (e.translationX > threshold && !set.isCompleted) {
        translateX.value = withTiming(400, { duration: 200 });
        itemHeight.value = withTiming(0, { duration: 200 }, () => {
          runOnJS(onComplete)();
        });
        if (haptics) runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Success);
      } else if (e.translationX < -threshold) {
        itemHeight.value = withTiming(0, { duration: 200 }, () => {
          runOnJS(onDelete)();
        });
        if (haptics) runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Warning);
      } else {
        translateX.value = withTiming(0, { duration: 200 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    height: itemHeight.value,
    opacity: itemHeight.value === 0 ? 0 : 1,
  }));

  const rightBgStyle = useAnimatedStyle(() => ({
    opacity: interpolateColor(translateX.value, [-200, -50, 0], [1, 0.4, 0]) as unknown as number,
  }));

  // Forzar opacidad manualmente (interpolateColor devuelve string)
  const rightActionStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, translateX.value / 80)),
  }));

  const leftActionStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, -translateX.value / 80)),
  }));

  const bgColor = useAnimatedStyle(() => ({
    backgroundColor: set.isCompleted
      ? withTiming(colors.completed + '33')
      : withTiming(colors.surface),
  }));

  const handleWeightTap = () => {
    if (set.isCompleted && onEditWeight) {
      // Si ya está completado, abrir keypad para editar (no calculadora)
      onEditWeight();
      return;
    }
    const result = calculatePlates(set.weight);
    onShowPlates(result);
  };

  const handleRepsTap = () => {
    if (onEditReps) onEditReps();
  };

  return (
    <View style={{ marginBottom: spacing.sm }}>
      {/* Acciones detrás de la fila */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            inset: 0 as unknown as number,
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: colors.success,
            borderRadius: radius.md,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing.lg,
          },
          rightBgStyle,
        ]}
      >
        <Animated.View style={leftActionStyle}>
          <Ionicons name="checkmark-circle" size={28} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', marginTop: 2 }}>Completar</Text>
        </Animated.View>
      </Animated.View>

      <Animated.View
        style={[
          {
            position: 'absolute',
            inset: 0 as unknown as number,
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: colors.danger,
            borderRadius: radius.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingHorizontal: spacing.lg,
          },
          rightActionStyle,
        ]}
      >
        <Animated.View style={rightActionStyle}>
          <Ionicons name="trash" size={28} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', marginTop: 2 }}>Eliminar</Text>
        </Animated.View>
      </Animated.View>

      <GestureDetector gesture={swipeGesture}>
        <Animated.View style={[cardStyle, bgColor, { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, overflow: 'hidden' }]}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, width: 28, fontWeight: '700' }}>
            {set.setIndex}
          </Text>

          {previous && (
            <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, width: 60 }}>
              ant.{previous.reps}×{previous.weight}
            </Text>
          )}
          {!previous && <View style={{ width: 60 }} />}

          <Pressable
            onPress={handleWeightTap}
            style={{
              flex: 1,
              paddingVertical: spacing.sm,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: '700' }}>
              {set.weight || '—'}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>{units}</Text>
          </Pressable>

          <View style={{ width: 1, height: 32, backgroundColor: colors.border }} />

          <Pressable
            onPress={handleRepsTap}
            style={{
              flex: 1,
              paddingVertical: spacing.sm,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: '700' }}>
              {set.reps || '—'}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>reps</Text>
          </Pressable>

          <Pressable
            onPress={() => (set.isCompleted ? onUncomplete() : onComplete())}
            hitSlop={10}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: set.isCompleted ? colors.completed : 'transparent',
              borderWidth: 2,
              borderColor: set.isCompleted ? colors.completed : colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {set.isCompleted && <Ionicons name="checkmark" size={22} color="#fff" />}
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
