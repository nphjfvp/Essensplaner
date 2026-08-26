import * as functions from 'firebase-functions';
import { chatCompletion, getOpenRouterKey, parseJson } from './_shared/openrouter';
import { DEFAULT_MODELS } from './_shared/models';
import { NUTRITION_PROMPT } from './_shared/prompts';

export interface Nutrition {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  price_eur: number;
}

export const estimateNutrition = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Nicht eingeloggt');

  const recipe = data.recipe;
  const model: string = data.model ?? DEFAULT_MODELS.nutrition;
  if (!recipe) throw new functions.https.HttpsError('invalid-argument', 'recipe fehlt');

  const key = await getOpenRouterKey(uid);
  const raw = await chatCompletion(
    {
      model,
      messages: [
        { role: 'system', content: NUTRITION_PROMPT },
        { role: 'user', content: JSON.stringify(recipe, null, 2) },
      ],
      jsonMode: true,
    },
    key
  );
  return parseJson<Nutrition>(raw);
});
