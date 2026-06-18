import { forwardRef, useEffect } from 'react';
import { View, Text, ScrollView, useWindowDimensions } from 'react-native';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { usePreferences } from '@stores/preferencesStore';
import { darkTheme, lightTheme, spacing, radius, fontSize } from '@lib/theme';
import type { WorkoutSession } from '@/types/domain';

/**
 * Card resumen de un workout ya finalizado, pensada para capturar y compartir.
 * Se renderiza off-screen con ViewShot al compartir, pero también puede ir
 * embebida en pantallas de detalle.
 *
 * Contenido:
 * - Nombre del workout + fecha
 * - Duración, series totales, volumen total
 * - Top 3 ejercicios por volumen
 * - Mensaje motivador final
 */
interface WorkoutSummaryCardProps {
  session: WorkoutSession & {
    exercises?: Array<{
      id: string;
      name: string;
      sets: Array<{ weight: number; reps: number; isCompleted: boolean }>;
    }>;
  };
  onReady?: () => void;
  width?: number;
  height?: number;
}

export const WorkoutSummaryCard = forwardRef<View, WorkoutSummaryCardProps>(function WorkoutSummaryCard(
  { session, onReady, width = 360, height = 540 },
  ref
) {
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const isDark = themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    // Le da un microtask al layout para que la captura no salga vacía.
    const t = setTimeout(() => onReady?.(), 80);
    return () => clearTimeout(t);
  }, [onReady]);

  const start = session.startedAt ?? new Date();
  const end = session.endedAt ?? new Date();
  const durationMin = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));

  const top = (session.exercises ?? [])
    .map((e) => ({
      name: e.name,
      volume: e.sets.filter((s) => s.isCompleted).reduce((a, s) => a + s.weight * s.reps, 0),
    }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 3);

  const totalSets = session.totalSets;
  const totalVol = session.totalVolume;

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        width,
        height,
        backgroundColor: colors.background,
        padding: spacing.lg,
        justifyContent: 'space-between',
      }}
    >
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="barbell" size={20} color="#fff" />
          </View>
          <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '800' }}>STRAIN</Text>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, textTransform: 'uppercase', letterSpacing: 1 }}>
          {start.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
        </Text>
        <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: '800', marginTop: spacing.xs }}>
          {session.name}
        </Text>
      </View>

      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Stat label="Duración" value={`${durationMin} min`} colors={colors} />
          <Stat label="Series" value={`${totalSets}`} colors={colors} />
          <Stat label="Volumen" value={`${Math.round(totalVol).toLocaleString('es-ES')}`} colors={colors} unit="kg" />
        </View>

        {top.length > 0 && (
          <View>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, textTransform: 'uppercase', marginBottom: spacing.xs }}>
              Top ejercicios
            </Text>
            {top.map((t, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 }}>
                <Text style={{ color: colors.primary, fontWeight: '800', width: 18 }}>{i + 1}</Text>
                <Text style={{ color: colors.text, flex: 1, fontWeight: '600' }}>{t.name}</Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
                  {Math.round(t.volume).toLocaleString('es-ES')} kg
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, textAlign: 'center' }}>
        strain.app · workout #{session.id.slice(-4)}
      </Text>
    </View>
  );
});

function Stat({ label, value, unit, colors }: { label: string; value: string; unit?: string; colors: any }) {
  return (
    <View style={{ alignItems: 'flex-start' }}>
      <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, textTransform: 'uppercase' }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '800' }}>
        {value}
        {unit ? <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, fontWeight: '500' }}> {unit}</Text> : null}
      </Text>
    </View>
  );
}