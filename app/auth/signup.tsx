import { View, Text, TextInput, Pressable, Alert , useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter, Stack } from 'expo-router';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';

import { signUpWithEmail, isSupabaseConfigured } from '@lib/supabase';
import { useAuth } from '@stores/authStore';
import { usePreferences } from '@stores/preferencesStore';
import { darkTheme, lightTheme, spacing, radius, fontSize } from '@lib/theme';
import { Button } from '@components/Button';
import { Card } from '@components/Card';

/**
 * Pantalla de registro.
 *
 * - Email + contraseña (mínimo 8 caracteres)
 * - Confirmación de contraseña
 * - Validación inline
 * - Email de verificación enviado automáticamente por Supabase
 */
export default function SignupScreen() {
  const router = useRouter();

  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const haptics = usePreferences((s) => s.hapticsEnabled);

  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';

  const colors = isDark ? darkTheme : lightTheme;
  const setSession = useAuth((s) => s.setSession);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password) {
      Alert.alert('Faltan datos', 'Introduce email y contraseña');

      return;
    }

    if (password.length < 8) {
      Alert.alert('Contraseña débil', 'Debe tener al menos 8 caracteres');

      return;
    }

    if (password !== confirm) {
      Alert.alert('No coinciden', 'Las contraseñas no coinciden');

      return;
    }

    if (haptics) Haptics.selectionAsync();
    setLoading(true);

    try {
      const data = await signUpWithEmail(email.trim(), password);

      if (data.session) {
        setSession(data.session);
        router.replace('/');
      } else {
        Alert.alert(
          'Verifica tu email',
          'Te hemos enviado un email de confirmación. Revisa tu bandeja de entrada.',
          [{ text: 'OK', onPress: () => router.replace('/auth/login') }]
        );
      }
    } catch (err: any) {
      Alert.alert('Error al registrar', err.message ?? 'No se pudo crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const strength = (() => {
    if (password.length === 0) return { level: 0, label: '', color: colors.textMuted };

    if (password.length < 6) return { level: 1, label: 'Muy débil', color: colors.danger };

    if (password.length < 8) return { level: 2, label: 'Débil', color: colors.warning };

    if (password.length < 12) return { level: 3, label: 'Buena', color: colors.success };

    return { level: 4, label: 'Excelente', color: colors.success };
  })();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Crear cuenta' }} />
      <View style={{ padding: spacing.xl, gap: spacing.xl, maxWidth: 460, width: '100%', alignSelf: 'center' }}>
        <View>
          <Text style={{ color: colors.text, fontSize: fontSize.xxl, fontWeight: '800' }}>Crea tu cuenta</Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.base, marginTop: spacing.xs }}>
            Empieza a registrar tus workouts
          </Text>
        </View>

        {!isSupabaseConfigured && (
          <Card>
            <Text style={{ color: colors.warning, fontWeight: '700', fontSize: fontSize.sm }}>
              ⚠ Supabase no configurado
            </Text>
          </Card>
        )}

        <Card>
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" colors={colors} />
          <View style={{ marginTop: spacing.md }}>
            <Field label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry colors={colors} />
            {password.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs }}>
                <View style={{ flex: 1, height: 4, backgroundColor: colors.surfaceElevated, borderRadius: 2, overflow: 'hidden' }}>
                  <View style={{ width: `${strength.level * 25}%`, height: '100%', backgroundColor: strength.color }} />
                </View>
                <Text style={{ color: strength.color, fontSize: fontSize.xs, fontWeight: '700' }}>{strength.label}</Text>
              </View>
            )}
          </View>
          <View style={{ marginTop: spacing.md }}>
            <Field label="Repite la contraseña" value={confirm} onChangeText={setConfirm} secureTextEntry colors={colors} />
          </View>

          <View style={{ marginTop: spacing.lg }}>
            <Button title="Crear cuenta" onPress={handleSignup} loading={loading} fullWidth disabled={!isSupabaseConfigured} />
          </View>
        </Card>

        <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, textAlign: 'center', lineHeight: 18 }}>
          Al continuar aceptas nuestros Términos y Política de Privacidad.
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>¿Ya tienes cuenta?</Text>
          <Link href="/auth/login" asChild>
            <Pressable hitSlop={10}>
              <Text style={{ color: colors.primary, fontSize: fontSize.sm, fontWeight: '700' }}>Inicia sesión</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Field({
  label,
  colors,
  ...rest
}: {
  label: string;
  colors: typeof darkTheme;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View>
      <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.xs }}>
        {label}
      </Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={{
          backgroundColor: colors.background,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          color: colors.text,
          fontSize: fontSize.base,
        }}
        {...rest}
      />
    </View>
  );
}
