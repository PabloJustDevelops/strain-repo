import { useState } from '@lynx-js/react';

import { Sheet } from '@components/Sheet';
import { formatWeight } from '@lib/format';
import {
  backspace,
  initialKeypadState,
  keypadDisplay,
  keypadValue,
  pressDecimal,
  pressDigit,
  quickPickState,
  stepKeypadValue,
  type KeypadField,
} from '@lib/keypad';
import { oneRmPreview } from '@lib/metrics';
import { useTheme } from '@lib/useTheme';
import { Text } from '@components/Text';

/**
 * Teclado numérico para introducir peso o reps en el workout activo.
 *
 * Todo el estado del valor es el buffer de `@lib/keypad`: lo que se muestra y lo
 * que se confirma salen del mismo lugar, así que no pueden divergir (era el
 * known-issue K de la app Expo). El 1RM estimado en vivo usa `oneRmPreview`, la
 * misma fórmula que deciden los PRs.
 *
 * Sin háptica (native module) y sin animación del número (`reanimated`): la
 * señal de que el valor cambió es el número mismo.
 *
 * El padre lo monta con `key` por set+campo (`remountKey`), así que el buffer
 * arranca del set cada vez y no hace falta sincronizarlo con un efecto.
 */
interface NumericKeypadProps {
  visible: boolean;
  initialValue: number;
  field: KeypadField;
  units: 'kg' | 'lb';
  previousValue?: number | null;
  /** Peso ya introducido del set; alimenta el 1RM en vivo en el paso de reps. */
  previewWeight?: number | null;
  onConfirm: (value: number) => void;
  onCancel: () => void;
}

const WEIGHT_STEP_LARGE = 5;
const WEIGHT_STEP_SMALL = 2.5;
const REPS_STEP = 1;

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function NumericKeypad({
  visible,
  initialValue,
  field,
  units,
  previousValue,
  previewWeight,
  onConfirm,
  onCancel,
}: NumericKeypadProps) {
  const { colors } = useTheme();
  const [state, setState] = useState(initialKeypadState(initialValue, field));

  const display = keypadDisplay(state, field);
  const stepLarge = field === 'weight' ? WEIGHT_STEP_LARGE : REPS_STEP * 5;
  const oneRm =
    field === 'reps' && previewWeight != null ? oneRmPreview(previewWeight, keypadValue(state)) : null;
  const label = field === 'weight' ? `Peso (${units})` : 'Repeticiones';

  return (
    <Sheet
      visible={visible}
      title={label}
      onClose={onCancel}
      footer={
        <view className="RowActions">
          <view
            className="KeypadConfirm"
            style={{ backgroundColor: colors.success }}
            bindtap={() => onConfirm(keypadValue(state))}
          >
            <Text role="title" tone="onAccent">Confirmar</Text>
          </view>
        </view>
      }
    >
      <view className="KeypadDisplay">
        <Text role="display" tone="textPrimary">
          {display}
        </Text>
        {field === 'weight' ? (
          <Text role="title" tone="textSecondary">
            {units}
          </Text>
        ) : null}
        {oneRm !== null ? (
          <Text role="detail" tone="textSecondary">
            1RM estimado {formatWeight(oneRm, units)}
          </Text>
        ) : null}
      </view>

      <view className="KeypadSteps">
        <StepButton label={`−${stepLarge}`} onPress={() => setState((s) => stepKeypadValue(s, -stepLarge))} />
        {field === 'weight' ? (
          <StepButton
            label={`−${WEIGHT_STEP_SMALL}`}
            onPress={() => setState((s) => stepKeypadValue(s, -WEIGHT_STEP_SMALL))}
          />
        ) : null}
        {field === 'weight' ? (
          <StepButton
            label={`+${WEIGHT_STEP_SMALL}`}
            onPress={() => setState((s) => stepKeypadValue(s, WEIGHT_STEP_SMALL))}
          />
        ) : null}
        <StepButton label={`+${stepLarge}`} onPress={() => setState((s) => stepKeypadValue(s, stepLarge))} />
      </view>

      {previousValue != null && previousValue > 0 ? (
        <view
          className="KeypadQuickPick"
          style={{ backgroundColor: colors.surface, borderColor: colors.line }}
          bindtap={() => setState(quickPickState(previousValue, field))}
        >
          <Text role="detail" tone="textSecondary">
            Anterior: {previousValue}
          </Text>
        </view>
      ) : null}

      <view className="KeypadGrid">
        {DIGITS.slice(0, 3).map((digit) => (
          <Key
            key={digit}
            label={digit}
            onPress={() => setState((s) => pressDigit(s, digit, field))}
          />
        ))}
        <Key label="⌫" muted onPress={() => setState(backspace)} />

        {DIGITS.slice(3, 6).map((digit) => (
          <Key
            key={digit}
            label={digit}
            onPress={() => setState((s) => pressDigit(s, digit, field))}
          />
        ))}
        <Key label="0" onPress={() => setState((s) => pressDigit(s, '0', field))} />

        {DIGITS.slice(6, 9).map((digit) => (
          <Key
            key={digit}
            label={digit}
            onPress={() => setState((s) => pressDigit(s, digit, field))}
          />
        ))}
        {field === 'weight' ? (
          <Key label="." muted onPress={() => setState((s) => pressDecimal(s, field))} />
        ) : null}
      </view>
    </Sheet>
  );
}

function Key({
  label,
  muted = false,
  onPress,
}: {
  label: string;
  muted?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <view
      className="KeypadKey"
      style={{
        backgroundColor: muted ? colors.surface : colors.bg,
        borderColor: colors.line,
      }}
      bindtap={onPress}
    >
      <Text role="heading" tone="textPrimary">
        {label}
      </Text>
    </view>
  );
}

function StepButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();

  return (
    <view
      className="KeypadStep"
      style={{ backgroundColor: colors.surface, borderColor: colors.line }}
      bindtap={onPress}
    >
      <Text role="support" tone="textPrimary">
        {label}
      </Text>
    </view>
  );
}
