import { chatCompletion, parseJson } from './openrouter';
import { EXTRACT_PROMPT } from './prompts';
import type { SourceType } from './types';

export interface ExtractedRecipe {
  title: string;
  servings: number;
  ingredients: { name: string; amount: number; unit: string }[];
  steps: string[];
}

export interface ExtractInput {
  sourceType: SourceType;
  url?: string;
  text?: string;
  imageDataUrl?: string;
  model: string;
  visionModel: string;
  apiKey: string;
}

export async function extractRecipe(input: ExtractInput): Promise<ExtractedRecipe & { sourceUrl?: string }> {
  const { sourceType, url, text, imageDataUrl, model, visionModel, apiKey } = input;

  // 1) Blog-URL: erst Schema.org JSON-LD versuchen (kein API-Key nötig)
  if (url && sourceType === 'blog') {
    const structured = await tryJsonLd(url);
    if (structured) return { ...structured, sourceUrl: url };
  }

  // 2) Bild-Input: Vision-Modell
  if (imageDataUrl) {
    const raw = await chatCompletion(
      {
        model: visionModel,
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
      apiKey
    );
    return { ...parseJson<ExtractedRecipe>(raw), sourceUrl: url };
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
      apiKey
    );
    return { ...parseJson<ExtractedRecipe>(raw), sourceUrl: url };
  }

  throw new Error('Keine Quelle angegeben (url/text/image)');
}

async function tryJsonLd(url: string): Promise<ExtractedRecipe | null> {
  // Direkt versuchen; bei CORS-Fehler über freien Proxy.
  const candidates = [url, `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`];
  for (const src of candidates) {
    const html = await fetchText(src);
    if (!html) continue;
    const recipe = parseJsonLd(html);
    if (recipe) return recipe;
  }
  return null;
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function parseJsonLd(html: string): ExtractedRecipe | null {
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
      // kaputtes JSON überspringen
    }
  }
  return null;
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
