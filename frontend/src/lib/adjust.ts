import { chatCompletion, parseJson } from './openrouter';
import { ADJUST_PROMPT } from './prompts';
import type { Recipe } from './types';

export type AdjustedRecipe = Pick<Recipe, 'title' | 'servings' | 'ingredients' | 'steps'>;

export async function adjustRecipe(
  recipe: Recipe,
  instruction: string,
  apiKey: string,
  model: string
): Promise<AdjustedRecipe> {
  const raw = await chatCompletion(
    {
      model,
      messages: [
        { role: 'system', content: ADJUST_PROMPT },
        {
          role: 'user',
          content: `Anweisung: ${instruction}\n\nRezept:\n${JSON.stringify(recipe, null, 2)}`,
        },
      ],
      jsonMode: true,
      maxTokens: 8000,
    },
    apiKey
  );
  return parseJson<AdjustedRecipe>(raw);
}
