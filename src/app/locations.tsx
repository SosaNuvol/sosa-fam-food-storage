import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { Chip } from '../components/Chip';
import { Button, colors, ErrorText, Field, Muted } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { PantryLocation, TrackingMode } from '../lib/types';

/** Where food is kept. Counted places keep exact numbers; the fridge keeps Have / Low / Out. */
export default function Locations() {
  const { current } = useAuth();
  const householdId = current?.householdId;
  const canRemove = current?.role === 'Owner' || current?.role === 'Adult';
  const [locations, setLocations] = useState<PantryLocation[]>([]);
  const [name, setName] = useState('');
  const [mode, setMode] = useState<TrackingMode>('Count');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!householdId) return;
    try {
      setLocations(await api<PantryLocation[]>(`/households/${householdId}/pantry/locations`));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the locations.');
    }
  }, [householdId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api(`/households/${householdId}/pantry/locations`, { method: 'POST', body: { name: name.trim(), trackingMode: mode } });
      setName('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add it.');
    } finally {
      setBusy(false);
    }
  };

  const remove = (l: PantryLocation) =>
    Alert.alert(`Remove ${l.name}?`, 'Everything counted there is cleared. The history is kept.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await api(`/households/${householdId}/pantry/locations/${encodeURIComponent(l.id)}`, { method: 'DELETE' });
            await load();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not remove it.');
          }
        },
      },
    ]);

  return (
    <FlatList
      style={{ backgroundColor: '#fff' }}
      contentContainerStyle={{ padding: 20, gap: 10 }}
      data={locations}
      keyExtractor={(l) => l.id}
      keyboardShouldPersistTaps="handled"
      renderItem={({ item }) => (
        <Pressable
          onLongPress={canRemove ? () => remove(item) : undefined}
          style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}
        >
          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>{item.name}</Text>
          <Muted>{item.trackingMode === 'Count' ? 'Counted' : 'Have / Low / Out'}</Muted>
        </Pressable>
      )}
      ListFooterComponent={
        <View style={{ gap: 10, marginTop: 16 }}>
          {canRemove && <Muted>Long-press a location to remove it.</Muted>}
          <Field label="New location" value={name} onChangeText={setName} placeholder="Garage freezer" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip label="Count items" selected={mode === 'Count'} onPress={() => setMode('Count')} />
            <Chip label="Have / Low / Out" selected={mode === 'Status'} onPress={() => setMode('Status')} />
          </View>
          <Button title="Add location" onPress={add} busy={busy} />
          <ErrorText message={error} />
        </View>
      }
    />
  );
}
