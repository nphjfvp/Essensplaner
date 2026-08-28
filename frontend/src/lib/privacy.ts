import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// Opt-in: URLs gehen beim Blog-Import standardmäßig NICHT an externe
// CORS-Proxies (allorigins.win, corsproxy.io) — nur wenn der Nutzer das
// explizit erlaubt.
export async function loadAllowCorsProxy(uid: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return Boolean(snap.data()?.allowCorsProxy);
  } catch {
    return false;
  }
}

export async function saveAllowCorsProxy(uid: string, value: boolean): Promise<void> {
  await setDoc(doc(db, 'users', uid), { allowCorsProxy: value }, { merge: true });
}
