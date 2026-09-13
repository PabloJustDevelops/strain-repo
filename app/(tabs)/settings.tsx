import { View, Text, ScrollView, Switch, Pressable, Alert, Modal , useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';

import { usePreferences } from '@stores/preferencesStore';
import { useAuth } from '@stores/authStore';
import { darkTheme, lightTheme, spacing, radius, fontSize } from '@lib/theme';
import { Card } from '@components/Card';
import { Button } from '@components/Button';
import { getRepos } from '@db';
import { exportData } from '@lib/exportImport';
import { importStrongZip } from '@lib/strongFile';
import {
  initNotifications,
  requestNotificationPermission,
  scheduleReminders,
  type ReminderConfig,
} from '@lib/notifications';

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
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const setThemeMode = usePreferences((s) => s.setThemeMode);
  const units = usePreferences((s) => s.units);
  const setUnits = usePreferences((s) => s.setUnits);
  const hapticsEnabled = usePreferences((s) => s.hapticsEnabled);
  const setHapticsEnabled = usePreferences((s) => s.setHapticsEnabled);
  const keepScreenAwake = usePreferences((s) => s.keepScreenAwake);
  const setKeepScreenAwake = usePreferences((s) => s.setKeepScreenAwake);
  const reminder = usePreferences((s) => s.reminder);
  const setReminder = usePreferences((s) => s.setReminder);

  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';

  const colors = isDark ? darkTheme : lightTheme;

  const [reminderModal, setReminderModal] = useState(false);
  const [draftReminder, setDraftReminder] = useState<ReminderConfig>(reminder);

  // Auth
  const session = useAuth((s) => s.session);
  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);

  const handleExport = async () => {
    try {
      const json = await exportData(getRepos());
      await Sharing.shareAsync('data:application/json;base64,' + btoa(unescape(encodeURIComponent(json))));
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
      const result = await importStrongZip(doc.assets[0].uri, getRepos());
      Alert.alert('Listo', `Importadas ${result.workouts} sesiones con ${result.sets} sets.`);
    } catch (err) {
      Alert.alert('Error', String(err));
    }
  };

  const handleSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  const handleOpenReminder = async () => {
    await initNotifications();
    setDraftReminder(reminder);
    setReminderModal(true);
  };

  const handleSaveReminder = async () => {
    setReminder(draftReminder);
    const granted = await requestNotificationPermission();

    if (draftReminder.enabled && !granted) {
      Alert.alert('Permiso denegado', 'No podemos enviarte recordatorios sin permiso de notificaciones.');
      setReminder({ ...draftReminder, enabled: false });
      await scheduleReminders({ ...draftReminder, enabled: false });
      setReminderModal(false);

      return;
    }

    await scheduleReminders(draftReminder);
    setReminderModal(false);
  };

  const DAYS = [
    { value: 1, label: 'L' },
    { value: 2, label: 'M' },
    { value: 3, label: 'X' },
    { value: 4, label: 'J' },
    { value: 5, label: 'V' },
    { value: 6, label: 'S' },
    { value: 0, label: 'D' },
  ];

  const reminderSummary = reminder.enabled
    ? `A las ${String(reminder.hour).padStart(2, '0')}:${String(reminder.minute).padStart(2, '0')} · ${
        reminder.daysOfWeek.length === 7 || reminder.daysOfWeek.length === 0
          ? 'todos los días'
          : reminder.daysOfWeek
              .sort()
              .map((d: number) => DAYS.find((x) => x.value === d)?.label)
              .filter(Boolean)
              .join(', ')
      }`
    : 'Desactivados';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Ajustes' }} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        {/* Cuenta */}
        <Card>
          <SectionTitle title="Cuenta" />
          {session && user ? (
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: fontSize.lg, fontWeight: '800' }}>
                    {(user.email ?? '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>
                    {user.email}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
                    Sesión activa
                  </Text>
                </View>
              </View>
              <Button title="Cerrar sesión" variant="danger" onPress={handleSignOut} fullWidth />
            </View>
          ) : (
            <View style={{ gap: spacing.md }}>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
                Inicia sesión para sincronizar entre dispositivos.
              </Text>
              <Link href="/auth/login" asChild>
                <Pressable>
                  <Button title="Iniciar sesión / Crear cuenta" fullWidth onPress={() => {}} />
                </Pressable>
              </Link>
            </View>
          )}
        </Card>

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
            onChange={setThemeMode}
          />
          <Divider />
          <SectionTitle title="Unidades" />
          <SegmentedControl
            options={[
              { value: 'kg', label: 'Kilogramos' },
              { value: 'lb', label: 'Libras' },
            ]}
            value={units}
            onChange={setUnits}
          />
        </Card>

        {/* Entrenamiento */}
        <Card>
          <SectionTitle title="Entrenamiento" />
          <Row label="Vibración háptica" value={hapticsEnabled} onChange={setHapticsEnabled} />
          <Divider />
          <Row label="Pantalla siempre encendida" value={keepScreenAwake} onChange={setKeepScreenAwake} />
        </Card>

        {/* Notificaciones */}
        <Card>
          <SectionTitle title="Recordatorios" />
          <Pressable
            onPress={handleOpenReminder}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm }}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>Programar recordatorios</Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>{reminderSummary}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
        </Card>

        {/* Datos */}
        <Card>
          <SectionTitle title="Datos" />
          <Button title="Exportar todo (JSON)" onPress={handleExport} fullWidth />
          <View style={{ height: spacing.sm }} />
          <Button title="Importar JSON" variant="secondary" onPress={handleImport} fullWidth />
          <View style={{ height: spacing.sm }} />
          <Button title="Importar desde Strong (.zip o .csv)" variant="secondary" onPress={handleImportHevy} fullWidth />
        </Card>

        <Card>
          <SectionTitle title="Acerca de" />
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
            Strain v0.1.0 · Hecho con Expo + Drizzle SQLite
          </Text>
        </Card>
      </ScrollView>

      {/* Modal: configurar recordatorios */}
      <Modal visible={reminderModal} transparent animationType="slide" onRequestClose={() => setReminderModal(false)}>
        <Pressable
          onPress={() => setReminderModal(false)}
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
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '700' }}>Recordatorios</Text>
              <Pressable onPress={() => setReminderModal(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <Row
              label="Activar recordatorios"
              value={draftReminder.enabled}
              onChange={(v) => setDraftReminder({ ...draftReminder, enabled: v })}
            />

            <SectionTitle title="Hora" />
            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>Hora</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {Array.from({ length: 24 }).map((_, h) => (
                    <Pressable
                      key={h}
                      onPress={() => setDraftReminder({ ...draftReminder, hour: h })}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: radius.sm,
                        backgroundColor: draftReminder.hour === h ? colors.primary : colors.background,
                        borderWidth: 1,
                        borderColor: draftReminder.hour === h ? colors.primary : colors.border,
                        minWidth: 40,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: draftReminder.hour === h ? '#fff' : colors.text, fontSize: fontSize.xs }}>
                        {String(h).padStart(2, '0')}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            <View style={{ height: spacing.md }} />
            <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>Minutos (en pasos de 5)</Text>
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
              {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setDraftReminder({ ...draftReminder, minute: m })}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: radius.sm,
                    backgroundColor: draftReminder.minute === m ? colors.primary : colors.background,
                    borderWidth: 1,
                    borderColor: draftReminder.minute === m ? colors.primary : colors.border,
                    minWidth: 40,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: draftReminder.minute === m ? '#fff' : colors.text, fontSize: fontSize.xs }}>
                    {String(m).padStart(2, '0')}
                  </Text>
                </Pressable>
              ))}
            </View>

            <SectionTitle title="Días" />
            <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm }}>
              {DAYS.map((d) => {
                const active = draftReminder.daysOfWeek.includes(d.value);

                return (
                  <Pressable
                    key={d.value}
                    onPress={() => {
                      const set = new Set(draftReminder.daysOfWeek);

                      if (set.has(d.value)) set.delete(d.value);
                      else set.add(d.value);
                      setDraftReminder({ ...draftReminder, daysOfWeek: Array.from(set) });
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: spacing.sm,
                      borderRadius: radius.md,
                      backgroundColor: active ? colors.primary : colors.background,
                      borderWidth: 1,
                      borderColor: active ? colors.primary : colors.border,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '700' }}>{d.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ height: spacing.md }} />
            <SectionTitle title="Mensaje" />
            <Pressable
              onPress={() => {
                const presets = [
                  'Hora de entrenar. ¡A por ello!',
                  'Toca hoy. Tu yo del futuro te lo agradecerá.',
                  'No rompas la racha. Sesión rápida y a casa.',
                ];

                Alert.alert('Mensaje rápido', undefined, [
                  ...presets.map((p) => ({ text: p, onPress: () => setDraftReminder({ ...draftReminder, message: p }) })),
                  { text: 'Cancelar', style: 'cancel' },
                ]);
              }}
              style={{
                padding: spacing.md,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.background,
                marginTop: spacing.sm,
              }}
            >
              <Text style={{ color: colors.text }}>{draftReminder.message}</Text>
            </Pressable>

            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
              <View style={{ flex: 1 }}>
                <Button title="Cancelar" variant="secondary" onPress={() => setReminderModal(false)} />
              </View>
              <View style={{ flex: 2 }}>
                <Button title="Guardar recordatorio" onPress={handleSaveReminder} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
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
