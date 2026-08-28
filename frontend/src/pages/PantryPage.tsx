import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import { categorize, SHOPPING_CATEGORIES, type ShoppingCategory } from '../lib/shoppingCategories';
import { getApiKey } from '../lib/openrouter';
import { loadSettings } from '../lib/settings';
import { resizeImageToDataUrl } from '../lib/image';
import { extractPantryItems } from '../lib/pantryPhoto';
import { HIGH_MATCH_THRESHOLD, matchRecipesToPantry } from '../lib/pantryMatch';
import type { Recipe } from '../lib/types';
import { useToast } from '../lib/ToastContext';

interface PantryItem {
  id?: string;
  ownerId: string;
  name: string;
}

interface ShopItem {
  id?: string;
  ownerId: string;
  name: string;
  amount?: number;
  unit?: string;
  done: boolean;
  category?: ShoppingCategory;
}

interface DetectedItem {
  name: string;
  checked: boolean;
}

export default function PantryPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [shopping, setShopping] = useState<ShopItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [pantryName, setPantryName] = useState('');
  const [shopName, setShopName] = useState('');

  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [detectedItems, setDetectedItems] = useState<DetectedItem[] | null>(null);

  useEffect(() => {
    if (!user) return;
    const q1 = query(collection(db, 'pantry'), where('ownerId', '==', user.uid));
    const unsub1 = onSnapshot(q1, (snap) =>
      setPantry(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PantryItem)))
    );

    const q2 = query(collection(db, 'shopping'), where('ownerId', '==', user.uid));
    const unsub2 = onSnapshot(q2, (snap) =>
      setShopping(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ShopItem)))
    );

    const q3 = query(collection(db, 'recipes'), where('ownerId', '==', user.uid));
    const unsub3 = onSnapshot(q3, (snap) =>
      setRecipes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Recipe)))
    );

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [user]);

  const addPantry = async () => {
    if (!user || !pantryName.trim()) return;
    try {
      await addDoc(collection(db, 'pantry'), { ownerId: user.uid, name: pantryName.trim() });
      setPantryName('');
    } catch (err: any) {
      showToast(err?.message ?? 'Hinzufügen fehlgeschlagen');
    }
  };

  const addShop = async () => {
    if (!user || !shopName.trim()) return;
    const name = shopName.trim();
    try {
      await addDoc(collection(db, 'shopping'), { ownerId: user.uid, name, done: false, category: categorize(name) });
      setShopName('');
    } catch (err: any) {
      showToast(err?.message ?? 'Hinzufügen fehlgeschlagen');
    }
  };

  const toggleShop = async (item: ShopItem) => {
    if (!item.id) return;
    try {
      await updateDoc(doc(db, 'shopping', item.id), { done: !item.done });
    } catch (err: any) {
      showToast(err?.message ?? 'Speichern fehlgeschlagen');
    }
  };

  const removePantry = async (id?: string) => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, 'pantry', id));
    } catch (err: any) {
      showToast(err?.message ?? 'Löschen fehlgeschlagen');
    }
  };

  const removeShop = async (id?: string) => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, 'shopping', id));
    } catch (err: any) {
      showToast(err?.message ?? 'Löschen fehlgeschlagen');
    }
  };

  const groupedShopping = useMemo(() => {
    const groups = new Map<ShoppingCategory, ShopItem[]>();
    for (const it of shopping) {
      const cat = it.category ?? categorize(it.name);
      const list = groups.get(cat) ?? [];
      list.push(it);
      groups.set(cat, list);
    }
    return SHOPPING_CATEGORIES.map((cat) => [cat, groups.get(cat) ?? []] as const).filter(
      ([, items]) => items.length > 0
    );
  }, [shopping]);

  const pantryMatches = useMemo(
    () => matchRecipesToPantry(recipes, pantry.map((p) => p.name)),
    [recipes, pantry]
  );

  const handlePhotoFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length || !user) return;
    setPhotoError('');
    setDetectedItems(null);
    setPhotoLoading(true);
    try {
      const apiKey = getApiKey();
      if (!apiKey) throw new Error('Kein OpenRouter-Key — bitte in den Einstellungen hinterlegen');
      const settings = await loadSettings(user.uid);
      const dataUrls = await Promise.all(files.map((f) => resizeImageToDataUrl(f)));
      const found = await extractPantryItems(dataUrls, apiKey, settings.vision);
      const existing = new Set(pantry.map((p) => p.name.trim().toLowerCase()));
      const items = found
        .filter((name) => !existing.has(name.toLowerCase()))
        .map((name) => ({ name, checked: true }));
      if (!items.length) {
        setPhotoError('Keine (neuen) Lebensmittel erkannt.');
      }
      setDetectedItems(items);
    } catch (err: any) {
      setPhotoError(err?.message ?? 'Foto-Erkennung fehlgeschlagen');
    } finally {
      setPhotoLoading(false);
    }
  };

  const toggleDetectedItem = (name: string) => {
    setDetectedItems((prev) => prev?.map((it) => (it.name === name ? { ...it, checked: !it.checked } : it)) ?? null);
  };

  const confirmDetectedItems = async () => {
    if (!user || !detectedItems) return;
    const toAdd = detectedItems.filter((it) => it.checked);
    if (!toAdd.length) {
      setDetectedItems(null);
      return;
    }
    const batch = writeBatch(db);
    for (const it of toAdd) {
      batch.set(doc(collection(db, 'pantry')), { ownerId: user.uid, name: it.name });
    }
    try {
      await batch.commit();
      setDetectedItems(null);
    } catch (err: any) {
      setPhotoError(err?.message ?? 'Hinzufügen fehlgeschlagen');
    }
  };

  return (
    <div className="page">
      <h2>Vorrat & Einkauf</h2>

      <h3>Vorrat (zu Hause)</h3>
      <div className="new-folder">
        <input
          placeholder="Zutat hinzufügen…"
          value={pantryName}
          onChange={(e) => setPantryName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addPantry()}
        />
        <button onClick={addPantry} disabled={!pantryName.trim()}>
          Hinzufügen
        </button>
      </div>

      <div className="field">
        <label>Foto von Produkten oder Kassenzettel (füllt den Vorrat automatisch)</label>
        <input type="file" accept="image/*" capture="environment" multiple onChange={handlePhotoFiles} disabled={photoLoading} />
        {photoLoading && <p className="meta">Erkenne Lebensmittel…</p>}
        {photoError && <div className="error">{photoError}</div>}
      </div>

      {detectedItems && detectedItems.length > 0 && (
        <div className="draft">
          <h4>Erkannt — auswählen und übernehmen</h4>
          <div className="folders">
            {detectedItems.map((it) => (
              <label key={it.name}>
                <input type="checkbox" checked={it.checked} onChange={() => toggleDetectedItem(it.name)} />
                {it.name}
              </label>
            ))}
          </div>
          <button className="primary" onClick={confirmDetectedItems}>
            Zum Vorrat hinzufügen
          </button>
          <button onClick={() => setDetectedItems(null)}>Verwerfen</button>
        </div>
      )}

      <ul>
        {pantry.map((it) => (
          <li key={it.id}>
            {it.name}
            <button onClick={() => removePantry(it.id)}>×</button>
          </li>
        ))}
      </ul>

      {pantryMatches.length > 0 && (
        <>
          <h3>Was koche ich mit meinem Vorrat?</h3>
          <div className="cards">
            {pantryMatches.slice(0, 10).map(({ recipe, matchedCount, totalCount, matchPct }) => (
              <div className="card" key={recipe.id}>
                <h3>{recipe.title}</h3>
                <div className="meta">
                  <span>
                    {matchedCount}/{totalCount} Zutaten im Vorrat
                  </span>
                  <span className="tag">{matchPct}%</span>
                  {matchPct >= HIGH_MATCH_THRESHOLD && <span className="tag">fast alles da</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h3>Einkaufsliste</h3>
      <div className="new-folder">
        <input
          placeholder="Artikel hinzufügen…"
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addShop()}
        />
        <button onClick={addShop} disabled={!shopName.trim()}>
          Hinzufügen
        </button>
      </div>
      {groupedShopping.map(([category, items]) => (
        <div key={category} className="shop-group">
          <h4>{category}</h4>
          <ul>
            {items.map((it) => (
              <li key={it.id}>
                <label>
                  <input type="checkbox" checked={it.done} onChange={() => toggleShop(it)} />
                  <span style={{ textDecoration: it.done ? 'line-through' : 'none' }}>
                    {it.amount ? `${it.amount} ${it.unit} ` : ''}
                    {it.name}
                  </span>
                </label>
                <button onClick={() => removeShop(it.id)}>×</button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
