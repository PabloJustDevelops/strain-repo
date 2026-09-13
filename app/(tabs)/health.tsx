import { useCallback, useState } from 'react';
import { View, Text, ScrollView, Linking, RefreshControl, ActivityIndicator , useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useHealthConnect } from '@/stores/healthConnectStore';
import { usePreferences } from '@stores/preferencesStore';
import { darkTheme, lightTheme, spacing, radius, fontSize } from '@lib/theme';
import { Card } from '@components/Card';
import { Button } from '@components/Button';
import { openHealthConnectSettings } from '@/lib/healthConnect';

/**
 * Pantalla de salud:
 * - Estado de Health Connect (instalado, permisos, listo)
 * - Dashboard de hoy: pasos, FC media/reposo, calorías, distancia, sueño
 * - Acciones: conectar, abrir Health Connect, refrescar
 *
 * Solo Android. En iOS o dispositivos sin Health Connect muestra un mensaje.
 */
export default function HealthScreen() {
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);

  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';

  const colors = isDark ? darkTheme : lightTheme;

  const status = useHealthConnect((s) => s.status);
  const lastError = useHealthConnect((s) => s.lastError);
  const lastSyncedAt = useHealthConnect((s) => s.lastSyncedAt);
  const probe = useHealthConnect((s) => s.probe);
  const connect = useHealthConnect((s) => s.connect);
  const refreshToday = useHealthConnect((s) => s.refreshToday);
  const [refreshing, setRefreshing] = useState(false);

  // Revalida al recuperar el foco: los permisos pueden haber cambiado.
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const s = await probe();

        if (s === 'needsInstall') {
          await connect();
        }

        if (useHealthConnect.getState().status === 'ready') {
          await refreshToday();
        }
      })();
    }, [probe, connect, refreshToday])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshToday(true);
    setRefreshing(false);
  };

  const lastSyncLabel = lastSyncedAt
    ? `Actualizado ${new Date(lastSyncedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
    : 'Sin sincronizar';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Salud' }} />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        <StatusCard />

        {status === 'ready' && (
          <>
            <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '700' }}>Hoy</Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, marginTop: -spacing.md }}>{lastSyncLabel}</Text>
            <MetricGrid />
            <Card>
              <Text style={{ color: colors.text, fontWeight: '700' }}>Consejos</Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, marginTop: spacing.xs }}>
                Cuando termines un workout, se escribirá automáticamente en Health Connect como ejercicio de fuerza.
              </Text>
            </Card>
          </>
        )}

        {lastError && (
          <Card>
            <Text style={{ color: colors.danger, fontSize: fontSize.sm }}>{lastError}</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusCard() {
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const isDark = themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;

  const status = useHealthConnect((s) => s.status);
  const isLoading = useHealthConnect((s) => s.isLoading);
  const connect = useHealthConnect((s) => s.connect);

  const config = {
    unknown: { icon: 'sync' as const, label: 'Comprobando…', color: colors.textMuted },
    unavailable: { icon: 'close-circle' as const, label: 'No disponible en este dispositivo', color: colors.danger },
    needsInstall: { icon: 'cloud-download' as const, label: 'Instala Health Connect para empezar', color: colors.warning },
    notAuthorized: { icon: 'lock-closed' as const, label: 'Concede permisos a Strain', color: colors.warning },
    ready: { icon: 'checkmark-circle' as const, label: 'Conectado a Health Connect', color: colors.success },
  }[status];

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Ionicons name={config.icon} size={32} color={config.color} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '700' }}>Health Connect</Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>{config.label}</Text>
        </View>
        {isLoading && <ActivityIndicator color={colors.primary} />}
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
        {(status === 'needsInstall' || status === 'notAuthorized') && (
          <View style={{ flex: 1 }}>
            <Button title="Conectar" onPress={connect} />
          </View>
        )}
        {status === 'ready' && (
          <View style={{ flex: 1 }}>
            <Button title="Gestionar permisos" variant="secondary" onPress={() => void openHealthConnectSettings()} />
          </View>
        )}
        {status === 'unavailable' && (
          <View style={{ flex: 1 }}>
            <Button title="Abrir Play Store" variant="secondary" onPress={() => Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata')} />
          </View>
        )}
      </View>
    </Card>
  );
}

function MetricGrid() {
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const isDark = themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;

  const today = useHealthConnect((s) => s.today);

  const format = (n: number | null | undefined, suffix = '') => {
    if (n == null) return '—';

    if (Number.isInteger(n)) return `${n.toLocaleString('es-ES')}${suffix}`;

    return `${n.toFixed(1)}${suffix}`;
  };

  const metersToKm = (m: number) => (m / 1000).toFixed(2);

  const minutesToH = (m: number) => {
    const h = Math.floor(m / 60);
    const rest = m % 60;

    return `${h}h ${rest}m`;
  };

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
      <Metric icon="walk" label="Pasos" value={format(today?.steps)} colors={colors} />
      <Metric icon="flame" label="Cal. activas" value={format(today?.activeCalories, ' kcal')} colors={colors} />
      <Metric icon="navigate" label="Distancia" value={format(Number(metersToKm(today?.distanceMeters ?? 0)), ' km')} colors={colors} />
      <Metric icon="heart" label="FC media" value={format(today?.avgHeartRate, ' bpm')} colors={colors} />
      <Metric icon="bed" label="Sueño" value={today?.sleepMinutes ? minutesToH(today.sleepMinutes) : '—'} colors={colors} />
      <Metric icon="pulse" label="FC reposo" value={format(today?.restingHeartRate, ' bpm')} colors={colors} />
    </View>
  );
}

function Metric({ icon, label, value, colors }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; colors: ReturnType<typeof lightTheme extends infer T ? () => T : never> | any }) {
  return (
    <View style={{ flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs, borderWidth: 1, borderColor: colors.border }}>
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, textTransform: 'uppercase' }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: '800' }}>{value}</Text>
    </View>
  );
}