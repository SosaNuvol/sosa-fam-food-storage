import * as SecureStore from 'expo-secure-store';
import type { TokenResponse } from './types';

// Tokens live in the iOS Keychain / Android Keystore, never in plain storage.
const KEY = 'sosafam.tokens';

export async function loadTokens(): Promise<TokenResponse | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TokenResponse;
  } catch {
    await SecureStore.deleteItemAsync(KEY);
    return null;
  }
}

export async function saveTokens(tokens: TokenResponse): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(tokens));
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}
