import { Input } from '@lynx-js/lynx-ui';
import { useEffect, useState } from '@lynx-js/react';

import { getRepos } from '@db';
import { Sheet } from '@components/Sheet';
import { Text } from '@components/Text';
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
 * La lista larga va dentro de un `<scroll-view>` con alto máximo: sigue sin
 * haber `FlatList`, pero la hoja ya trae el gesto de arrastre de lynx-ui.
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
      <Input
        className="Input"
        style={{ backgroundColor: colors.surface, borderColor: colors.line, color: colors.textPrimary }}
        placeholder="Buscar ejercicio"
        confirmType="search"
        value={query}
        onInput={(value) => setQuery(value)}
      />

      <scroll-view className="SheetScroll" scroll-orientation="vertical">
        <view className="SheetScrollContent">
          {filtered.length === 0 ? (
            <Text role="support" tone="textSecondary">
              Sin resultados.
            </Text>
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
                <Text role="heading" tone="accent">
                  +
                </Text>
              </view>
              <view className="RowFill">
                <Text role="title" tone="textPrimary">
                  {exercise.name}
                </Text>
                <Text role="support" tone="textSecondary">
                  {muscleGroupLabel(exercise.muscleGroup)} · {equipmentLabel(exercise.equipment)}
                </Text>
              </view>
            </view>
          ))}
        </view>
      </scroll-view>
    </Sheet>
  );
}
