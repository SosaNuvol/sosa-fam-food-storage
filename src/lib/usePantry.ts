import { useCallback, useState } from 'react';
import { api } from './api';
import type { PantryLocation, Product, StockStatus } from './types';

/** Stock writes shared by the screens. Each returns the updated product. */
export function useStockActions(householdId: string | undefined, onUpdated: (p: Product) => void) {
  const [error, setError] = useState<string | null>(null);
  const base = `/households/${householdId}/pantry/products`;

  const run = useCallback(
    async (call: () => Promise<Product>) => {
      try {
        onUpdated(await call());
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not update the stock.');
      }
    },
    [onUpdated],
  );

  return {
    error,
    adjust: (productId: string, loc: PantryLocation | { id: string }, delta: number) =>
      run(() => api<Product>(`${base}/${encodeURIComponent(productId)}/stock/${encodeURIComponent(loc.id)}/adjust`, { method: 'POST', body: { delta } })),
    setQuantity: (productId: string, locationId: string, quantity: number) =>
      run(() => api<Product>(`${base}/${encodeURIComponent(productId)}/stock/${encodeURIComponent(locationId)}`, { method: 'PUT', body: { quantity } })),
    setStatus: (productId: string, locationId: string, status: StockStatus) =>
      run(() => api<Product>(`${base}/${encodeURIComponent(productId)}/stock/${encodeURIComponent(locationId)}`, { method: 'PUT', body: { status } })),
    move: (productId: string, fromLocationId: string, toLocationId: string, quantity: number) =>
      run(() => api<Product>(`${base}/${encodeURIComponent(productId)}/move`, { method: 'POST', body: { fromLocationId, toLocationId, quantity } })),
  };
}

/** Replaces or appends a product in a list, keeping it sorted by name. */
export function upsertProduct(list: Product[], p: Product): Product[] {
  const next = list.some((x) => x.id === p.id) ? list.map((x) => (x.id === p.id ? p : x)) : [...list, p];
  return next.sort((a, b) => a.name.localeCompare(b.name));
}
