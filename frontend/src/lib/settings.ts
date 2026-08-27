import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { DEFAULT_MODELS, sanitizeSettings } from './models';
import type { ModelSettings } from './types';

export async function loadSettings(uid: string): Promise<ModelSettings> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    const d = snap.data();
    if (d?.settings) return sanitizeSettings(d.settings);
  } catch {
    // Fallback auf Defaults
  }
  return { ...DEFAULT_MODELS };
}
