import { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../auth/AuthContext';

interface PantryItem {
  id?: string;
  ownerId: string;
  name: string;
}

interface ShopItem {
  id?: string;
  ownerId: string;
  name: string;
  done: boolean;
}

export default function PantryPage() {
  const { user } = useAuth();
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [shopping, setShopping] = useState<ShopItem[]>([]);
  const [pantryName, setPantryName] = useState('');
  const [shopName, setShopName] = useState('');

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

    return () => {
      unsub1();
      unsub2();
    };
  }, [user]);

  const addPantry = async () => {
    if (!user || !pantryName.trim()) return;
    await addDoc(collection(db, 'pantry'), { ownerId: user.uid, name: pantryName.trim() });
    setPantryName('');
  };

  const addShop = async () => {
    if (!user || !shopName.trim()) return;
    await addDoc(collection(db, 'shopping'), { ownerId: user.uid, name: shopName.trim(), done: false });
    setShopName('');
  };

  const toggleShop = async (item: ShopItem) => {
    if (!item.id) return;
    await updateDoc(doc(db, 'shopping', item.id), { done: !item.done });
  };

  const removePantry = async (id?: string) => {
    if (id) await deleteDoc(doc(db, 'pantry', id));
  };

  const removeShop = async (id?: string) => {
    if (id) await deleteDoc(doc(db, 'shopping', id));
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
      <ul>
        {pantry.map((it) => (
          <li key={it.id}>
            {it.name}
            <button onClick={() => removePantry(it.id)}>×</button>
          </li>
        ))}
      </ul>

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
      <ul>
        {shopping.map((it) => (
          <li key={it.id}>
            <label>
              <input type="checkbox" checked={it.done} onChange={() => toggleShop(it)} />
              <span style={{ textDecoration: it.done ? 'line-through' : 'none' }}>{it.name}</span>
            </label>
            <button onClick={() => removeShop(it.id)}>×</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
