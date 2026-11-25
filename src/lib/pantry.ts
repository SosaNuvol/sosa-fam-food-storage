import type { Product, Stock } from './types';

/** 2 -> "2", 2.5 -> "2.5", with the unit when there is one. */
export function amount(quantity: number | null | undefined, unit?: string | null): string {
  if (quantity == null) return unit ?? '';
  const n = Number(quantity);
  const text = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return unit ? `${text} ${unit}` : text;
}

/** One line for a product: "7 lb · min 10" or "Fridge: Low". */
export function summary(p: Product): string {
  const parts: string[] = [];
  if (p.stock.some((s) => s.trackingMode === 'Count') || p.minQuantity != null) parts.push(`${amount(p.onHand, p.unit)} on hand`);
  for (const s of p.stock) if (s.trackingMode === 'Status' && s.status) parts.push(`${s.locationName}: ${s.status}`);
  if (p.minQuantity != null) parts.push(`min ${amount(p.minQuantity)}`);
  return parts.join(' · ') || 'Not stocked yet';
}

export function stockIn(p: Product, locationId: string): Stock | undefined {
  return p.stock.find((s) => s.locationId === locationId);
}

/** "12.5" -> 12.5, "" -> null, "abc" -> undefined (invalid). */
export function parseNumber(text: string): number | null | undefined {
  const t = text.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export interface BarcodeInfo {
  name: string;
  imageUrl: string | null;
  category: string | null;
}

/**
 * Looks a barcode up in Open Food Facts (a free, open product database). Only the barcode is
 * sent. Returns null when it is unknown or the lookup fails: the person types the name instead.
 */
export async function lookupBarcode(barcode: string): Promise<BarcodeInfo | null> {
  if (!/^\d{6,14}$/.test(barcode)) return null;
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,brands,image_front_small_url,categories`,
      { headers: { 'User-Agent': 'SosaPantry/1.0' } },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      status?: number;
      product?: { product_name?: string; brands?: string; image_front_small_url?: string; categories?: string };
    };
    const p = body.product;
    if (body.status !== 1 || !p?.product_name) return null;
    const brand = p.brands?.split(',')[0]?.trim();
    const name = brand && !p.product_name.toLowerCase().includes(brand.toLowerCase()) ? `${brand} ${p.product_name}` : p.product_name;
    const image = p.image_front_small_url?.startsWith('https://') ? p.image_front_small_url : null;
    return { name: name.slice(0, 120), imageUrl: image, category: p.categories?.split(',')[0]?.trim().slice(0, 60) || null };
  } catch {
    return null;
  }
}
