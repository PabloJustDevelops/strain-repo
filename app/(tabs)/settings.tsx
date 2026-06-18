import { View, Text, ScrollView, Switch, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

import { usePreferences } from '@stores/preferencesStore';
import { darkTheme, lightTheme, spacing, radius, fontSize } from '@lib/theme';
import { Card } from '@components/Card';
import { Button } from '@components/Button';
import { exportData, importData, importHevyZip } from '@lib/exportImport';

/**
 * Pantalla de ajustes:
 * - Tema (claro/oscuro/sistema)
 * - Unidades (kg/lb)
 * - Haptics
 * - Mantener pantalla encendida durante workouts
 * - Exportar / Importar datos
 * - Importar desde Hevy
 * - Información de la app
 */
export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const setThemeMode = usePreferences((s) => s.setThemeMode);
  const units = usePreferences((s) => s.units);
  const setUnits = usePreferences((s) => s.setUnits);
  const hapticsEnabled = usePreferences((s) => s.hapticsEnabled);
  const setHapticsEnabled = usePreferences((s) => s.setHapticsEnabled);
  const keepScreenAwake = usePreferences((s) => s.keepScreenAwake);
  const setKeepScreenAwake = usePreferences((s) => s.setKeepScreenAwake);
  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;

  const handleExport = async () => {
    try {
      const json = await exportData();
      const result = await Sharing.shareAsync('data:application/json;base64,' + btoa(unescape(encodeURIComponent(json))));
      if (result.action === Sharing.SharedAction.dismissedAction) {
        Alert.alert('Cancelado', 'No se ha exportado.');
      }
    } catch (err) {
      Alert.alert('Error', String(err));
    }
  };

  const handleImport = async () => {
    try {
      const doc = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (doc.canceled) return;
      // Leer archivo y procesar
      // En web: usar fetch(file.uri); en nativo: usar FileSystem
      Alert.alert('Importar', 'Función disponible — ver lib/exportImport.ts');
    } catch (err) {
      Alert.alert('Error', String(err));
    }
  };

  const handleImportHevy = async () => {
    try {
      const doc = await DocumentPicker.getDocumentAsync({ type: 'application/zip' });
      if (doc.canceled) return;
      await importHevyZip(doc.assets[0].uri);
      Alert.alert('Listo', 'Datos importados desde Hevy.');
    } catch (err) {
      Alert.alert('Error', String(err));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Ajustes' }} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        {/* Apariencia */}
        <Card>
          <SectionTitle title="Apariencia" />
          <SegmentedControl
            options={[
              { value: 'light', label: 'Claro' },
              { value: 'dark', label: 'Oscuro' },
              { value: 'system', label: 'Sistema' },
            ]}
            value={themeMode}
            onChange={(v) => setThemeMode(v as any)}
          />
          <Divider />
          <SectionTitle title="Unidades" />
          <SegmentedControl
            options={[
              { value: 'kg', label: 'Kilogramos' },
              { value: 'lb', label: 'Libras' },
            ]}
            value={units}
            onChange={(v) => setUnits(v as any)}
          />
        </Card>

        {/* Entrenamiento */}
        <Card>
          <SectionTitle title="Entrenamiento" />
          <Row label="Vibración háptica" value={hapticsEnabled} onChange={setHapticsEnabled} />
          <Divider />
          <Row label="Pantalla siempre encendida" value={keepScreenAwake} onChange={setKeepScreenAwake} />
        </Card>

        {/* Datos */}
        <Card>
          <SectionTitle title="Datos" />
          <Button title="Exportar todo (JSON)" onPress={handleExport} fullWidth />
          <View style={{ height: spacing.sm }} />
          <Button title="Importar JSON" variant="secondary" onPress={handleImport} fullWidth />
          <View style={{ height: spacing.sm }} />
          <Button title="Importar desde Hevy (.zip)" variant="secondary" onPress={handleImportHevy} fullWidth />
        </Card>

        <Card>
          <SectionTitle title="Acerca de" />
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
            Strain v0.1.0 · Hecho con Expo + Drizzle SQLite
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ title }: { title: string }) {
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;
  return (
    <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
      {title}
    </Text>
  );
}

function Divider() {
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;
  return <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />;
}

function Row({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm }}>
      <Text style={{ color: colors.text }}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.background, borderRadius: radius.md, padding: 2, marginTop: spacing.sm }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={{
              flex: 1,
              paddingVertical: spacing.sm,
              borderRadius: radius.sm,
              backgroundColor: active ? colors.primary : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '600' }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
