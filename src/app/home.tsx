import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { Chip } from '../components/Chip';
import { StockControl } from '../components/StockControl';
import { Button, colors, ErrorText, Muted, Title } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { stockIn, summary } from '../lib/pantry';
import { useHouseholdEvents } from '../lib/realtime';
import type { PantryLocation, Product } from '../lib/types';
import { upsertProduct, useStockActions } from '../lib/usePantry';

/**
 * Everything the family keeps, in every location. Pick a location to count what is there with
 * +/- (or Have / Low / Out in the fridge). Changes from other phones show up right away.
 */
export default function Home() {
  const { status, me, current, selectHousehold } = useAuth();
  const householdId = current?.householdId;
  const [locations, setLocations] = useState<PantryLocation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!householdId) return;
    setLoading(true);
    try {
      // Locations first: the first call creates Pantry, Fridge and Basement for a new family.
      const locs = await api<PantryLocation[]>(`/households/${householdId}/pantry/locations`);
      setLocations(locs);
      setProducts(await api<Product[]>(`/households/${householdId}/pantry/products`));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your food storage.');
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onUpdated = useCallback((p: Product) => setProducts((list) => upsertProduct(list, p)), []);
  const actions = useStockActions(householdId, onUpdated);

  useHouseholdEvents(householdId, {
    pantryProductUpserted: onUpdated,
    pantryProductDeleted: (id) => setProducts((list) => list.filter((p) => p.id !== id)),
    pantryProductsChanged: load,
    pantryLocationsChanged: load,
    reconnected: load,
  });

  const location = locations.find((l) => l.id === locationId) ?? null;
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        (!q || p.name.toLowerCase().includes(q) || p.barcode === q || p.category?.toLowerCase().includes(q)) &&
        // In a location, show what is there, plus everything when searching (to add it there).
        (!location || q || stockIn(p, location.id)),
    );
  }, [products, search, location]);
  const needCount = products.filter((p) => p.needsRestock).length;

  if (status === 'signedOut') return <Redirect href="/sign-in" />;
  if (status === 'signedIn' && !current) return <Redirect href="/welcome" />;
  if (!current) return null;

  return (
    <FlatList
      style={{ backgroundColor: '#fff' }}
      contentContainerStyle={{ padding: 20, gap: 10 }}
      data={shown}
      keyExtractor={(p) => p.id}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 6 }}>
          <Title>{current.householdName}</Title>
          {me && me.households.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {me.households.map((h) => (
                <Chip key={h.householdId} label={h.householdName} selected={h.householdId === current.householdId} onPress={() => selectHousehold(h.householdId)} />
              ))}
            </ScrollView>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/needs')}
            style={({ pressed }) => ({
              padding: 14,
              borderRadius: 12,
              backgroundColor: needCount ? '#FFF4E5' : colors.surface,
              borderWidth: 1,
              borderColor: needCount ? '#F5B35B' : colors.border,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>
              {needCount ? `Need to buy: ${needCount} item${needCount === 1 ? '' : 's'}` : 'Nothing running low'}
            </Text>
            <Muted>See what to buy and add it to a grocery list</Muted>
          </Pressable>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Button title="Scan" onPress={() => router.push('/scan')} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Add item" variant="secondary" onPress={() => router.push('/product-form')} />
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Chip label="Everything" selected={!locationId} onPress={() => setLocationId(null)} />
            {locations.map((l) => (
              <Chip key={l.id} label={l.name} selected={l.id === locationId} onPress={() => setLocationId(l.id)} />
            ))}
          </ScrollView>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={location ? `Search, or find something to add to ${location.name}` : 'Search'}
            placeholderTextColor={colors.muted}
            clearButtonMode="while-editing"
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, color: colors.text }}
          />
          <ErrorText message={error ?? actions.error} />
        </View>
      }
      ListEmptyComponent={
        loading ? undefined : (
          <Muted>
            {products.length === 0
              ? 'Nothing here yet. Scan a barcode or add an item to start.'
              : location && !search
                ? `Nothing in ${location.name} yet. Search for an item to add it here.`
                : 'No matches.'}
          </Muted>
        )
      }
      renderItem={({ item }) => {
        const s = location ? stockIn(item, location.id) : undefined;
        return (
          <Pressable
            onPress={() => router.push({ pathname: '/product/[productId]', params: { productId: item.id } })}
            style={({ pressed }) => ({
              padding: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: item.needsRestock ? '#F5B35B' : colors.border,
              backgroundColor: pressed ? colors.surface : '#fff',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            })}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>{item.name}</Text>
              <Muted>{item.needsRestock ? `Low · ${summary(item)}` : summary(item)}</Muted>
            </View>
            {location && (
              <StockControl
                mode={location.trackingMode}
                quantity={s?.quantity ?? 0}
                status={s?.status ?? null}
                unit={item.unit}
                onAdjust={(d) => actions.adjust(item.id, location, d)}
                onStatus={(st) => actions.setStatus(item.id, location.id, st)}
              />
            )}
          </Pressable>
        );
      }}
      ListFooterComponent={
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          <Chip label="Put away groceries" onPress={() => router.push('/put-away')} />
          <Chip label="History" onPress={() => router.push('/activity')} />
          <Chip label="Locations" onPress={() => router.push('/locations')} />
          <Chip label="Switch or join family" onPress={() => router.push('/welcome')} />
        </View>
      }
    />
  );
}
