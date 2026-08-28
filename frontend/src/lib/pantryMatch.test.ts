import { describe, expect, it } from 'vitest';
import { matchRecipesToPantry } from './pantryMatch';
import type { Recipe } from './types';

function recipe(id: string, title: string, ingredientNames: string[]): Recipe {
  return {
    id,
    ownerId: 'u1',
    title,
    source_type: 'manual',
    servings: 4,
    ingredients: ingredientNames.map((name) => ({ name, amount: 1, unit: 'Stück' })),
    steps: [],
    folders: [],
  };
}

describe('matchRecipesToPantry', () => {
  it('sorts recipes by pantry-match percentage, highest first', () => {
    const recipes = [
      recipe('a', 'Wenig Treffer', ['Mehl', 'Zucker', 'Eier', 'Milch']),
      recipe('b', 'Alles da', ['Mehl', 'Zucker']),
    ];
    const result = matchRecipesToPantry(recipes, ['Mehl', 'Zucker']);
    expect(result.map((m) => m.recipe.id)).toEqual(['b', 'a']);
    expect(result[0].matchPct).toBe(100);
    expect(result[1].matchPct).toBe(50);
  });

  it('excludes recipes with zero matching ingredients', () => {
    const recipes = [recipe('a', 'Kein Treffer', ['Kokosmilch', 'Curry'])];
    expect(matchRecipesToPantry(recipes, ['Mehl'])).toEqual([]);
  });

  it('matches case-insensitively and trims whitespace', () => {
    const recipes = [recipe('a', 'X', ['  Mehl  '])];
    expect(matchRecipesToPantry(recipes, ['MEHL'])[0].matchPct).toBe(100);
  });

  it('handles recipes with no ingredients gracefully', () => {
    const recipes = [recipe('a', 'Leer', [])];
    expect(matchRecipesToPantry(recipes, ['Mehl'])).toEqual([]);
  });
});
