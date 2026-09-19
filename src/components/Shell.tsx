import { EmptyState } from '@components/EmptyState';
import { Icon } from '@components/Icon';
import { Text } from '@components/Text';
import { remountKey } from '@lib/reactKeys';
import { useCurrentRoute, useRouter, useTabs } from '@lib/router';
import { FONT_FAMILY } from '@lib/theme';
import { useTheme } from '@lib/useTheme';
import {
  TAB_COMPONENTS,
  TAB_ICONS,
  TAB_LABELS,
  TAB_ROUTES,
  TABS_ROUTE,
  resolveRoute,
  routeTitle,
  tabFromParams,
  type TabRoute,
} from '@/app/routes';

/**
 * Shell de la app: decide qué se pinta a partir del tope de la pila del router.
 *
 * - `(tabs)` → la pestaña activa (params.tab) dentro del contenedor, con la tab
 *   bar abajo.
 * - cualquier otra ruta → la pantalla de pila a pantalla completa con una
 *   cabecera para volver.
 */
export function Shell() {
  const route = useCurrentRoute();
  const router = useRouter();
  const { goToTab } = useTabs();
  const { colors } = useTheme();

  if (route.name === TABS_ROUTE) {
    const tab = tabFromParams(route.params);
    const Active = TAB_COMPONENTS[tab];

    return (
      <view className="Shell" style={{ fontFamily: FONT_FAMILY }}>
        <view className="ShellBody">
          <Active params={route.params} />
        </view>
        <TabBar active={tab} onSelect={goToTab} />
      </view>
    );
  }

  const StackScreen = resolveRoute(route.name);

  return (
    <view className="Shell" style={{ fontFamily: FONT_FAMILY }}>
      <view
        className="ShellHeader"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        {/* El chevron es del set propio: antes era el glifo `‹`, que se ve
            distinto en cada plataforma. */}
        <view className="BackButton" bindtap={router.back}>
          <Icon name="chevron" size={20} tone="accent" />
          <Text role="body" tone="accent" className="BackLabel">
            Atrás
          </Text>
        </view>

        <Text role="title" tone="textPrimary" className="ShellTitle">
          {routeTitle(route.name)}
        </Text>
      </view>

      <view className="ShellBody">
        {StackScreen ? (
          <StackScreen params={route.params} />
        ) : (
          <EmptyState
            title="Ruta desconocida"
            body={`No hay ninguna pantalla registrada para "${route.name}".`}
          />
        )}
      </view>
    </view>
  );
}

/**
 * Tab bar inferior: las pestañas del registro, en fila.
 *
 * Cada pestaña es icono + etiqueta. El estado seleccionado se marca con el
 * acento **y** con el marcador de abajo: el color solo no comunica un estado.
 */
function TabBar({ active, onSelect }: { active: TabRoute; onSelect: (tab: string) => void }) {
  const { colors } = useTheme();

  return (
    <view
      className="TabBar"
      style={{ backgroundColor: colors.surface, borderColor: colors.border }}
    >
      {TAB_ROUTES.map((tab) => {
        const isActive = tab === active;

        return (
          <view className="TabButton" key={remountKey('tab', tab)} bindtap={() => onSelect(tab)}>
            <Icon name={TAB_ICONS[tab]} size={22} tone={isActive ? 'accent' : 'textSecondary'} />
            <Text role="detail" tone={isActive ? 'accent' : 'textSecondary'} className="TabLabel">
              {TAB_LABELS[tab]}
            </Text>
            <view
              className="TabMarker"
              style={{ backgroundColor: isActive ? colors.accent : 'transparent' }}
            />
          </view>
        );
      })}
    </view>
  );
}
