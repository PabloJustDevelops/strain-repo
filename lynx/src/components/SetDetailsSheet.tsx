import { useState } from '@lynx-js/react';

import { Card } from '@components/Card';
import { Sheet } from '@components/Sheet';
import { Button } from '@components/Button';
import { useTheme } from '@lib/useTheme';
import type { SetView } from '@db/shapes';

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
            <text className="StatLabel" style={{ color: colors.textMuted }}>
              Peso
            </text>
            <text className="StatText" style={{ color: colors.text }}>
              {set.weight} {units}
            </text>
          </view>
          <view className="Stat">
            <text className="StatLabel" style={{ color: colors.textMuted }}>
              Reps
            </text>
            <text className="StatText" style={{ color: colors.text }}>
              {set.reps}
            </text>
          </view>
          <view className="Stat">
            <text className="StatLabel" style={{ color: colors.textMuted }}>
              Estado
            </text>
            <text
              className="StatText"
              style={{ color: set.isCompleted ? colors.success : colors.textMuted }}
            >
              {set.isCompleted ? 'Completado' : 'Pendiente'}
            </text>
          </view>
        </view>
      </Card>

      <text className="CardLabel" style={{ color: colors.text }}>
        RPE
      </text>
      <view className="ChipRow">
        {RPE_OPTIONS.map((option) => {
          const selected = rpe === option;

          return (
            <view
              className="Chip"
              key={`rpe-${option}`}
              style={{
                backgroundColor: selected ? colors.primary : colors.surface,
                borderColor: selected ? colors.primary : colors.border,
              }}
              bindtap={() => setRpe(selected ? null : option)}
            >
              <text className="ChipText" style={{ color: selected ? '#ffffff' : colors.text }}>
                {option}
              </text>
            </view>
          );
        })}
      </view>

      <text className="CardLabel" style={{ color: colors.text }}>
        Notas (opcional)
      </text>
      <textarea
        className="Notes"
        style={{
          backgroundColor: colors.background,
          borderColor: colors.border,
          color: colors.text,
        }}
        placeholder="Técnica, sensaciones, cómo te sentiste…"
        maxlength={MAX_NOTES}
        bindinput={(e) => setNotes(e.detail.value)}
      />
      <text className="Meta" style={{ color: colors.textMuted }}>
        {notes.length}/{MAX_NOTES}
      </text>
    </Sheet>
  );
}
