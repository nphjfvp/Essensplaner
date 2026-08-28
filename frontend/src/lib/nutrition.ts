import { chatCompletion, parseJson } from './openrouter';
import { NUTRITION_PROMPT, CLASSIFY_PROMPT } from './prompts';
import type { Nutrition, KcalBucket, Recipe } from './types';

export async function estimateNutrition(recipe: Recipe, apiKey: string, model: string): Promise<Nutrition> {
  const raw = await chatCompletion(
    {
      model,
      messages: [
        { role: 'system', content: NUTRITION_PROMPT },
        { role: 'user', content: JSON.stringify(recipe, null, 2) },
      ],
      jsonMode: true,
    },
    apiKey
  );
  return parseJson<Nutrition>(raw);
}

export async function classifyRecipe(
  recipe: Recipe,
  apiKey: string,
  model: string
): Promise<{ folders: string[]; kcal_bucket: KcalBucket }> {
  const raw = await chatCompletion(
    {
      model,
      messages: [
        { role: 'system', content: CLASSIFY_PROMPT },
        { role: 'user', content: JSON.stringify(recipe, null, 2) },
      ],
      jsonMode: true,
    },
    apiKey
  );
  return parseJson<{ folders: string[]; kcal_bucket: KcalBucket }>(raw);
}

// Deterministisch aus kcal ableiten (siehe CLASSIFY_PROMPT) statt für ein
// bloßes Neuberechnen des Buckets einen zweiten KI-Call zu brauchen.
export function kcalBucketFor(kcal: number): KcalBucket {
  if (kcal < 500) return '<500';
  if (kcal <= 1000) return '500-1000';
  return '>1000';
}
