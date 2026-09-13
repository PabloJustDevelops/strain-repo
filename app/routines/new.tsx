import { useState } from 'react';
import { View, Text, TextInput , useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';

import { getRepos } from '@db';
import { usePreferences } from '@stores/preferencesStore';
import { darkTheme, lightTheme, spacing, radius, fontSize } from '@lib/theme';
import { Button } from '@components/Button';

/**
 * Creación de una rutina.
 *
 * Reemplaza al `router.push('/routines/new')` que casaba por accidente con
 * `routines/[id]` y dejaba una rutina fantasma con id literal "new".
 */
export default function NewRoutineScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);

  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';

  const colors = isDark ? darkTheme : lightTheme;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = name.trim().length > 0 && !saving;

  const handleCreate = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);

    try {
      const routine = await getRepos().routines.create({
        name: name.trim(),
        description: description.trim() || undefined,
      });

      router.replace({ pathname: '/routines/[id]', params: { id: routine.id } });
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Nueva rutina' }} />
      <View style={{ padding: spacing.lg, gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.text, fontWeight: '600' }}>Nombre</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ej. Empuje A"
            placeholderTextColor={colors.textMuted}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreate}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              color: colors.text,
              padding: spacing.md,
              fontSize: fontSize.base,
            }}
          />
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.text, fontWeight: '600' }}>Descripción (opcional)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Notas de la rutina"
            placeholderTextColor={colors.textMuted}
            multiline
            style={{
              backgroundColor: colors.surface,
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
        </View>

        {error && (
          <Text style={{ color: colors.danger, fontSize: fontSize.sm }}>{error}</Text>
        )}

        <Button
          title={saving ? 'Creando…' : 'Crear rutina'}
          onPress={handleCreate}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}
