import { describe, expect, it } from 'vitest';
import { parseExportBundle } from './exportImport';

describe('parseExportBundle', () => {
  it('throws for non-object input', () => {
    expect(() => parseExportBundle(null)).toThrow(/Ungültige Export-Datei/);
    expect(() => parseExportBundle('nope')).toThrow(/Ungültige Export-Datei/);
  });

  it('throws when recipes is missing or not an array', () => {
    expect(() => parseExportBundle({})).toThrow(/recipes fehlt/);
    expect(() => parseExportBundle({ recipes: 'nope' })).toThrow(/recipes fehlt/);
  });

  it('fills in defaults for missing optional collections', () => {
    const result = parseExportBundle({ recipes: [] });
    expect(result.folders).toEqual([]);
    expect(result.pantry).toEqual([]);
    expect(result.shopping).toEqual([]);
    expect(result.mealplan).toEqual([]);
    expect(result.mealplanTemplates).toEqual([]);
    expect(result.version).toBe(1);
  });

  it('passes through a fully populated bundle', () => {
    const bundle = {
      version: 1,
      exportedAt: 123,
      settings: { extract: 'a', vision: 'b', nutrition: 'c', adjust: 'd', review: 'e' },
      goals: { kcal: 2000, protein_g: 100, carbs_g: 200, fat_g: 70 },
      allowCorsProxy: true,
      folders: [{ name: 'vegan' }],
      recipes: [{ id: 'r1', title: 'Test', source_type: 'manual', servings: 4, ingredients: [], steps: [], folders: [] }],
      pantry: [{ name: 'Mehl' }],
      shopping: [{ name: 'Zucker', done: false }],
      mealplan: [{ day: 0, recipeId: 'r1', portions: 2 }],
      mealplanTemplates: [{ name: 'Standard', days: { 0: { recipeId: 'r1', portions: 1 } } }],
    };
    expect(parseExportBundle(bundle)).toEqual(bundle);
  });
});
