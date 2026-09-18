import { Card } from '@components/Card';
import { Screen } from '@components/Screen';
import { remountKey } from '@lib/reactKeys';
import { useTheme } from '@lib/useTheme';
import { usePreferences } from '@stores/preferencesStore';
import type { ThemeMode, Units } from '@/types/domain';
import { Text } from '@components/Text';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'system', label: 'Sistema' },
];

const UNIT_OPTIONS: { value: Units; label: string }[] = [
  { value: 'kg', label: 'Kilogramos' },
  { value: 'lb', label: 'Libras' },
];

/**
 * Ajustes sobre `preferencesStore` (persistido en la seam KV).
 *
 * Todo lo que la app Expo resolvía con native modules —notificaciones, háptics,
 * export/import, cuenta— queda fuera de esta fase: acá sólo viven las
 * preferencias reales y el cambio de tema, que sí funciona de punta a punta.
 */
export function SettingsScreen() {
  const { colors, isDark } = useTheme();

  const themeMode = usePreferences((s) => s.themeMode);
  const setThemeMode = usePreferences((s) => s.setThemeMode);
  const units = usePreferences((s) => s.units);
  const setUnits = usePreferences((s) => s.setUnits);
  const defaultRestSeconds = usePreferences((s) => s.defaultRestSeconds);
  const setDefaultRest = usePreferences((s) => s.setDefaultRest);
  const hapticsEnabled = usePreferences((s) => s.hapticsEnabled);
  const setHapticsEnabled = usePreferences((s) => s.setHapticsEnabled);
  const keepScreenAwake = usePreferences((s) => s.keepScreenAwake);
  const setKeepScreenAwake = usePreferences((s) => s.setKeepScreenAwake);

  return (
    <Screen title="Ajustes">
      <Card>
        <Text role="detail" tone="textSecondary">
          Apariencia
        </Text>
        <Segmented options={THEME_OPTIONS} value={themeMode} onChange={setThemeMode} />
        <Text role="detail" tone="textSecondary">
          {isDark ? 'Tema oscuro activo' : 'Tema claro activo'}
          {themeMode === 'system' ? ' (el sistema cae a oscuro hasta que haya bridge)' : ''}
        </Text>
      </Card>

      <Card>
        <Text role="detail" tone="textSecondary">
          Unidades
        </Text>
        <Segmented options={UNIT_OPTIONS} value={units} onChange={setUnits} />
      </Card>

      <Card>
        <Text role="detail" tone="textSecondary">
          Entrenamiento
        </Text>
        <Toggle
          label="Vibración háptica"
          value={hapticsEnabled}
          onChange={setHapticsEnabled}
        />
        <Toggle
          label="Pantalla siempre encendida"
          value={keepScreenAwake}
          onChange={setKeepScreenAwake}
        />
        <view className="RowBetween">
          <Text role="title" tone="textPrimary">
            Descanso por defecto
          </Text>
          <view className="RowActions">
            {[60, 90, 120, 180].map((seconds) => (
              <SelectChip
                key={remountKey('rest', seconds)}
                label={`${seconds}s`}
                active={defaultRestSeconds === seconds}
                onPress={() => setDefaultRest(seconds)}
              />
            ))}
          </view>
        </view>
      </Card>

      <Card>
        <Text role="title" tone="textPrimary">
          Nativo pendiente
        </Text>
        <Text role="support" tone="textSecondary">
          Recordatorios, export/import de datos, háptics reales y la cuenta con
          Supabase dependen de native modules que Lynx no trae. Sus seams existen
          (con driver nulo), pero no hay UI que las use todavía.
        </Text>
      </Card>

      <Card>
        <Text role="detail" tone="textSecondary">
          Acerca de
        </Text>
        <Text role="support" tone="textSecondary">
          Strain en Lynx · Fase 2 (router + shell + pestañas) · datos sobre seam KV
        </Text>
      </Card>
    </Screen>
  );
}

/** Fila con interruptor propio: Lynx no trae un `<Switch>`. */
function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  const { colors } = useTheme();

  return (
    <view
      className="RowBetween"
      bindtap={() => onChange(!value)}
    >
      <Text role="title" tone="textPrimary">
        {label}
      </Text>
      <view
        className="ToggleTrack"
        style={{ backgroundColor: value ? colors.accent : colors.line }}
      >
        <view
          className={value ? 'ToggleKnob ToggleKnobOn' : 'ToggleKnob'}
          style={{ backgroundColor: '#ffffff' }}
        />
      </view>
    </view>
  );
}

function SelectChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <view
      className="Chip"
      style={{
        backgroundColor: active ? colors.accent : colors.surfaceRaised,
        borderColor: active ? colors.accent : colors.line,
      }}
      bindtap={onPress}
    >
      <Text
        role="support"
        tone={active ? 'onAccent' : 'textPrimary'}
       
      >
        {label}
      </Text>
    </view>
  );
}

/** Control segmentado: la opción activa se pinta con el color primario. */
function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  const { colors } = useTheme();

  return (
    <view
      className="Segmented"
      style={{ backgroundColor: colors.bg, borderColor: colors.line }}
    >
      {options.map((option) => {
        const active = option.value === value;

        return (
          <view
            className="SegmentedItem"
            key={remountKey('theme', option.value)}
            style={{ backgroundColor: active ? colors.accent : 'transparent' }}
            bindtap={() => onChange(option.value)}
          >
            <Text
              role="support"
              tone={active ? 'onAccent' : 'textPrimary'}
            >
              {option.label}
            </Text>
          </view>
        );
      })}
    </view>
  );
}
