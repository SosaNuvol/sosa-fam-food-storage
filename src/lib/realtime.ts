import { HubConnectionBuilder, HubConnectionState, LogLevel, type HubConnection } from '@microsoft/signalr';
import { useEffect, useRef } from 'react';
import { API_URL, currentAccessToken } from './api';
import type { GroceryItem, Product } from './types';

export interface HouseholdEvents {
  pantryProductUpserted?: (product: Product) => void;
  pantryProductDeleted?: (productId: string) => void;
  pantryProductsChanged?: () => void;
  pantryLocationsChanged?: () => void;
  groceryListsChanged?: () => void;
  groceryItemUpserted?: (listId: string, item: GroceryItem) => void;
  groceryItemDeleted?: (listId: string, itemId: string) => void;
  /** Called after the connection drops and comes back, so the screen can reload anything it missed. */
  reconnected?: () => void;
}

const EVENTS = [
  'pantryProductUpserted',
  'pantryProductDeleted',
  'pantryProductsChanged',
  'pantryLocationsChanged',
  'groceryListsChanged',
  'groceryItemUpserted',
  'groceryItemDeleted',
] as const;

/**
 * Listens to live changes in a household (the API's /hubs/household) while the calling screen is
 * mounted. Handlers can change between renders without reconnecting.
 */
export function useHouseholdEvents(householdId: string | undefined, events: HouseholdEvents) {
  const handlers = useRef(events);
  handlers.current = events;

  useEffect(() => {
    if (!householdId) return;
    let stopped = false;

    const connection: HubConnection = new HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/household`, { accessTokenFactory: currentAccessToken })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    for (const name of EVENTS) {
      connection.on(name, (...args: unknown[]) => {
        const handler = handlers.current[name] as ((...a: unknown[]) => void) | undefined;
        handler?.(...args);
      });
    }
    connection.onreconnected(async () => {
      await connection.invoke('JoinHousehold', householdId).catch(() => {});
      handlers.current.reconnected?.();
    });

    (async () => {
      try {
        await connection.start();
        if (stopped) return;
        await connection.invoke('JoinHousehold', householdId);
      } catch {
        // Live updates are a bonus: the screen still works with pull-to-refresh.
      }
    })();

    return () => {
      stopped = true;
      if (connection.state !== HubConnectionState.Disconnected) connection.stop();
    };
  }, [householdId]);
}
