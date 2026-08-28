import { chatCompletion, parseJson } from './openrouter';
import { PANTRY_PHOTO_PROMPT } from './prompts';

// Erkennt Lebensmittel aus einem oder mehreren Fotos (Produkte oder
// Kassenzettel) via Vision-Modell — nutzt bewusst dasselbe Vision-Modell
// wie der Rezept-Bild-Import, statt eine weitere Modellauswahl einzuführen.
export async function extractPantryItems(imageDataUrls: string[], apiKey: string, model: string): Promise<string[]> {
  const raw = await chatCompletion(
    {
      model,
      maxTokens: 2000,
      messages: [
        { role: 'system', content: PANTRY_PHOTO_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Erkenne die Lebensmittel in ${imageDataUrls.length === 1 ? 'diesem Bild' : `diesen ${imageDataUrls.length} Bildern`}.`,
            },
            ...imageDataUrls.map((u) => ({ type: 'image_url', image_url: { url: u } } as const)),
          ],
        },
      ],
      jsonMode: true,
    },
    apiKey
  );
  const parsed = parseJson<{ items: string[] }>(raw);
  const seen = new Set<string>();
  const items: string[] = [];
  for (const entry of parsed.items ?? []) {
    const name = entry.trim();
    const key = name.toLowerCase();
    if (name && !seen.has(key)) {
      seen.add(key);
      items.push(name);
    }
  }
  return items;
}
