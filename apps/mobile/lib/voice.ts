import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

/** Reads an answer aloud: Hindi voice for Devanagari, Indian English otherwise. */
export function speak(text: string) {
  Speech.stop();
  Speech.speak(text.replace(/₹/g, 'rupees '), { language: /[ऀ-ॿ]/.test(text) ? 'hi-IN' : 'en-IN' });
}
export const stopSpeaking = () => { Speech.stop(); };

interface Recognition { lang: string; interimResults: boolean; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null }

/**
 * Speech-to-text. The browser has it built in, so the web build gets a real microphone button. Expo Go has no
 * speech recognition module, so on phones this returns null and the screen points people to the keyboard's
 * dictation key; a development build with a native recogniser can plug in here later.
 */
export function createListener(onText: (text: string, done: boolean) => void): { start(): void; stop(): void } | null {
  if (Platform.OS !== 'web') return null;
  const w = globalThis as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  let r: Recognition | null = null;
  return {
    start() {
      let heard = '';
      r = new Ctor();
      r.lang = 'en-IN';
      r.interimResults = true;
      r.onresult = (e) => { heard = Array.from(e.results).map((x) => x[0].transcript).join(' '); onText(heard, false); };
      r.onerror = () => onText('', true);
      r.onend = () => onText(heard, true);
      r.start();
    },
    stop() { r?.stop(); },
  };
}
