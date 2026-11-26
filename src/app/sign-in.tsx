import { Redirect } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text } from 'react-native';
import { Button, colors, ErrorText, Field, Muted, Screen, Title } from '../components/ui';
import { useAuth } from '../lib/auth';

export default function SignIn() {
  const { status, signIn, register } = useAuth();
  const [mode, setMode] = useState<'signIn' | 'register'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === 'signedIn') return <Redirect href="/" />;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signIn') await signIn(email.trim(), password);
      else await register(email.trim(), password, displayName.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Title>{mode === 'signIn' ? 'Welcome back' : 'Create your account'}</Title>
        <Muted>A private place for your family's important information.</Muted>
        {mode === 'register' && (
          <Field label="Your name" value={displayName} onChangeText={setDisplayName} autoComplete="name" placeholder="e.g. Andres" />
        )}
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
          placeholder={mode === 'register' ? 'At least 10 characters' : undefined}
        />
        <ErrorText message={error} />
        <Button title={mode === 'signIn' ? 'Sign in' : 'Create account'} onPress={submit} busy={busy} />
        <Pressable onPress={() => setMode(mode === 'signIn' ? 'register' : 'signIn')}>
          <Text style={{ color: colors.primary, textAlign: 'center', fontSize: 15 }}>
            {mode === 'signIn' ? 'New here? Create an account' : 'Already have an account? Sign in'}
          </Text>
        </Pressable>
      </Screen>
    </KeyboardAvoidingView>
  );
}
