import { describe, expect, it, vi } from 'vitest';

vi.mock('./openrouter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./openrouter')>();
  return { ...actual, chatCompletion: vi.fn() };
});

import { chatCompletion } from './openrouter';
import { extractRecipe, mapJsonLdToRecipe, parseIngredient, parseJsonLd, parseServings } from './extract';

describe('parseIngredient', () => {
  it('parses "amount unit name"', () => {
    expect(parseIngredient('200 g Mehl')).toEqual({ name: 'Mehl', amount: 200, unit: 'g' });
  });

  it('parses German decimal commas', () => {
    expect(parseIngredient('1,5 l Wasser')).toEqual({ name: 'Wasser', amount: 1.5, unit: 'l' });
  });

  it('falls back to the raw string when there is no amount', () => {
    expect(parseIngredient('Salz nach Geschmack')).toEqual({ name: 'Salz nach Geschmack', amount: 0, unit: '' });
  });

  it('handles a missing unit (amount directly followed by name)', () => {
    expect(parseIngredient('3 Eier')).toEqual({ name: 'Eier', amount: 3, unit: '' });
  });
});

describe('parseServings', () => {
  it('passes through numbers', () => {
    expect(parseServings(4)).toBe(4);
  });

  it('parses numeric strings', () => {
    expect(parseServings('6')).toBe(6);
  });

  it('parses strings with extra text (e.g. "4 servings")', () => {
    expect(parseServings('4 servings')).toBe(4);
  });

  it('defaults to 4 for unparseable or missing values', () => {
    expect(parseServings(undefined)).toBe(4);
    expect(parseServings('ein paar')).toBe(4);
  });
});

describe('mapJsonLdToRecipe', () => {
  it('maps schema.org Recipe fields', () => {
    const result = mapJsonLdToRecipe({
      name: 'Pfannkuchen',
      recipeYield: '4',
      recipeIngredient: ['200 g Mehl', '2 Eier'],
      recipeInstructions: [{ text: 'Alles verrühren.' }, 'Backen.'],
    });
    expect(result.title).toBe('Pfannkuchen');
    expect(result.servings).toBe(4);
    expect(result.ingredients).toEqual([
      { name: 'Mehl', amount: 200, unit: 'g' },
      { name: 'Eier', amount: 2, unit: '' },
    ]);
    expect(result.steps).toEqual(['Alles verrühren.', 'Backen.']);
  });

  it('handles missing optional fields gracefully', () => {
    const result = mapJsonLdToRecipe({});
    expect(result).toEqual({ title: '', servings: 4, ingredients: [], steps: [] });
  });
});

describe('parseJsonLd', () => {
  it('extracts a Recipe node from a JSON-LD script tag', () => {
    const html = `
      <html><head>
      <script type="application/ld+json">
        {"@type": "Recipe", "name": "Suppe", "recipeYield": "2", "recipeIngredient": ["500 ml Brühe"], "recipeInstructions": ["Erhitzen."]}
      </script>
      </head></html>
    `;
    const result = parseJsonLd(html);
    expect(result?.title).toBe('Suppe');
    expect(result?.servings).toBe(2);
  });

  it('returns null when no Recipe JSON-LD is present', () => {
    expect(parseJsonLd('<html><body>kein JSON-LD hier</body></html>')).toBeNull();
  });

  it('skips broken JSON-LD instead of throwing', () => {
    const html = `<script type="application/ld+json">{ not valid json </script>`;
    expect(parseJsonLd(html)).toBeNull();
  });
});

describe('extractRecipe', () => {
  const args = { model: 'test-model', visionModel: 'test-vision-model', apiKey: 'key' };

  it('uses provided text instead of throwing when a non-blog URL (Instagram/TikTok/YouTube) is also present', async () => {
    vi.mocked(chatCompletion).mockResolvedValue(
      JSON.stringify({ title: 'Pasta', servings: 2, ingredients: [], steps: [] })
    );
    const result = await extractRecipe({
      ...args,
      sourceType: 'instagram',
      url: 'https://www.instagram.com/reel/abc123/',
      text: 'Pasta Rezept: 200g Nudeln, 1 Dose Tomaten...',
    });
    expect(result.title).toBe('Pasta');
    expect(result.sourceUrl).toBe('https://www.instagram.com/reel/abc123/');
  });

  it('still throws the guidance error for a non-blog URL without any text', async () => {
    await expect(
      extractRecipe({ ...args, sourceType: 'tiktok', url: 'https://www.tiktok.com/@x/video/1' })
    ).rejects.toThrow(/nicht automatisch gelesen werden/);
  });

  it('throws when neither url, text nor images are given', async () => {
    await expect(extractRecipe({ ...args, sourceType: 'manual' })).rejects.toThrow(/Keine Quelle/);
  });
});
