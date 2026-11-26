import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Chip } from '../components/Chip';
import { Button, colors, ErrorText, Muted } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { amount } from '../lib/pantry';
import type { GroceryItem, GroceryList, GroceryListDetail, PantryLocation, Product } from '../lib/types';

/**
 * After shopping: items checked off in the family app that came from the pantry go into a
 * location here, which adds them to the counts.
 */
export default function PutAway() {
  const { current } = useAuth();
  const householdId = current?.householdId;
  const [lists, setLists] = useState<GroceryList[]>([]);
  const [listId, setListId] = useState<string | null>(null);
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [locations, setLocations] = useState<PantryLocation[]>([]);
  const [done, setDone] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(
    async (id: string | null) => {
      if (!householdId || !id) return setItems([]);
      const detail = await api<GroceryListDetail>(`/households/${householdId}/grocery-lists/${id}`);
      setItems(detail.items.filter((i) => i.isChecked && i.productId));
    },
    [householdId],
  );

  const load = useCallback(async () => {
    if (!householdId) return;
    setLoading(true);
    try {
      const [l, locs] = await Promise.all([
        api<GroceryList[]>(`/households/${householdId}/grocery-lists`),
        api<PantryLocation[]>(`/households/${householdId}/pantry/locations`),
      ]);
      setLists(l);
      setLocations(locs);
      const id = listId && l.some((x) => x.id === listId) ? listId : l[0]?.id ?? null;
      setListId(id);
      await loadItems(id);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the lists.');
    } finally {
      setLoading(false);
    }
  }, [householdId, listId, loadItems]);

  useFocusEffect(
    useCallback(() => {
      load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [householdId]),
  );

  const putAway = async (item: GroceryItem, loc: PantryLocation) => {
    try {
      await api<Product>(`/households/${householdId}/pantry/put-away`, {
        method: 'POST',
        body: { groceryItemId: item.id, locationId: loc.id },
      });
      // Off the list once it is put away, so it cannot be counted twice.
      await api(`/households/${householdId}/grocery-lists/${item.listId}/items/${item.id}`, { method: 'DELETE' }).catch(() => {});
      setDone((d) => ({ ...d, [item.id]: loc.name }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not put it away.');
    }
  };

  return (
    <FlatList
      style={{ backgroundColor: '#fff' }}
      contentContainerStyle={{ padding: 20, gap: 10 }}
      data={items}
      keyExtractor={(i) => i.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      ListHeaderComponent={
        <View style={{ gap: 10 }}>
          <Muted>Pantry items checked off on a grocery list. Tap where each one goes: it is added to that location and taken off the list.</Muted>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {lists.map((l) => (
              <Chip
                key={l.id}
                label={l.name}
                selected={l.id === listId}
                onPress={() => {
                  setListId(l.id);
                  loadItems(l.id).catch(() => {});
                }}
              />
            ))}
          </ScrollView>
          <ErrorText message={error} />
        </View>
      }
      ListEmptyComponent={loading ? undefined : <Muted>Nothing checked off on this list came from the pantry yet.</Muted>}
      renderItem={({ item }) => (
        <View style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, gap: 8 }}>
          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>
            {item.name}
            {item.quantity != null ? ` · ${amount(item.quantity, item.unit)}` : ''}
          </Text>
          {done[item.id] ? (
            <Muted>Put away in {done[item.id]} and taken off the list.</Muted>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {locations.map((l) => (
                <Chip key={l.id} label={l.name} onPress={() => putAway(item, l)} />
              ))}
            </View>
          )}
        </View>
      )}
    />
  );
}
