import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const BRAND = Constants.expoConfig?.name ?? 'HomeAsk';
const PORT = 4100;

/** In development the API runs on the same machine as Metro, so a phone on the same wifi reaches it at Metro's address. */
function resolveApiUrl(): string {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env) return env.replace(/\/$/, '');
  if (Platform.OS === 'web') return `http://localhost:${PORT}`;
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host && host !== 'localhost' && host !== '127.0.0.1') return `http://${host}:${PORT}`;
  return Platform.OS === 'android' ? `http://10.0.2.2:${PORT}` : `http://localhost:${PORT}`;
}
export const API_URL = resolveApiUrl();
