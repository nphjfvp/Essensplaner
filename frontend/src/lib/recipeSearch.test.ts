import { describe, expect, it } from 'vitest';
import { searchRecipes } from './recipeSearch';
import type { Recipe } from './types';

function recipe(id: string, title: string, ingredientNames: string[] = []): Recipe {
  return {
    id,
    ownerId: 'u1',
    title,
    source_type: 'manual',
    servings: 4,
    ingredients: ingredientNames.map((name) => ({ name, amount: 1, unit: '' })),
    steps: [],
    folders: [],
  };
}

describe('searchRecipes', () => {
  const recipes = [recipe('a', 'Pilz-Pasta', ['Champignons', 'Sahne']), recipe('b', 'Linsen-Curry', ['Linsen', 'Kokosmilch'])];

  it('returns everything for an empty query', () => {
    expect(searchRecipes(recipes, '')).toEqual(recipes);
    expect(searchRecipes(recipes, '   ')).toEqual(recipes);
  });

  it('matches by title', () => {
    expect(searchRecipes(recipes, 'pasta').map((r) => r.id)).toEqual(['a']);
  });

  it('matches by ingredient name', () => {
    expect(searchRecipes(recipes, 'linsen').map((r) => r.id)).toEqual(['b']);
  });

  it('is case-insensitive', () => {
    expect(searchRecipes(recipes, 'CHAMPIGNONS').map((r) => r.id)).toEqual(['a']);
  });

  it('returns an empty array when nothing matches', () => {
    expect(searchRecipes(recipes, 'schokolade')).toEqual([]);
  });
});
