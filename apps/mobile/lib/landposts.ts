import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * What this person has posted from this phone. A post has no account behind it, only a private key the server gave
 * back; it is kept in the phone's secure storage so they can see its status and take it down later.
 */
const KEY = 'land_posts';
const read = async (): Promise<string[]> => {
  try { const v = Platform.OS === 'web' ? globalThis.localStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY); const a = JSON.parse(v ?? '[]') as unknown; return Array.isArray(a) ? a.filter((x): x is string => typeof x === 'string') : []; } catch { return []; }
};
const write = async (tokens: string[]) => {
  const v = JSON.stringify(tokens.slice(0, 20));
  try { if (Platform.OS === 'web') globalThis.localStorage?.setItem(KEY, v); else await SecureStore.setItemAsync(KEY, v); } catch { /* then it is remembered only until the app closes */ }
};
export const myPostTokens = read;
export const rememberPost = async (token: string) => write([token, ...(await read()).filter((t) => t !== token)]);
export const forgetPost = async (token: string) => write((await read()).filter((t) => t !== token));
