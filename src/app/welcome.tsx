import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, ErrorText, Field, Muted, Screen, Title } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Household } from '../lib/types';

/** Create a new family, or join one with an invite code. */
export default function Welcome() {
  const { status, me, refresh, signOut } = useAuth();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (status === 'signedOut') return <Redirect href="/sign-in" />;

  const run = async (kind: 'create' | 'join') => {
    setBusy(kind);
    setError(null);
    try {
      const household =
        kind === 'create'
          ? await api<Household>('/households', { method: 'POST', body: { name: name.trim() } })
          : await api<Household>('/invites/accept', { method: 'POST', body: { code: code.trim() } });
      await refresh(household.id);
      router.replace('/home');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
      <Screen>
        <Title>Hi{me?.displayName ? `, ${me.displayName}` : ''}</Title>
        <Muted>Join your family with the code someone sent you, or start a new family.</Muted>

        <Field label="Invite code" value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="K7QM-2XPA" />
        <Button title="Join family" onPress={() => run('join')} busy={busy === 'join'} />

        <View style={{ height: 16 }} />

        <Field label="New family name" value={name} onChangeText={setName} placeholder="The Sosa Family" />
        <Button title="Create family" variant="secondary" onPress={() => run('create')} busy={busy === 'create'} />

        <ErrorText message={error} />

        {me?.households.length ? (
          <Button title="Back to my family" variant="secondary" onPress={() => router.replace('/home')} />
        ) : (
          <Button title="Sign out" variant="secondary" onPress={signOut} />
        )}
      </Screen>
    </ScrollView>
  );
}
