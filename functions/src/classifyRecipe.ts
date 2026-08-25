import * as functions from 'firebase-functions';
import { chatCompletion, parseJson } from './_shared/openrouter';
import { DEFAULT_MODELS } from './_shared/models';
import { CLASSIFY_PROMPT } from './_shared/prompts';

export interface Classification {
  folders: string[];
  kcal_bucket: '<500' | '500-1000' | '>1000';
}

export const classifyRecipe = functions.https.onCall(async (data, context) => {
  const recipe = data.recipe;
  const model: string = data.model ?? DEFAULT_MODELS.nutrition;
  if (!recipe) throw new functions.https.HttpsError('invalid-argument', 'recipe fehlt');

  const raw = await chatCompletion({
    model,
    messages: [
      { role: 'system', content: CLASSIFY_PROMPT },
      { role: 'user', content: JSON.stringify(recipe, null, 2) },
    ],
    jsonMode: true,
  });
  return parseJson<Classification>(raw);
});
