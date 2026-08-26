import * as functions from 'firebase-functions';
import { chatCompletion, getOpenRouterKey, parseJson } from './_shared/openrouter';
import { DEFAULT_MODELS } from './_shared/models';
import { EXTRACT_PROMPT } from './_shared/prompts';

export interface ExtractedRecipe {
  title: string;
  servings: number;
  ingredients: { name: string; amount: number; unit: string }[];
  steps: string[];
}

export const extractRecipe = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Nicht eingeloggt');

  const sourceType: string = data.sourceType ?? 'manual';
  const url: string | undefined = data.url;
  const text: string | undefined = data.text;
  const imageDataUrl: string | undefined = data.imageDataUrl;
  const model: string = data.model ?? DEFAULT_MODELS.extract;

  // 1) Blog-URL: erst Schema.org JSON-LD versuchen (kein API-Key nötig)
  if (url && (sourceType === 'blog' || sourceType === 'unknown')) {
    const structured = await tryJsonLd(url);
    if (structured) {
      return { ...structured, sourceUrl: url, sourceType };
    }
  }

  const key = await getOpenRouterKey(uid);

  // 2) Bild-Input: Vision-Modell
  if (imageDataUrl) {
    const raw = await chatCompletion(
      {
        model: data.model ?? DEFAULT_MODELS.vision,
        messages: [
          { role: 'system', content: EXTRACT_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extrahiere das Rezept aus diesem Bild.' },
              { type: 'image_url', image_url: { url: imageDataUrl } },
            ],
          },
        ],
        jsonMode: true,
      },
      key
    );
    return { ...parseJson<ExtractedRecipe>(raw), sourceUrl: url, sourceType };
  }

  // 3) Text (Caption / Transcript / manuell)
  if (text) {
    const raw = await chatCompletion(
      {
        model,
        messages: [
          { role: 'system', content: EXTRACT_PROMPT },
          { role: 'user', content: text },
        ],
        jsonMode: true,
      },
      key
    );
    return { ...parseJson<ExtractedRecipe>(raw), sourceUrl: url, sourceType };
  }

  throw new functions.https.HttpsError('invalid-argument', 'Keine Quelle angegeben (url/text/image)');
});

async function tryJsonLd(url: string): Promise<ExtractedRecipe | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'EssensplanerBot/1.0' } });
    if (!res.ok) return null;
    const html = await res.text();

    const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let m: RegExpExecArray | null;
    while ((m = scriptRegex.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(m[1]);
        const nodes = Array.isArray(parsed) ? parsed : [parsed];
        for (const node of nodes) {
          const type = node['@type'];
          const isRecipe = type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'));
          if (isRecipe) return mapJsonLdToRecipe(node);
        }
      } catch {
        // kaputtes JSON-Block überspringen
      }
    }
    return null;
  } catch {
    return null;
  }
}

function mapJsonLdToRecipe(node: any): ExtractedRecipe {
  const ingredients = (node.recipeIngredient ?? []).map((ing: string) => parseIngredient(ing));
  const steps = (node.recipeInstructions ?? [])
    .map((s: any) => (typeof s === 'string' ? s : s.text ?? ''))
    .filter((s: string) => s);
  return {
    title: node.name ?? '',
    servings: parseServings(node.recipeYield),
    ingredients,
    steps,
  };
}

function parseServings(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = parseInt(value, 10);
    if (!isNaN(n)) return n;
  }
  return 4;
}

function parseIngredient(raw: string): { name: string; amount: number; unit: string } {
  const m = raw.match(/^([\d.,/]+)\s*([a-zA-ZäöüÄÖÜß]+)?\s+(.+)$/);
  if (!m) return { name: raw.trim(), amount: 0, unit: '' };
  const amount = parseFloat(m[1].replace(',', '.'));
  return { name: m[3].trim(), amount: isNaN(amount) ? 0 : amount, unit: m[2] ?? '' };
}
