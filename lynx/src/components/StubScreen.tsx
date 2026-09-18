import { Card } from '@components/Card';
import { Screen } from '@components/Screen';
import { remountKey } from '@lib/reactKeys';
import { useTheme } from '@lib/useTheme';

/**
 * Pantalla de relleno para las rutas de pila que todavía no existen.
 *
 * No es una pantalla en blanco: dice qué ruta es, de qué fase depende y con qué
 * parámetros llegó, así que navegar hasta ella es una acción con respuesta.
 */
interface StubScreenProps {
  title: string;
  note: string;
  params: Record<string, string>;
}

export function StubScreen({ title, note, params }: StubScreenProps) {
  const { colors } = useTheme();
  const keys = Object.keys(params);

  return (
    <Screen title={title} subtitle="Stub navegable">
      <Card>
        <text className="CardTitle" style={{ color: colors.text }}>
          Pantalla pendiente
        </text>
        <text className="CardBody" style={{ color: colors.textMuted }}>
          {note}
        </text>
      </Card>

      {keys.length > 0 ? (
        <Card>
          <text className="CardLabel" style={{ color: colors.textMuted }}>
            Parámetros de la ruta
          </text>
          {keys.map((key) => (
            <view className="RowBetween" key={remountKey('param', key)}>
              <text className="ListSubtitle" style={{ color: colors.textMuted }}>
                {key}
              </text>
              <text className="ListTitle" style={{ color: colors.text }}>
                {params[key]}
              </text>
            </view>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
