import type { Recipe } from './types';

export interface PantryMatch {
  recipe: Recipe;
  matchedCount: number;
  totalCount: number;
  matchPct: number;
}

export const HIGH_MATCH_THRESHOLD = 80;

// "Was koche ich mit meinem Vorrat?" — Rezepte danach sortieren, wie viele
// ihrer Zutaten schon im Vorrat vorhanden sind. Gleicher (exakter,
// case-insensitiver) Namensabgleich wie an den anderen Vorrat-Abgleich-
// Stellen der App (z.B. MealPlanPage-pantryHits), für konsistentes Verhalten.
export function matchRecipesToPantry(recipes: Recipe[], pantryItemNames: string[]): PantryMatch[] {
  const pantryNames = new Set(pantryItemNames.map((n) => n.trim().toLowerCase()));
  return recipes
    .map((recipe) => {
      const total = recipe.ingredients.length;
      const matched = recipe.ingredients.filter((ing) => pantryNames.has(ing.name.trim().toLowerCase())).length;
      const matchPct = total > 0 ? Math.round((matched / total) * 100) : 0;
      return { recipe, matchedCount: matched, totalCount: total, matchPct };
    })
    .filter((m) => m.matchedCount > 0)
    .sort((a, b) => b.matchPct - a.matchPct || b.matchedCount - a.matchedCount);
}
