import { EmptyState } from '@components/EmptyState';
import { remountKey } from '@lib/reactKeys';
import { useCurrentRoute, useRouter, useTabs } from '@lib/router';
import { useTheme } from '@lib/useTheme';
import {
  TAB_COMPONENTS,
  TAB_LABELS,
  TAB_ROUTES,
  TABS_ROUTE,
  resolveRoute,
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
      <view className="Shell">
        <view className="ShellBody">
          <Active params={route.params} />
        </view>
        <TabBar active={tab} onSelect={goToTab} />
      </view>
    );
  }

  const StackScreen = resolveRoute(route.name);

  return (
    <view className="Shell">
      <view className="ShellHeader" style={{ backgroundColor: colors.surface }}>
        <view className="BackButton" bindtap={router.back}>
          <text className="BackLabel" style={{ color: colors.primary }}>
            ‹ Atrás
          </text>
        </view>
        <text className="ShellRoute" style={{ color: colors.textMuted }}>
          {route.name}
        </text>
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

/** Tab bar inferior: las siete pestañas del registro, en fila. */
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
          <view
            className="TabButton"
            key={remountKey('tab', tab)}
            bindtap={() => onSelect(tab)}
          >
            <text
              className="TabLabel"
              style={{ color: isActive ? colors.primary : colors.textMuted }}
            >
              {TAB_LABELS[tab]}
            </text>
            <view
              className="TabMarker"
              style={{ backgroundColor: isActive ? colors.primary : 'transparent' }}
            />
          </view>
        );
      })}
    </view>
  );
}
