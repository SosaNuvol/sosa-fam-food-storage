import Constants from 'expo-constants';
import { clearTokens, loadTokens, saveTokens } from './tokenStore';
import type { TokenResponse } from './types';

// EXPO_PUBLIC_API_URL wins (set it in .env for a phone on your network); otherwise app.json extra.apiUrl.
const BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL ?? (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? 'http://localhost:5000';

export const API_URL = BASE_URL;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Listener = () => void;
let onSignedOut: Listener | null = null;

/** Called when the refresh token is rejected, so the app can return to sign-in. */
export function setSignedOutListener(listener: Listener | null) {
  onSignedOut = listener;
}

let refreshing: Promise<TokenResponse | null> | null = null;

export async function refreshTokens(): Promise<TokenResponse | null> {
  // One refresh at a time: refresh tokens work only once.
  refreshing ??= (async () => {
    const current = await loadTokens();
    if (!current) return null;
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    });
    if (!res.ok) {
      await clearTokens();
      onSignedOut?.();
      return null;
    }
    const next = (await res.json()) as TokenResponse;
    await saveTokens(next);
    return next;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function errorFrom(res: Response): Promise<ApiError> {
  let message = `Request failed (${res.status}).`;
  try {
    const body = await res.json();
    if (body?.errors) message = Object.values(body.errors as Record<string, string[]>).flat().join(' ');
    else if (body?.title) message = body.title;
  } catch {
    // not JSON
  }
  return new ApiError(res.status, message);
}

/** A current access token, refreshed if it is about to expire. For the live-update connection. */
export async function currentAccessToken(): Promise<string> {
  let tokens = await loadTokens();
  if (tokens && new Date(tokens.accessTokenExpiresAt).getTime() < Date.now() + 30_000) tokens = await refreshTokens();
  return tokens?.accessToken ?? '';
}

/** Calls the API with the stored access token, refreshing it once if it has expired. */
export async function api<T>(path: string, init: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = init;

  const send = async (token?: string) =>
    fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let tokens = auth ? await loadTokens() : null;
  if (auth && tokens && new Date(tokens.accessTokenExpiresAt).getTime() < Date.now() + 30_000) {
    tokens = await refreshTokens();
  }

  let res = await send(tokens?.accessToken);
  if (auth && res.status === 401) {
    tokens = await refreshTokens();
    if (!tokens) throw new ApiError(401, 'Please sign in again.');
    res = await send(tokens.accessToken);
  }

  if (!res.ok) throw await errorFrom(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
