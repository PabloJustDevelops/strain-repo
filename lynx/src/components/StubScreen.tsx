import { Card } from '@components/Card';
import { Screen } from '@components/Screen';
import { Text } from '@components/Text';
import { remountKey } from '@lib/reactKeys';

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
  const keys = Object.keys(params);

  return (
    <Screen title={title} subtitle="Stub navegable">
      <Card>
        <Text role="title" tone="textPrimary">
          Pantalla pendiente
        </Text>
        <Text role="support" tone="textSecondary">
          {note}
        </Text>
      </Card>

      {keys.length > 0 ? (
        <Card>
          <Text role="detail" tone="textSecondary">
            Parámetros de la ruta
          </Text>
          {keys.map((key) => (
            <view className="RowBetween" key={remountKey('param', key)}>
              <Text role="support" tone="textSecondary">
                {key}
              </Text>
              <Text role="title" tone="textPrimary">
                {params[key]}
              </Text>
            </view>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
