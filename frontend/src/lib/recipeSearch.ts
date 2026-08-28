import type { Recipe } from './types';

// Client-seitige Volltextsuche über Titel + Zutatennamen — kein Backend
// nötig, reicht für die Größenordnung, in der Nutzer Rezepte sammeln.
export function searchRecipes(recipes: Recipe[], query: string): Recipe[] {
  const q = query.trim().toLowerCase();
  if (!q) return recipes;
  return recipes.filter(
    (r) => r.title.toLowerCase().includes(q) || r.ingredients.some((ing) => ing.name.toLowerCase().includes(q))
  );
}
