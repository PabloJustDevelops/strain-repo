import { useEffect, useState } from '@lynx-js/react';

import { getRepos } from '@db';
import { Sheet } from '@components/Sheet';
import { equipmentLabel, muscleGroupLabel } from '@lib/labels';
import { remountKey } from '@lib/reactKeys';
import { useTheme } from '@lib/useTheme';
import type { Exercise } from '@/types/domain';

/**
 * Selector de ejercicio para el workout activo.
 *
 * Carga el catálogo al abrir (nunca durante el render) y devuelve el id del
 * elegido. Es la salida natural de un workout vacío.
 *
 * Igual que el resto de hojas: sin gestos, el cierre es explícito; y como no hay
 * `FlatList`, la lista larga va dentro de un `<scroll-view>` con alto máximo.
 */
interface ExercisePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onPick: (exerciseId: string) => void;
}

export function ExercisePickerModal({ visible, onClose, onPick }: ExercisePickerModalProps) {
  const { colors } = useTheme();

  const [items, setItems] = useState<Exercise[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;

    getRepos()
      .exercises.list()
      .then((list) => {
        if (!cancelled) setItems(list);
      });

    return () => {
      cancelled = true;
    };
  }, [visible]);

  const needle = query.trim().toLowerCase();
  const filtered = items.filter(
    (exercise) => needle.length === 0 || exercise.name.toLowerCase().includes(needle)
  );

  return (
    <Sheet
      visible={visible}
      title="Añadir ejercicio"
      onClose={() => {
        setQuery('');
        onClose();
      }}
    >
      <input
        className="Input"
        style={{ backgroundColor: colors.surface, borderColor: colors.line, color: colors.textPrimary }}
        placeholder="Buscar ejercicio"
        bindinput={(e) => setQuery(e.detail.value)}
      />

      <scroll-view className="SheetScroll" scroll-orientation="vertical">
        <view className="SheetScrollContent">
          {filtered.length === 0 ? (
            <text className="CardBody" style={{ color: colors.textSecondary }}>
              Sin resultados.
            </text>
          ) : null}

          {filtered.map((exercise) => (
            <view
              className="PickerRow"
              key={remountKey('picker', exercise.id)}
              style={{ backgroundColor: colors.bg, borderColor: colors.line }}
              bindtap={() => {
                setQuery('');
                onPick(exercise.id);
              }}
            >
              <view className="PickerBadge" style={{ backgroundColor: colors.accentSoft }}>
                <text className="PickerBadgeLabel" style={{ color: colors.accent }}>
                  +
                </text>
              </view>
              <view className="RowFill">
                <text className="ListTitle" style={{ color: colors.textPrimary }}>
                  {exercise.name}
                </text>
                <text className="ListSubtitle" style={{ color: colors.textSecondary }}>
                  {muscleGroupLabel(exercise.muscleGroup)} · {equipmentLabel(exercise.equipment)}
                </text>
              </view>
            </view>
          ))}
        </view>
      </scroll-view>
    </Sheet>
  );
}
