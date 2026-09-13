import { useEffect } from 'react';
import { View, Text, Pressable , useColorScheme } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { useActiveWorkout } from '@stores/activeWorkoutStore';
import { usePreferences } from '@stores/preferencesStore';
import { darkTheme, lightTheme, spacing, radius, fontSize } from '@lib/theme';
import { formatDuration } from '@lib/format';

/**
 * Timer de descanso flotante.
 *
 * - Se muestra en la parte inferior cuando isResting=true.
 * - Animación de pulso cuando quedan <= 5s.
 * - Vibración háptica al llegar a 0.
 * - Permite saltar descanso o ajustar +/- 15s.
 */
export function RestTimer() {
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const haptics = usePreferences((s) => s.hapticsEnabled);

  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';

  const colors = isDark ? darkTheme : lightTheme;

  const isResting = useActiveWorkout((s) => s.isResting);
  const restRemaining = useActiveWorkout((s) => s.restRemaining);
  const skipRest = useActiveWorkout((s) => s.skipRest);
  const tickRest = useActiveWorkout((s) => s.tickRest);
  const startRest = useActiveWorkout((s) => s.startRest);

  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  // Tick cada segundo
  useEffect(() => {
    if (!isResting) return;
    const id = setInterval(tickRest, 1000);

    return () => clearInterval(id);
  }, [isResting, tickRest]);

  // Animación de pulso y vibración final
  useEffect(() => {
    if (isResting && restRemaining <= 5 && restRemaining > 0) {
      scale.value = withRepeat(
        withSequence(withTiming(1.08, { duration: 400 }), withTiming(1, { duration: 400 })),
        -1,
        true
      );
    } else {
      cancelAnimation(scale);
      scale.value = withTiming(1, { duration: 200 });
    }

    if (isResting && restRemaining === 0) {
      if (haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      skipRest();
    }
  }, [isResting, restRemaining, haptics, scale, skipRest]);

  // Aparición
  useEffect(() => {
    opacity.value = withTiming(isResting ? 1 : 0, { duration: 200 });
  }, [isResting, opacity]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: (1 - opacity.value) * 100 }, { scale: scale.value }],
  }));

  if (!isResting) return null;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: spacing.lg,
          right: spacing.lg,
          bottom: spacing.xl,
          backgroundColor: colors.surfaceElevated,
          borderRadius: radius.xl,
          padding: spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        },
        containerStyle,
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, fontWeight: '700', letterSpacing: 1 }}>
          DESCANSO
        </Text>
        <Text style={{ color: colors.text, fontSize: fontSize.display, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
          {formatDuration(restRemaining)}
        </Text>
      </View>
      <Pressable
        onPress={() => startRest(Math.max(0, restRemaining - 15))}
        style={{ padding: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.full }}
      >
        <Ionicons name="remove" size={22} color={colors.text} />
      </Pressable>
      <Pressable
        onPress={() => startRest(restRemaining + 15)}
        style={{ padding: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.full }}
      >
        <Ionicons name="add" size={22} color={colors.text} />
      </Pressable>
      <Pressable
        onPress={skipRest}
        style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.full }}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>Saltar</Text>
      </Pressable>
    </Animated.View>
  );
}
