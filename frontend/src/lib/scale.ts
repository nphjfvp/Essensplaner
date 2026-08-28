import type { Ingredient } from './types';

export interface ScaledRecipe {
  servings: number;
  ingredients: Ingredient[];
}

// Reine Mengen-Umrechnung — kein LLM-Call nötig, da nur linear skaliert wird.
export function scaleIngredients(
  ingredients: Ingredient[],
  fromServings: number,
  toServings: number
): ScaledRecipe {
  const factor = toServings / fromServings;
  return {
    servings: toServings,
    ingredients: ingredients.map((ing) => ({
      ...ing,
      amount: ing.amount > 0 ? Math.round(ing.amount * factor * 100) / 100 : ing.amount,
    })),
  };
}
