import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import type { Recipe } from '../lib/types';
import { DEFAULT_FOLDERS } from '../lib/folders';

export default function RecipesPage() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filter, setFilter] = useState<string>('alle');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'recipes'), where('ownerId', '==', user.uid));
    return onSnapshot(q, (snap) => {
      setRecipes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Recipe)));
    });
  }, [user]);

  const visible = filter === 'alle' ? recipes : recipes.filter((r) => r.folders.includes(filter));

  return (
    <div className="page">
      <h2>Rezepte</h2>

      <div className="tabs">
        <button className={filter === 'alle' ? 'active' : ''} onClick={() => setFilter('alle')}>
          Alle
        </button>
        {DEFAULT_FOLDERS.map((f) => (
          <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      {visible.length === 0 && <p>Noch keine Rezepte. Importiere eins.</p>}

      <div className="cards">
        {visible.map((r) => (
          <div className="card" key={r.id}>
            <h3>{r.title}</h3>
            <div className="meta">
              <span>{r.servings} Port.</span>
              {r.estimated_nutrition && <span>🔥 {r.estimated_nutrition.kcal} kcal</span>}
              {r.kcal_bucket && <span className="tag">{r.kcal_bucket}</span>}
            </div>
            {r.folders.length > 0 && (
              <div className="tags">
                {r.folders.map((f) => (
                  <span className="tag" key={f}>
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
