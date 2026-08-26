import * as functions from 'firebase-functions';
import { db } from './admin';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

interface ChatArgs {
  model: string;
  messages: ChatMessage[];
  jsonMode?: boolean;
  maxTokens?: number;
  temperature?: number;
}

export async function chatCompletion(args: ChatArgs, apiKey: string): Promise<string> {
  const body: Record<string, unknown> = {
    model: args.model,
    messages: args.messages,
    max_tokens: args.maxTokens ?? 4096,
    temperature: args.temperature ?? 0.3,
  };
  if (args.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new functions.https.HttpsError(
      'internal',
      `OpenRouter error ${res.status}: ${text.slice(0, 500)}`
    );
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? '';
}

// BYOK: jeder Nutzer trägt eigenen OpenRouter-Key (users/{uid}.openrouterKey).
export async function getOpenRouterKey(uid: string): Promise<string> {
  const snap = await db.collection('users').doc(uid).get();
  const key = snap.data()?.openrouterKey as string | undefined;
  if (!key) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'OpenRouter-Key fehlt — bitte in den Settings hinterlegen'
    );
  }
  return key;
}

export function parseJson<T>(raw: string): T {
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new functions.https.HttpsError('internal', 'Kein JSON im Modell-Output gefunden');
  }
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}
