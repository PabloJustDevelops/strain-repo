import { Card } from '@components/Card';
import { Screen } from '@components/Screen';
import { remountKey } from '@lib/reactKeys';
import { useTheme } from '@lib/useTheme';
import { usePreferences } from '@stores/preferencesStore';
import type { ThemeMode, Units } from '@/types/domain';

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
        <text className="CardLabel" style={{ color: colors.textSecondary }}>
          Apariencia
        </text>
        <Segmented options={THEME_OPTIONS} value={themeMode} onChange={setThemeMode} />
        <text className="Meta" style={{ color: colors.textSecondary }}>
          {isDark ? 'Tema oscuro activo' : 'Tema claro activo'}
          {themeMode === 'system' ? ' (el sistema cae a oscuro hasta que haya bridge)' : ''}
        </text>
      </Card>

      <Card>
        <text className="CardLabel" style={{ color: colors.textSecondary }}>
          Unidades
        </text>
        <Segmented options={UNIT_OPTIONS} value={units} onChange={setUnits} />
      </Card>

      <Card>
        <text className="CardLabel" style={{ color: colors.textSecondary }}>
          Entrenamiento
        </text>
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
          <text className="ListTitle" style={{ color: colors.textPrimary }}>
            Descanso por defecto
          </text>
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
        <text className="CardTitle" style={{ color: colors.textPrimary }}>
          Nativo pendiente
        </text>
        <text className="CardBody" style={{ color: colors.textSecondary }}>
          Recordatorios, export/import de datos, háptics reales y la cuenta con
          Supabase dependen de native modules que Lynx no trae. Sus seams existen
          (con driver nulo), pero no hay UI que las use todavía.
        </text>
      </Card>

      <Card>
        <text className="CardLabel" style={{ color: colors.textSecondary }}>
          Acerca de
        </text>
        <text className="CardBody" style={{ color: colors.textSecondary }}>
          Strain en Lynx · Fase 2 (router + shell + pestañas) · datos sobre seam KV
        </text>
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
      <text className="ListTitle" style={{ color: colors.textPrimary }}>
        {label}
      </text>
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
      <text className="ChipText" style={{ color: active ? '#ffffff' : colors.textPrimary }}>
        {label}
      </text>
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
            <text
              className="SegmentedLabel"
              style={{ color: active ? '#ffffff' : colors.textPrimary }}
            >
              {option.label}
            </text>
          </view>
        );
      })}
    </view>
  );
}
