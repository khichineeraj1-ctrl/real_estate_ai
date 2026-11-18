'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { AskResult } from '@/lib/types';
import { PropertyGrid } from './PropertyCard';

interface Entry { question: string; result: AskResult | null; error?: string }

interface Props {
  /** A question already answered on the server (the /ask page), so the answer is in the HTML. */
  initial?: { question: string; result: AskResult };
  /** The place this page is about; used when a question names no place. */
  context?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

// Minimal shape of the browser speech recognition API (Chrome, Edge, Safari); not in TypeScript's DOM types.
interface Recognition { lang: string; interimResults: boolean; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null }

function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const hindi = /[ऀ-ॿ]/.test(text);
  const u = new SpeechSynthesisUtterance(text.replace(/₹/g, 'rupees '));
  u.lang = hindi ? 'hi-IN' : 'en-IN';
  const voice = synth.getVoices().find((v) => v.lang.replace('_', '-') === u.lang);
  if (voice) u.voice = voice;
  synth.speak(u);
}

export function AskBox({ initial, context, placeholder, autoFocus }: Props) {
  const [thread, setThread] = useState<Entry[]>(initial ? [initial] : []);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [canListen, setCanListen] = useState(false);
  const [listening, setListening] = useState(false);
  const [aloud, setAloud] = useState(false);
  const [voiceNote, setVoiceNote] = useState('');
  const recognition = useRef<Recognition | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    setCanListen(!!(w.SpeechRecognition ?? w.webkitSpeechRecognition));
    return () => { recognition.current?.stop(); window.speechSynthesis?.cancel(); };
  }, []);

  async function ask(question: string, spoken = false) {
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    setText('');
    const history = thread.flatMap((e) => (e.result ? [{ role: 'user', text: e.question }, { role: 'assistant', text: e.result.reply }] : []));
    setThread((t) => [...t, { question: q, result: null }]);
    let entry: Entry;
    try {
      const res = await fetch('/api/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: q, history, context }) });
      if (!res.ok) throw new Error(String(res.status));
      entry = { question: q, result: (await res.json()) as AskResult };
    } catch {
      entry = { question: q, result: null, error: 'I could not get an answer just now. Please try again.' };
    }
    setThread((t) => [...t.slice(0, -1), entry]);
    setBusy(false);
    if (entry.result && (spoken || aloud)) speak(entry.result.reply);
    requestAnimationFrame(() => end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  }

  function listen() {
    if (listening) { recognition.current?.stop(); return; }
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    window.speechSynthesis?.cancel();
    const r = new Ctor();
    r.lang = 'en-IN';
    r.interimResults = true;
    let heard = '';
    r.onresult = (e) => {
      heard = Array.from(e.results).map((x) => x[0].transcript).join(' ');
      setText(heard);
    };
    r.onerror = (e) => setVoiceNote(e.error === 'not-allowed' ? 'Microphone access is blocked for this site. Allow it in your browser to ask by voice.' : e.error === 'no-speech' ? 'I did not hear anything. Tap the mic and try again.' : '');
    r.onend = () => { setListening(false); if (heard.trim()) { setAloud(true); void ask(heard, true); } };
    recognition.current = r;
    setVoiceNote('');
    setListening(true);
    r.start();
  }

  return (
    <div className="ask">
      {thread.length > 0 && (
        <div className="thread" aria-live="polite">
          {thread.map((e, i) => (
            <div key={i} className="turn">
              <p className="you">{e.question}</p>
              {e.result ? (
                <div className="answer">
                  <p>{e.result.reply}</p>
                  {e.result.properties.length > 0 && <PropertyGrid items={e.result.properties} />}
                  {e.result.page && (
                    <p className="more"><Link href={e.result.page.path}>{e.result.total > e.result.properties.length ? `See all ${e.result.total}: ` : 'Open the page: '}{e.result.page.label} →</Link></p>
                  )}
                </div>
              ) : e.error ? <p className="answer error">{e.error}</p> : <p className="answer thinking">Looking through the listings…</p>}
            </div>
          ))}
          <div ref={end} />
        </div>
      )}
      {/* A plain GET form: without JavaScript the question goes to /ask?q=…, which answers on the server. */}
      <form action="/ask" method="get" role="search" className={`askbar ${listening ? 'is-listening' : ''}`} onSubmit={(e) => { e.preventDefault(); void ask(text); }}>
        <input
          name="q" value={text} onChange={(e) => setText(e.target.value)} autoFocus={autoFocus} maxLength={300} autoComplete="off" enterKeyHint="search"
          aria-label="Ask about homes for sale" placeholder={listening ? 'Listening…' : placeholder ?? 'Ask anything, e.g. 3 BHK in Whitefield under 1.5 crore'}
        />
        {canListen && (
          <button type="button" className="mic" onClick={listen} aria-pressed={listening} aria-label={listening ? 'Stop listening' : 'Ask by voice'} title={listening ? 'Stop listening' : 'Ask by voice'}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V22h2v-3.08A7 7 0 0 0 19 12h-2Z" /></svg>
          </button>
        )}
        <button type="submit" className="send" disabled={busy}>{busy ? '…' : 'Ask'}</button>
      </form>
      <div className="askmeta">
        {voiceNote && <span role="status">{voiceNote}</span>}
        {thread.length > 0 && (
          <label><input type="checkbox" checked={aloud} onChange={(e) => { setAloud(e.target.checked); if (!e.target.checked) window.speechSynthesis?.cancel(); }} /> Read answers aloud</label>
        )}
      </div>
    </div>
  );
}
