import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import type { Recipe } from '../lib/types';
import { useFolders } from '../lib/useFolders';

export default function RecipesPage() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filter, setFilter] = useState<string>('alle');
  const { all: allFolders } = useFolders(user?.uid);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editServings, setEditServings] = useState('');
  const [editSteps, setEditSteps] = useState('');
  const [editFolders, setEditFolders] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'recipes'), where('ownerId', '==', user.uid));
    return onSnapshot(q, (snap) => {
      setRecipes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Recipe)));
    });
  }, [user]);

  const visible = filter === 'alle' ? recipes : recipes.filter((r) => r.folders.includes(filter));
  const selected = recipes.find((r) => r.id === selectedId) ?? null;

  const open = (r: Recipe) => {
    setSelectedId(r.id ?? null);
    setEditing(false);
    setError('');
  };

  const startEdit = () => {
    if (!selected) return;
    setEditTitle(selected.title);
    setEditServings(String(selected.servings));
    setEditSteps(selected.steps.join('\n'));
    setEditFolders(selected.folders);
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!selected?.id || !user) return;
    setError('');
    try {
      const steps = editSteps.split('\n').map((s) => s.trim()).filter(Boolean);
      await updateDoc(doc(db, 'recipes', selected.id), {
        title: editTitle,
        servings: Number(editServings) || 1,
        steps,
        folders: editFolders,
        updatedAt: Date.now(),
      });
      setEditing(false);
    } catch (err: any) {
      setError(err?.message ?? 'Speichern fehlgeschlagen');
    }
  };

  const del = async () => {
    if (!selected?.id) return;
    if (!window.confirm('Rezept wirklich löschen?')) return;
    await deleteDoc(doc(db, 'recipes', selected.id));
    setSelectedId(null);
  };

  const toggleEditFolder = (f: string) => {
    setEditFolders((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  };

  return (
    <div className="page">
      <h2>Rezepte</h2>

      <div className="tabs">
        <button className={filter === 'alle' ? 'active' : ''} onClick={() => setFilter('alle')}>
          Alle
        </button>
        {allFolders.map((f) => (
          <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      {visible.length === 0 && <p>Noch keine Rezepte. Importiere eins.</p>}

      <div className="cards">
        {visible.map((r) => (
          <div className="card" key={r.id} onClick={() => open(r)} style={{ cursor: 'pointer' }}>
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

      {selected && !editing && (
        <div className="draft">
          <h3>{selected.title}</h3>
          <div className="meta">
            <span>{selected.servings} Port.</span>
            {selected.estimated_nutrition && (
              <span>
                🔥 {selected.estimated_nutrition.kcal} kcal · 🥩 {selected.estimated_nutrition.protein_g} g Protein
              </span>
            )}
          </div>

          <h4>Zutaten</h4>
          <ul>
            {selected.ingredients.map((ing, i) => (
              <li key={i}>
                {ing.amount > 0 && `${ing.amount} ${ing.unit} `}
                {ing.name}
              </li>
            ))}
          </ul>

          <h4>Zubereitung</h4>
          <ol>
            {selected.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>

          {selected.estimated_nutrition && (
            <div className="nutrition">
              <h4>Nährwerte (geschätzt, pro Portion)</h4>
              <div>
                <span>🔥 {selected.estimated_nutrition.kcal} kcal</span>
                <span>🥩 {selected.estimated_nutrition.protein_g} g Protein</span>
                <span>🍞 {selected.estimated_nutrition.carbs_g} g KH</span>
                <span>🧈 {selected.estimated_nutrition.fat_g} g Fett</span>
                <span>🥦 {selected.estimated_nutrition.fiber_g} g Ballast</span>
                <span>💰 ~{selected.estimated_nutrition.price_eur} €</span>
              </div>
            </div>
          )}

          <button className="primary" onClick={startEdit}>
            Bearbeiten
          </button>
          <button onClick={del}>Löschen</button>
        </div>
      )}

      {selected && editing && (
        <div className="draft">
          <h3>Rezept bearbeiten</h3>
          <div className="field">
            <label>Titel</label>
            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          </div>
          <div className="field">
            <label>Portionen</label>
            <input
              type="number"
              value={editServings}
              onChange={(e) => setEditServings(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Zubereitung (ein Schritt pro Zeile)</label>
            <textarea rows={8} value={editSteps} onChange={(e) => setEditSteps(e.target.value)} />
          </div>
          <div className="field">
            <label>Ordner</label>
            <div className="folders">
              {allFolders.map((f) => (
                <label key={f}>
                  <input
                    type="checkbox"
                    checked={editFolders.includes(f)}
                    onChange={() => toggleEditFolder(f)}
                  />
                  {f}
                </label>
              ))}
            </div>
          </div>

          {error && <div className="error">{error}</div>}
          <button className="primary" onClick={saveEdit}>
            Speichern
          </button>
          <button onClick={() => setEditing(false)}>Abbrechen</button>
        </div>
      )}
    </div>
  );
}
