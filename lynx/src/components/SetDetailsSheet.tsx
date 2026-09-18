import { useState } from '@lynx-js/react';

import { Card } from '@components/Card';
import { Sheet } from '@components/Sheet';
import { Button } from '@components/Button';
import { useTheme } from '@lib/useTheme';
import type { SetView } from '@db/shapes';
import { Text } from '@components/Text';

/**
 * Detalles opcionales de un set: RPE (esfuerzo percibido) y notas.
 *
 * No edita peso ni reps; eso sigue siendo el keypad. Sin drag-to-dismiss (no hay
 * gestos en Lynx), cierra con "Cancelar" o con el botón "Cerrar" del sheet; la
 * política de arrastre de `@lib/bottomSheet` queda a la espera del gesto nativo.
 *
 * El padre lo monta con `key` por set, así que el formulario arranca del set
 * recibido sin un efecto de sincronización.
 */
interface SetDetailsSheetProps {
  visible: boolean;
  set: SetView | null;
  units: 'kg' | 'lb';
  onSave: (patch: { rpe?: number | null; notes?: string | null }) => void;
  onClose: () => void;
}

const RPE_OPTIONS = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

const MAX_NOTES = 280;

export function SetDetailsSheet({ visible, set, units, onSave, onClose }: SetDetailsSheetProps) {
  const { colors } = useTheme();

  const [rpe, setRpe] = useState<number | null>(set?.rpe ?? null);
  const [notes, setNotes] = useState<string>(set?.notes ?? '');

  if (!set) return null;

  return (
    <Sheet
      visible={visible}
      title={`Detalles del set ${set.setIndex}`}
      onClose={onClose}
      footer={
        <view className="RowActions">
          <Button title="Cancelar" variant="secondary" onPress={onClose} />
          <Button
            title="Guardar"
            onPress={() => onSave({ rpe, notes: notes.trim() || null })}
          />
        </view>
      }
    >
      <Card>
        <view className="StatRow">
          <view className="Stat">
            <Text role="detail" tone="textSecondary">
              Peso
            </Text>
            <Text role="support" tone="textPrimary">
              {set.weight} {units}
            </Text>
          </view>
          <view className="Stat">
            <Text role="detail" tone="textSecondary">
              Reps
            </Text>
            <Text role="support" tone="textPrimary">
              {set.reps}
            </Text>
          </view>
          <view className="Stat">
            <Text role="detail" tone="textSecondary">
              Estado
            </Text>
            <Text
              role="support"
              tone={set.isCompleted ? 'success' : 'textSecondary'}
            >
              {set.isCompleted ? 'Completado' : 'Pendiente'}
            </Text>
          </view>
        </view>
      </Card>

      <Text role="detail" tone="textPrimary">
        RPE
      </Text>
      <view className="ChipRow">
        {RPE_OPTIONS.map((option) => {
          const selected = rpe === option;

          return (
            <view
              className="Chip"
              key={`rpe-${option}`}
              style={{
                backgroundColor: selected ? colors.accent : colors.surface,
                borderColor: selected ? colors.accent : colors.line,
              }}
              bindtap={() => setRpe(selected ? null : option)}
            >
              <Text
                role="support"
                tone={selected ? 'onAccent' : 'textPrimary'}
              >
                {option}
              </Text>
            </view>
          );
        })}
      </view>

      <Text role="detail" tone="textPrimary">
        Notas (opcional)
      </Text>
      <textarea
        className="Notes"
        style={{
          backgroundColor: colors.bg,
          borderColor: colors.line,
          color: colors.textPrimary,
        }}
        placeholder="Técnica, sensaciones, cómo te sentiste…"
        maxlength={MAX_NOTES}
        bindinput={(e) => setNotes(e.detail.value)}
      />
      <Text role="detail" tone="textSecondary">
        {notes.length}/{MAX_NOTES}
      </Text>
    </Sheet>
  );
}
