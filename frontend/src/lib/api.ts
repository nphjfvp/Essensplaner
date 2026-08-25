import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export const extractRecipe = httpsCallable(functions, 'extractRecipe');
export const estimateNutrition = httpsCallable(functions, 'estimateNutrition');
export const classifyRecipe = httpsCallable(functions, 'classifyRecipe');
