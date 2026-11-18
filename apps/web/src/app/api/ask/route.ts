import { NextResponse } from 'next/server';
import { api } from '@/lib/api';
import type { AskResult } from '@/lib/types';

/** The browser asks here and this server asks the API, so the API never has to be exposed to browsers. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { message?: unknown; history?: unknown; context?: unknown } | null;
  if (!body || typeof body.message !== 'string' || !body.message.trim()) return NextResponse.json({ error: 'message is required' }, { status: 400 });
  const visitor = req.headers.get('x-forwarded-for')?.split(',')[0].trim();
  try {
    const result = await api<AskResult>('/ask', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: body.message.slice(0, 600), history: body.history, context: body.context, visitor }),
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'The assistant is unavailable right now.' }, { status: 502 });
  }
}
