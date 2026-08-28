import { collection, doc, getDoc, getDocs, query, setDoc, where, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import type { ModelSettings, NutritionGoals, Recipe } from './types';

const EXPORT_VERSION = 1;

export interface ExportBundle {
  version: number;
  exportedAt: number;
  settings?: ModelSettings;
  goals?: NutritionGoals;
  allowCorsProxy?: boolean;
  folders: { name: string }[];
  // id bleibt erhalten — mealplan/mealplanTemplates verweisen per recipeId
  // darauf, die Referenzen müssen beim Re-Import gültig bleiben.
  recipes: (Omit<Recipe, 'ownerId'> & { id: string })[];
  pantry: { name: string }[];
  shopping: { name: string; amount?: number; unit?: string; done: boolean; category?: string }[];
  mealplan: { day: number; recipeId: string; portions: number }[];
  mealplanTemplates: {
    name: string;
    days: Record<number, { recipeId: string; portions: number }>;
    createdAt?: number;
  }[];
}

async function getOwnedDocs<T>(collectionName: string, uid: string): Promise<(T & { id: string })[]> {
  const snap = await getDocs(query(collection(db, collectionName), where('ownerId', '==', uid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T & { id: string }));
}

export async function exportUserData(uid: string): Promise<ExportBundle> {
  const [userSnap, folders, recipes, pantry, shopping, mealplan, mealplanTemplates] = await Promise.all([
    getDoc(doc(db, 'users', uid)),
    getOwnedDocs<{ name: string }>('folders', uid),
    getOwnedDocs<Recipe>('recipes', uid),
    getOwnedDocs<{ name: string }>('pantry', uid),
    getOwnedDocs<{ name: string; amount?: number; unit?: string; done: boolean; category?: string }>('shopping', uid),
    getOwnedDocs<{ day: number; recipeId: string; portions?: number }>('mealplan', uid),
    getOwnedDocs<{ name: string; days: Record<number, { recipeId: string; portions: number }>; createdAt?: number }>(
      'mealplanTemplates',
      uid
    ),
  ]);
  const userData = userSnap.data();

  return {
    version: EXPORT_VERSION,
    exportedAt: Date.now(),
    settings: userData?.settings,
    goals: userData?.goals,
    allowCorsProxy: userData?.allowCorsProxy,
    folders: folders.map((f) => ({ name: f.name })),
    recipes: recipes.map(({ ownerId: _ownerId, ...rest }: any) => rest),
    pantry: pantry.map((p) => ({ name: p.name })),
    shopping: shopping.map((s) => ({ name: s.name, amount: s.amount, unit: s.unit, done: s.done, category: s.category })),
    mealplan: mealplan.map((m) => ({ day: m.day, recipeId: m.recipeId, portions: m.portions ?? 1 })),
    mealplanTemplates: mealplanTemplates.map((t) => ({ name: t.name, days: t.days, createdAt: t.createdAt })),
  };
}

// Validiert eine geparste Export-Datei und füllt fehlende optionale Felder
// (z.B. aus einer älteren Export-Version) mit sinnvollen Defaults auf.
export function parseExportBundle(raw: unknown): ExportBundle {
  if (!raw || typeof raw !== 'object') throw new Error('Ungültige Export-Datei');
  const b = raw as Partial<ExportBundle>;
  if (!Array.isArray(b.recipes)) throw new Error('Ungültige Export-Datei (recipes fehlt)');
  return {
    version: b.version ?? 1,
    exportedAt: b.exportedAt ?? Date.now(),
    settings: b.settings,
    goals: b.goals,
    allowCorsProxy: b.allowCorsProxy,
    folders: b.folders ?? [],
    recipes: b.recipes,
    pantry: b.pantry ?? [],
    shopping: b.shopping ?? [],
    mealplan: b.mealplan ?? [],
    mealplanTemplates: b.mealplanTemplates ?? [],
  };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Schreibt ownerId IMMER auf den importierenden Account, unabhängig davon,
// was in der Datei steht — verhindert, dass eine Export-Datei fremde Daten
// beansprucht, und macht den Import nutzbar für einen Account-Umzug.
export async function importUserData(uid: string, raw: unknown): Promise<number> {
  const bundle = parseExportBundle(raw);

  const ops: ((b: ReturnType<typeof writeBatch>) => void)[] = [];

  for (const r of bundle.recipes) {
    const { id, ...rest } = r;
    if (!id) continue;
    ops.push((b) => b.set(doc(db, 'recipes', id), { ...rest, ownerId: uid }));
  }
  for (const f of bundle.folders) {
    ops.push((b) => b.set(doc(collection(db, 'folders')), { ownerId: uid, name: f.name, is_default: false }));
  }
  for (const p of bundle.pantry) {
    ops.push((b) => b.set(doc(collection(db, 'pantry')), { ownerId: uid, name: p.name }));
  }
  for (const s of bundle.shopping) {
    ops.push((b) => b.set(doc(collection(db, 'shopping')), { ownerId: uid, ...s }));
  }
  for (const m of bundle.mealplan) {
    ops.push((b) =>
      b.set(doc(db, 'mealplan', `${uid}_${m.day}`), { ownerId: uid, day: m.day, recipeId: m.recipeId, portions: m.portions })
    );
  }
  for (const t of bundle.mealplanTemplates) {
    ops.push((b) =>
      b.set(doc(collection(db, 'mealplanTemplates')), {
        ownerId: uid,
        name: t.name,
        days: t.days,
        createdAt: t.createdAt ?? Date.now(),
      })
    );
  }

  for (const group of chunk(ops, 400)) {
    const batch = writeBatch(db);
    group.forEach((op) => op(batch));
    await batch.commit();
  }

  if (bundle.settings || bundle.goals || bundle.allowCorsProxy !== undefined) {
    await setDoc(
      doc(db, 'users', uid),
      {
        ...(bundle.settings ? { settings: bundle.settings } : {}),
        ...(bundle.goals ? { goals: bundle.goals } : {}),
        ...(bundle.allowCorsProxy !== undefined ? { allowCorsProxy: bundle.allowCorsProxy } : {}),
      },
      { merge: true }
    );
  }

  return ops.length;
}
