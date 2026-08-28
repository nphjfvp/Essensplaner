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
  imageDataUrls?: string[];
  model: string;
  visionModel: string;
  apiKey: string;
}

export async function extractRecipe(input: ExtractInput): Promise<ExtractedRecipe & { sourceUrl?: string }> {
  const { sourceType, url, text, imageDataUrls, model, visionModel, apiKey } = input;

  // 1) Blog-URL: erst Schema.org JSON-LD, sonst Seitentext ans LLM
  if (url && sourceType === 'blog') {
    const html = await fetchHtml(url);
    if (html) {
      const structured = parseJsonLd(html);
      if (structured) return { ...structured, sourceUrl: url };

      const raw = await chatCompletion(
        {
          model,
          messages: [
            { role: 'system', content: EXTRACT_PROMPT },
            { role: 'user', content: stripHtml(html).slice(0, 8000) },
          ],
          jsonMode: true,
        },
        apiKey
      );
      return { ...parseJson<ExtractedRecipe>(raw), sourceUrl: url };
    }
    throw new Error('URL nicht lesbar — bitte den Rezepttext als Text einfügen');
  }

  // Instagram/TikTok/YouTube: kein zuverlässiges Scraping
  if (url) {
    throw new Error('Diese Quelle kann nicht automatisch gelesen werden — bitte den Rezepttext einfügen');
  }

  // 2) Bild-Input: Vision-Modell (mehrere Bilder = zusammengehörige Screenshots)
  if (imageDataUrls && imageDataUrls.length > 0) {
    const raw = await chatCompletion(
      {
        model: visionModel,
        maxTokens: 12000,
        messages: [
          { role: 'system', content: EXTRACT_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extrahiere das Rezept aus diesen ${imageDataUrls.length} Bildern (zusammengehörige Screenshots).`,
              },
              ...imageDataUrls.map((u) => ({ type: 'image_url', image_url: { url: u } } as const)),
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

// Direkt versuchen; bei CORS-Fehler über freie Proxies.
async function fetchHtml(url: string): Promise<string | null> {
  const candidates = [
    url,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  ];
  for (const src of candidates) {
    try {
      const res = await fetch(src);
      if (res.ok) return await res.text();
    } catch {
      // weiter zum nächsten Kandidaten
    }
  }
  return null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseJsonLd(html: string): ExtractedRecipe | null {
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

export function mapJsonLdToRecipe(node: any): ExtractedRecipe {
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

export function parseServings(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = parseInt(value, 10);
    if (!isNaN(n)) return n;
  }
  return 4;
}

export function parseIngredient(raw: string): { name: string; amount: number; unit: string } {
  const m = raw.match(/^([\d.,/]+)\s*([a-zA-ZäöüÄÖÜß]+)?\s+(.+)$/);
  if (!m) return { name: raw.trim(), amount: 0, unit: '' };
  const amount = parseFloat(m[1].replace(',', '.'));
  return { name: m[3].trim(), amount: isNaN(amount) ? 0 : amount, unit: m[2] ?? '' };
}
