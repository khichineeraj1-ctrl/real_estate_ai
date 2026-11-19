import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';

/**
 * The buyer's sign-in on this device. The session token is kept in the phone's secure storage (the browser's own
 * storage in the web preview), so they stay signed in between launches; nothing else about them is stored here.
 */
const KEY = 'buyer_session';
let token: string | null = null;
let email: string | null = null;
let ready = false;
const listeners = new Set<() => void>();
const tell = () => listeners.forEach((l) => l());

const store = {
  get: async (): Promise<string | null> => { try { return Platform.OS === 'web' ? globalThis.localStorage?.getItem(KEY) ?? null : await SecureStore.getItemAsync(KEY); } catch { return null; } },
  set: async (v: string | null) => { try { if (Platform.OS === 'web') { if (v) globalThis.localStorage?.setItem(KEY, v); else globalThis.localStorage?.removeItem(KEY); } else if (v) await SecureStore.setItemAsync(KEY, v); else await SecureStore.deleteItemAsync(KEY); } catch { /* the session then lasts until the app closes */ } },
};
const loading = store.get().then((v) => { if (v) { try { const s = JSON.parse(v) as { token?: string; email?: string }; token = s.token ?? null; email = s.email ?? null; } catch { /* an unreadable entry is ignored */ } } ready = true; tell(); });

/** Resolves once the stored session has been read, so the first request can carry it. */
export const sessionReady = () => loading;
export const authHeader = (): Record<string, string> => (token ? { authorization: `Bearer ${token}` } : {});
export async function startSession(t: string, e: string) { token = t; email = e; tell(); await store.set(JSON.stringify({ token: t, email: e })); }
export async function endSession() { token = null; email = null; tell(); await store.set(null); }

let snapshot = { ready, signedIn: false, email: null as string | null };
const snap = () => { if (snapshot.ready !== ready || snapshot.signedIn !== !!token || snapshot.email !== email) snapshot = { ready, signedIn: !!token, email }; return snapshot; };
export const useSession = () => useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, snap, snap);
