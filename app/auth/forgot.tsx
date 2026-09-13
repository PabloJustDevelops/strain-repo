import { View, Text, TextInput, Pressable, Alert , useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter, Stack } from 'expo-router';
import { useState } from 'react';

import { resetPassword, isSupabaseConfigured } from '@lib/supabase';
import { usePreferences } from '@stores/preferencesStore';
import { darkTheme, lightTheme, spacing, radius, fontSize } from '@lib/theme';
import { Button } from '@components/Button';
import { Card } from '@components/Card';

/**
 * Pantalla de recuperación de contraseña.
 * Envía un email con un enlace de reset al usuario.
 */
export default function ForgotPasswordScreen() {
  const router = useRouter();

  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);

  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';

  const colors = isDark ? darkTheme : lightTheme;

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email) {
      Alert.alert('Email requerido', 'Introduce tu email para enviarte el enlace de recuperación');

      return;
    }

    setLoading(true);

    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo enviar el email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Recuperar contraseña' }} />
      <View style={{ padding: spacing.xl, gap: spacing.xl, maxWidth: 460, width: '100%', alignSelf: 'center' }}>
        <View>
          <Text style={{ color: colors.text, fontSize: fontSize.xxl, fontWeight: '800' }}>¿Olvidaste tu contraseña?</Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.base, marginTop: spacing.xs }}>
            Te enviaremos un enlace para restablecerla.
          </Text>
        </View>

        {!isSupabaseConfigured && (
          <Card>
            <Text style={{ color: colors.warning, fontWeight: '700', fontSize: fontSize.sm }}>
              ⚠ Supabase no configurado
            </Text>
          </Card>
        )}

        {sent ? (
          <Card>
            <Text style={{ color: colors.success, fontSize: fontSize.lg, fontWeight: '700' }}>
              ✓ Email enviado
            </Text>
            <Text style={{ color: colors.text, marginTop: spacing.sm, lineHeight: 22 }}>
              Si el email existe en nuestra base de datos, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
            </Text>
            <Button title="Volver al inicio" onPress={() => router.replace('/auth/login')} variant="secondary" fullWidth />
          </Card>
        ) : (
          <Card>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.xs }}>
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="tu@email.com"
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
            />
            <View style={{ marginTop: spacing.lg }}>
              <Button title="Enviar enlace" onPress={handleReset} loading={loading} fullWidth disabled={!isSupabaseConfigured} />
            </View>
          </Card>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs }}>
          <Link href="/auth/login" asChild>
            <Pressable hitSlop={10}>
              <Text style={{ color: colors.primary, fontSize: fontSize.sm, fontWeight: '700' }}>← Volver a iniciar sesión</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}
