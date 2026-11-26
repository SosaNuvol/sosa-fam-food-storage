import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { Alert, Image, ScrollView, Text, TextInput, View } from 'react-native';
import { Chip } from '../../components/Chip';
import { StockControl } from '../../components/StockControl';
import { Button, colors, ErrorText, Muted, Title } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { amount, parseNumber, stockIn } from '../../lib/pantry';
import { useHouseholdEvents } from '../../lib/realtime';
import type { PantryLocation, Product } from '../../lib/types';
import { useStockActions } from '../../lib/usePantry';

/** One item: how much is in each location, moving it between them, and its restock levels. */
export default function ProductScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const { current } = useAuth();
  const householdId = current?.householdId;
  const [product, setProduct] = useState<Product | null>(null);
  const [locations, setLocations] = useState<PantryLocation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  const [moveTo, setMoveTo] = useState<string | null>(null);
  const [moveQty, setMoveQty] = useState('1');

  const load = useCallback(async () => {
    if (!householdId || !productId) return;
    try {
      const [p, locs] = await Promise.all([
        api<Product>(`/households/${householdId}/pantry/products/${encodeURIComponent(productId)}`),
        api<PantryLocation[]>(`/households/${householdId}/pantry/locations`),
      ]);
      setProduct(p);
      setLocations(locs);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this item.');
    }
  }, [householdId, productId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const actions = useStockActions(householdId, setProduct);
  useHouseholdEvents(householdId, {
    pantryProductUpserted: (p) => p.id === productId && setProduct(p),
    pantryProductDeleted: (id) => id === productId && router.back(),
    reconnected: load,
  });

  if (!product) {
    return (
      <View style={{ flex: 1, padding: 24, backgroundColor: '#fff' }}>
        <ErrorText message={error} />
      </View>
    );
  }

  const counted = locations.filter((l) => l.trackingMode === 'Count');
  const move = async () => {
    const qty = parseNumber(moveQty);
    if (!moveFrom || !moveTo || !qty) return setError('Pick where from, where to, and how many.');
    await actions.move(product.id, moveFrom, moveTo, qty);
  };

  const remove = () =>
    Alert.alert(`Remove ${product.name}?`, 'It disappears from every location. Its history is kept.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await api(`/households/${householdId}/pantry/products/${encodeURIComponent(product.id)}`, { method: 'DELETE' });
            router.back();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not remove it.');
          }
        },
      },
    ]);

  return (
    <ScrollView style={{ backgroundColor: '#fff' }} contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: product.name }} />
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        {product.imageUrl ? <Image source={{ uri: product.imageUrl }} style={{ width: 64, height: 64, borderRadius: 8 }} /> : null}
        <View style={{ flex: 1 }}>
          <Title>{product.name}</Title>
          <Muted>
            {amount(product.onHand, product.unit)} on hand
            {product.needsRestock && product.suggestedQuantity ? ` · buy ${amount(product.suggestedQuantity, product.unit)}` : ''}
          </Muted>
        </View>
      </View>

      <Section title="Where it is">
        {locations.map((l) => {
          const s = stockIn(product, l.id);
          return (
            <View key={l.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
              <Text style={{ fontSize: 16, color: colors.text }}>{l.name}</Text>
              <StockControl
                mode={l.trackingMode}
                quantity={s?.quantity ?? 0}
                status={s?.status ?? null}
                unit={product.unit}
                onAdjust={(d) => actions.adjust(product.id, l, d)}
                onStatus={(st) => actions.setStatus(product.id, l.id, st)}
              />
            </View>
          );
        })}
      </Section>

      {counted.length > 1 && (
        <Section title="Move">
          <Muted>From</Muted>
          <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
            {counted.map((l) => (
              <Chip key={l.id} label={`${l.name} (${amount(stockIn(product, l.id)?.quantity ?? 0)})`} selected={moveFrom === l.id} onPress={() => setMoveFrom(l.id)} />
            ))}
          </ScrollView>
          <Muted>To</Muted>
          <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
            {counted.filter((l) => l.id !== moveFrom).map((l) => (
              <Chip key={l.id} label={l.name} selected={moveTo === l.id} onPress={() => setMoveTo(l.id)} />
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TextInput
              value={moveQty}
              onChangeText={setMoveQty}
              keyboardType="decimal-pad"
              accessibilityLabel="How many to move"
              style={{ width: 80, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, fontSize: 16, color: colors.text }}
            />
            <View style={{ flex: 1 }}>
              <Button title="Move" variant="secondary" onPress={move} />
            </View>
          </View>
        </Section>
      )}

      <Section title="Restocking">
        <Detail label="Minimum" value={product.minQuantity != null ? amount(product.minQuantity, product.unit) : 'Not set'} />
        <Detail label="Target" value={product.targetQuantity != null ? amount(product.targetQuantity, product.unit) : 'Not set'} />
        <Detail label="Store" value={product.storeName ?? 'Any store'} />
        <Detail label="Fridge staple" value={product.isStaple ? 'Yes: add it when Low or Out' : 'No'} />
        {product.barcode ? <Detail label="Barcode" value={product.barcode} /> : null}
        {product.category ? <Detail label="Category" value={product.category} /> : null}
      </Section>

      <ErrorText message={error ?? actions.error} />
      <Button title="Edit details" variant="secondary" onPress={() => router.push({ pathname: '/product-form', params: { productId: product.id } })} />
      <Button title="Remove item" variant="secondary" onPress={remove} />
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{title}</Text>
      {children}
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Muted>{label}</Muted>
      <Text style={{ fontSize: 15, color: colors.text, flexShrink: 1, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}
