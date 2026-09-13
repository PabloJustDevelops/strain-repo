import { Modal, View, Text, Pressable , useColorScheme } from 'react-native';
import { usePreferences } from '@stores/preferencesStore';
import { darkTheme, lightTheme, spacing, radius, fontSize } from '@lib/theme';
import { formatWeight } from '@lib/format';
import { plateShortfallMessage, type PlateResult } from '@lib/plateCalculator';

interface PlateCalculatorSheetProps {
  result: PlateResult | null;
  onClose: () => void;
}

/**
 * Modal con la distribución de discos para un peso objetivo.
 * - Muestra el total, el remanente (si no es alcanzable) y los discos por lado.
 * - Dibuja los discos a escala usando Views con anchos proporcionales.
 */
export function PlateCalculatorSheet({ result, onClose }: PlateCalculatorSheetProps) {
  const colorScheme = useColorScheme();
  const themeMode = usePreferences((s) => s.themeMode);
  const units = usePreferences((s) => s.units);

  const isDark =
    themeMode === 'system' ? colorScheme === 'dark' : themeMode === 'dark';

  const colors = isDark ? darkTheme : lightTheme;
  const shortfall = result ? plateShortfallMessage(result) : null;

  return (
    <Modal visible={!!result} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose} />
      <View
        style={{
          backgroundColor: colors.surface,
          padding: spacing.xl,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          gap: spacing.lg,
        }}
      >
        {result && (
          <>
            <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '700' }}>
              Calculadora de discos
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>Objetivo</Text>
                <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: '700' }}>
                  {formatWeight(result.totalWeight + result.remainder, units)}
                </Text>
              </View>
              <View>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>Alcanzable</Text>
                <Text style={{ color: result.achievable ? colors.success : colors.warning, fontSize: fontSize.xl, fontWeight: '700' }}>
                  {formatWeight(result.totalWeight, units)}
                </Text>
              </View>
            </View>

            {/* Visualización de la barra */}
            <View
              style={{
                height: 80,
                backgroundColor: colors.background,
                borderRadius: radius.md,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: spacing.lg,
              }}
            >
              {/* Lado izquierdo */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {result.platesPerSide
                  .flatMap((p) => Array(p.perSide).fill(p.plateKg))
                  .map((kg, idx) => (
                    <PlateDisk key={`L-${idx}`} kg={kg} />
                  ))
                  .reverse()}
              </View>
              {/* Barra */}
              <View style={{ flex: 1, height: 8, backgroundColor: colors.text, marginHorizontal: spacing.sm, borderRadius: 2 }} />
              {/* Lado derecho */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {result.platesPerSide
                  .flatMap((p) => Array(p.perSide).fill(p.plateKg))
                  .map((kg, idx) => (
                    <PlateDisk key={`R-${idx}`} kg={kg} />
                  ))}
              </View>
            </View>

            {/* Tabla de discos */}
            <View style={{ gap: spacing.xs }}>
              {result.platesPerSide.length === 0 ? (
                <Text style={{ color: colors.textMuted }}>Solo barra</Text>
              ) : (
                result.platesPerSide.map((p) => (
                  <View key={p.plateKg} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: colors.text }}>{p.plateKg} kg</Text>
                    <Text style={{ color: colors.textMuted }}>×{p.perSide} por lado</Text>
                  </View>
                ))
              )}
            </View>

            {shortfall && (
              <Text style={{ color: colors.warning, fontSize: fontSize.sm }}>
                {shortfall}
              </Text>
            )}
          </>
        )}
      </View>
    </Modal>
  );
}

function PlateDisk({ kg }: { kg: number }) {
  // Altura proporcional al peso del disco (cap a 60px)
  const height = Math.min(60, 12 + kg * 1.8);
  const width = 10;

  return (
    <View
      style={{
        width,
        height,
        backgroundColor: kg >= 20 ? '#ef4444' : kg >= 10 ? '#3b82f6' : kg >= 5 ? '#22c55e' : '#a3a3a3',
        borderRadius: 2,
      }}
    />
  );
}
