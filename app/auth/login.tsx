import { View, Text, TextInput, Pressable, useWindowDimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';

import { signInWithEmail, signInWithOAuth, isSupabaseConfigured } from '@lib/supabase';
import { usePreferences } from '@stores/preferencesStore';
import { useAuth } from '@stores/authStore';
import { darkTheme, lightTheme, spacing, radius, fontSize } from '@lib/theme';
import { Button } from '@components/Button';
import { Card } from '@components/Card';

/**
 * Pantalla de inicio de sesión.
 * - Email + contraseña
 * - OAuth con Google y Apple
 * - Link a registro y a recuperar contraseña
 */
export default function LoginScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const haptics = usePreferences((s) => s.hapticsEnabled);
  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkTheme : lightTheme;
  const setSession = useAuth((s) => s.setSession);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Faltan datos', 'Introduce email y contraseña');
      return;
    }
    if (haptics) Haptics.selectionAsync();
    setLoading(true);
    try {
      const data = await signInWithEmail(email.trim(), password);
      setSession(data.session);
      if (haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/');
    } catch (err: any) {
      Alert.alert('Error de inicio', err.message ?? 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    if (haptics) Haptics.selectionAsync();
    setLoading(true);
    try {
      const data = await signInWithOAuth(provider);
      if (data?.session) {
        setSession(data.session);
        router.replace('/');
      }
    } catch (err: any) {
      Alert.alert('Error OAuth', err.message ?? 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <View style={{ padding: spacing.xl, gap: spacing.xl, maxWidth: 460, width: '100%', alignSelf: 'center' }}>
      <View style={{ alignItems: 'center', gap: spacing.sm, marginTop: spacing.xxl }}>
        <Text style={{ color: colors.text, fontSize: 56, fontWeight: '900', letterSpacing: -2 }}>Strain</Text>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.base }}>Entrenamiento, sin fricción</Text>
      </View>

      {!isSupabaseConfigured && (
        <Card>
          <Text style={{ color: colors.warning, fontWeight: '700', fontSize: fontSize.sm }}>
            ⚠ Supabase no está configurado
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, marginTop: spacing.xs }}>
            Para habilitar el inicio de sesión, configura EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY en tu .env
          </Text>
        </Card>
      )}

      <Card>
        <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '700' }}>Inicia sesión</Text>

        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="tu@email.com"
            colors={colors}
          />

          <View>
            <Input
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="••••••••"
              colors={colors}
            />
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={10}
              style={{ position: 'absolute', right: 12, top: 32 }}
            >
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <Button title="Entrar" onPress={handleLogin} loading={loading} fullWidth disabled={!isSupabaseConfigured} />
        </View>

        <Pressable onPress={() => router.push('/auth/forgot')} hitSlop={10} style={{ alignSelf: 'center', marginTop: spacing.md }}>
          <Text style={{ color: colors.primary, fontSize: fontSize.sm, fontWeight: '600' }}>
            ¿Olvidaste la contraseña?
          </Text>
        </Pressable>
      </Card>

      {/* OAuth */}
      <Card>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' }}>
          o continúa con
        </Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          <OAuthButton
            label="Continuar con Google"
            icon={<Ionicons name="logo-google" size={20} color={colors.text} />}
            onPress={() => handleOAuth('google')}
            disabled={!isSupabaseConfigured || loading}
            colors={colors}
          />
          <OAuthButton
            label="Continuar con Apple"
            icon={<Ionicons name="logo-apple" size={22} color={colors.text} />}
            onPress={() => handleOAuth('apple')}
            disabled={!isSupabaseConfigured || loading}
            colors={colors}
          />
        </View>
      </Card>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs }}>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>¿No tienes cuenta?</Text>
        <Link href="/auth/signup" asChild>
          <Pressable hitSlop={10}>
            <Text style={{ color: colors.primary, fontSize: fontSize.sm, fontWeight: '700' }}>Crear cuenta</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      {content}
    </SafeAreaView>
  );
}

function Input({
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

function OAuthButton({
  label,
  icon,
  onPress,
  disabled,
  colors,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  colors: typeof darkTheme;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: pressed ? colors.surfaceElevated : colors.background,
        opacity: disabled ? 0.5 : 1,
      })}
    >
      {icon}
      <Text style={{ color: colors.text, fontSize: fontSize.base, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}
