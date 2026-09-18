import { Input, TextArea } from '@lynx-js/lynx-ui';
import { useState } from '@lynx-js/react';

import { getRepos } from '@db';
import { Button } from '@components/Button';
import { ErrorNote } from '@components/Loading';
import { Text } from '@components/Text';
import { ROUTINE_NAME_MAX, ROUTINE_NOTE_MAX, validateRoutineName } from '@lib/routineEditor';
import { useRouter } from '@lib/router';
import { useTheme } from '@lib/useTheme';

/**
 * Creación de una rutina: nombre, nota opcional y la lista de ejercicios vacía.
 *
 * Los ejercicios se agregan después, desde el detalle: una rutina nace en blanco
 * y crece con el selector. La validación es local y muestra el motivo en la
 * pantalla (no hay `alert` en Lynx), y al crear se reemplaza la entrada de la
 * pila para que "Atrás" vuelva a la lista y no al formulario.
 */
export function RoutineNewScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    const message = validateRoutineName(name);

    if (message) {
      setError(message);

      return;
    }

    setError(null);
    setSaving(true);

    try {
      const routine = await getRepos().routines.create({
        name: name.trim(),
        description: note.trim() || undefined,
      });

      router.replace('routines/[id]', { id: routine.id });
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  }

  return (
    <view className="Screen" style={{ backgroundColor: colors.bg }}>
      <scroll-view className="ScreenScroll" scroll-orientation="vertical">
        <view className="ScreenContent">
          <view className="Editor">
            <view className="Field">
              <Text role="detail" tone="textPrimary">
                Nombre
              </Text>
              <Input
                className="Input FieldControl"
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.line,
                  color: colors.textPrimary,
                }}
                placeholder="Ej. Empuje A"
                value={name}
                onInput={(value) => {
                  setName(value);
                  if (error) setError(null);
                }}
              />
              <Text role="detail" tone="textSecondary">
                {name.trim().length}/{ROUTINE_NAME_MAX}
              </Text>
            </view>

            <view className="Field">
              <Text role="detail" tone="textPrimary">
                Nota (opcional)
              </Text>
              <TextArea
                className="Notes FieldControl"
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.line,
                  color: colors.textPrimary,
                }}
                placeholder="Para qué sirve esta rutina"
                maxLength={ROUTINE_NOTE_MAX}
                value={note}
                onInput={(value) => setNote(value)}
              />
              <Text role="detail" tone="textSecondary">
                {note.length}/{ROUTINE_NOTE_MAX}
              </Text>
            </view>

            {error ? <ErrorNote message={error} /> : null}

            <view className="Field">
              <Button
                title={saving ? 'Creando…' : 'Crear rutina'}
                fullWidth
                disabled={saving}
                onPress={handleCreate}
              />
            </view>
          </view>
        </view>
      </scroll-view>
    </view>
  );
}
