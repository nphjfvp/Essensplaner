import { chatCompletion } from './openrouter';
import { REVIEW_PROMPT } from './prompts';
import type { Recipe } from './types';

export async function reviewRecipe(recipe: Recipe, apiKey: string, model: string): Promise<string> {
  return chatCompletion(
    {
      model,
      messages: [
        { role: 'system', content: REVIEW_PROMPT },
        { role: 'user', content: JSON.stringify(recipe, null, 2) },
      ],
    },
    apiKey
  );
}
