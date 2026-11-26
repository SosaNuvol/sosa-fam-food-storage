import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text } from 'react-native';
import { colors, ErrorText, Muted } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { amount } from '../lib/pantry';
import type { Activity } from '../lib/types';

function describe(a: Activity): string {
  switch (a.changeType) {
    case 'Status':
      return `${a.locationName}: ${a.statusAfter}`;
    case 'MoveIn':
    case 'MoveOut':
      return `${a.note ?? 'Moved'} · ${a.locationName} now ${amount(a.quantityAfter)}`;
    case 'PutAway':
      return a.statusAfter ? `Put away in ${a.locationName}` : `Put away ${amount((a.quantityAfter ?? 0) - (a.quantityBefore ?? 0))} in ${a.locationName}`;
    default:
      return `${a.locationName}: ${amount(a.quantityBefore)} → ${amount(a.quantityAfter)}`;
  }
}

/** Who changed what, newest first. */
export default function ActivityScreen() {
  const { current } = useAuth();
  const householdId = current?.householdId;
  const [rows, setRows] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!householdId) return;
    setLoading(true);
    try {
      setRows(await api<Activity[]>(`/households/${householdId}/pantry/activity?take=100`));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the history.');
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <FlatList
      style={{ backgroundColor: '#fff' }}
      contentContainerStyle={{ padding: 20, gap: 8 }}
      data={rows}
      keyExtractor={(a, i) => `${a.at}-${i}`}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      ListHeaderComponent={<ErrorText message={error} />}
      ListEmptyComponent={loading ? undefined : <Muted>No changes yet.</Muted>}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push({ pathname: '/product/[productId]', params: { productId: item.productId } })}
          style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{item.productName}</Text>
          <Muted>{describe(item)}</Muted>
          <Muted>
            {item.byName ?? 'Someone'} · {new Date(item.at).toLocaleString()}
          </Muted>
        </Pressable>
      )}
    />
  );
}
