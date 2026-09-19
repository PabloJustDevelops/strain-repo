import { Text } from '@components/Text';

/**
 * Cifra con su etiqueta y su unidad.
 *
 * La unidad va como campo y no pegada al valor porque tiene otro rol
 * tipográfico: `128` se lee grande y `kg` chico al lado. Sin esto cada pantalla
 * inventaba el par valor/unidad y el número terminaba escribiéndose a mano.
 */
interface StatBlockProps {
  /** Qué mide la cifra. */
  label: string;
  /** La cifra, ya formateada. */
  value: string;
  /** Unidad del valor (`kg`, `lb`, `s`). Opcional. */
  unit?: string;
}

export function StatBlock({ label, value, unit }: StatBlockProps) {
  return (
    <view className="StatBlock">
      <Text role="detail" tone="textSecondary" className="StatBlockLabel">
        {label}
      </Text>
      <view className="StatBlockValue">
        <Text role="title" tone="textPrimary" className="StatBlockNumber">
          {value}
        </Text>
        {unit ? (
          <Text role="support" tone="textSecondary" className="StatBlockUnit">
            {unit}
          </Text>
        ) : null}
      </view>
    </view>
  );
}
