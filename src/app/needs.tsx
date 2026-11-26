import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, SectionList, Text, View } from 'react-native';
import { Chip } from '../components/Chip';
import { Button, colors, ErrorText, Muted } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { amount } from '../lib/pantry';
import { useHouseholdEvents } from '../lib/realtime';
import type { AddNeedsResult, GroceryList, Need } from '../lib/types';

const RESTOCK = 'Restock';

/**
 * What is running low, grouped by store, with how much to buy. Pick items and put them on a
 * family grocery list: they show up in the family app, tagged with the store.
 */
export default function Needs() {
  const { current } = useAuth();
  const householdId = current?.householdId;
  const [needs, setNeeds] = useState<Need[]>([]);
  const [lists, setLists] = useState<GroceryList[]>([]);
  const [listId, setListId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!householdId) return;
    setLoading(true);
    try {
      const [n, l] = await Promise.all([
        api<Need[]>(`/households/${householdId}/pantry/needs`),
        api<GroceryList[]>(`/households/${householdId}/grocery-lists`),
      ]);
      setNeeds(n);
      setLists(l);
      setListId((prev) => (prev && l.some((x) => x.id === prev) ? prev : (l.find((x) => x.name === RESTOCK) ?? l[0])?.id ?? null));
      // Preselect what is not on a list yet.
      setSelected(new Set(n.filter((x) => !x.onOpenList).map((x) => x.product.id)));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load what you need.');
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useHouseholdEvents(householdId, {
    pantryProductUpserted: load,
    pantryProductsChanged: load,
    groceryListsChanged: load,
    reconnected: load,
  });

  const sections = useMemo(() => {
    const byStore = new Map<string, Need[]>();
    for (const n of needs) {
      const key = n.product.storeName ?? 'Any store';
      byStore.set(key, [...(byStore.get(key) ?? []), n]);
    }
    return [...byStore.entries()]
      .sort(([a], [b]) => (a === 'Any store' ? 1 : b === 'Any store' ? -1 : a.localeCompare(b)))
      .map(([title, data]) => ({ title, data }));
  }, [needs]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const add = async () => {
    if (!householdId || selected.size === 0) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      // No list yet: make a "Restock" list for the family.
      let target = lists.find((l) => l.id === listId);
      if (!target) {
        target = await api<GroceryList>(`/households/${householdId}/grocery-lists`, { method: 'POST', body: { name: RESTOCK } });
      }
      const result = await api<AddNeedsResult>(`/households/${householdId}/pantry/needs/add-to-list`, {
        method: 'POST',
        body: { listId: target.id, productIds: [...selected] },
      });
      setMessage(
        `Added ${result.added} to ${target.name}${result.alreadyOnList ? ` (${result.alreadyOnList} already there)` : ''}. Check them off in the family app.`,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add them.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionList
      style={{ backgroundColor: '#fff' }}
      contentContainerStyle={{ padding: 20, gap: 8 }}
      sections={sections}
      keyExtractor={(n) => n.product.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={<ErrorText message={error} />}
      ListEmptyComponent={loading ? undefined : <Muted>Nothing is running low. Items show up here when they drop below their minimum.</Muted>}
      renderSectionHeader={({ section }) => (
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.muted, marginTop: 12 }}>{section.title}</Text>
      )}
      renderItem={({ item }) => {
        const p = item.product;
        const on = selected.has(p.id);
        return (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            onPress={() => toggle(p.id)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                borderWidth: 2,
                borderColor: on ? colors.primary : colors.border,
                backgroundColor: on ? colors.primary : '#fff',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {on && <Text style={{ color: '#fff', fontWeight: '700' }}>✓</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>{p.name}</Text>
              <Muted>
                {p.suggestedQuantity ? `Buy ${amount(p.suggestedQuantity, p.unit)} · ` : ''}
                {amount(p.onHand, p.unit)} on hand{item.onOpenList ? ' · already on a list' : ''}
              </Muted>
            </View>
          </Pressable>
        );
      }}
      ListFooterComponent={
        needs.length ? (
          <View style={{ gap: 10, marginTop: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Grocery list</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {lists.map((l) => (
                <Chip key={l.id} label={l.name} selected={l.id === listId} onPress={() => setListId(l.id)} />
              ))}
              {lists.length === 0 && <Muted>A "{RESTOCK}" list will be created.</Muted>}
            </ScrollView>
            <Button title={`Add ${selected.size} to the list`} onPress={add} busy={busy} />
            {message && <Muted>{message}</Muted>}
          </View>
        ) : undefined
      }
    />
  );
}
