import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { NutritionGoals } from './types';

export const EMPTY_GOALS: NutritionGoals = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };

export async function loadGoals(uid: string): Promise<NutritionGoals> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    const g = snap.data()?.goals;
    if (g) return { ...EMPTY_GOALS, ...g };
  } catch {
    // Fallback auf leere Ziele
  }
  return { ...EMPTY_GOALS };
}

export async function saveGoals(uid: string, goals: NutritionGoals): Promise<void> {
  await setDoc(doc(db, 'users', uid), { goals }, { merge: true });
}

export function hasGoals(goals: NutritionGoals): boolean {
  return goals.kcal > 0 || goals.protein_g > 0 || goals.carbs_g > 0 || goals.fat_g > 0;
}
