import { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import type { Ingredient, Recipe } from '../lib/types';
import { useFolders } from '../lib/useFolders';
import { getApiKey } from '../lib/openrouter';
import { loadSettings } from '../lib/settings';
import { adjustRecipe, type AdjustedRecipe } from '../lib/adjust';
import { reviewRecipe } from '../lib/review';

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
  const [editIngredients, setEditIngredients] = useState<Ingredient[]>([]);
  const [error, setError] = useState('');

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [adjustResult, setAdjustResult] = useState<AdjustedRecipe | null>(null);
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustError, setAdjustError] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewResult, setReviewResult] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');

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
    setAdjustOpen(false);
    setAdjustResult(null);
    setAdjustError('');
    setReviewOpen(false);
    setReviewResult('');
    setReviewError('');
  };

  const startEdit = () => {
    if (!selected) return;
    setEditTitle(selected.title);
    setEditServings(String(selected.servings));
    setEditSteps(selected.steps.join('\n'));
    setEditFolders(selected.folders);
    setEditIngredients(selected.ingredients.map((i) => ({ ...i })));
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!selected?.id || !user) return;
    setError('');
    try {
      const steps = editSteps.split('\n').map((s) => s.trim()).filter(Boolean);
      const ingredients = editIngredients
        .map((ing) => ({ ...ing, name: ing.name.trim(), amount: Number(ing.amount) || 0 }))
        .filter((ing) => ing.name !== '');
      await updateDoc(doc(db, 'recipes', selected.id), {
        title: editTitle,
        servings: Number(editServings) || 1,
        ingredients,
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

  const runAdjust = async () => {
    if (!selected || !user || !instruction.trim()) return;
    setAdjustLoading(true);
    setAdjustError('');
    try {
      const apiKey = getApiKey();
      if (!apiKey) throw new Error('Kein OpenRouter-Key — bitte in den Einstellungen hinterlegen');
      const settings = await loadSettings(user.uid);
      const result = await adjustRecipe(selected, instruction.trim(), apiKey, settings.adjust);
      setAdjustResult(result);
    } catch (err: any) {
      setAdjustError(err?.message ?? 'Anpassung fehlgeschlagen');
    } finally {
      setAdjustLoading(false);
    }
  };

  const applyAdjust = async () => {
    if (!selected?.id || !adjustResult) return;
    setError('');
    try {
      await updateDoc(doc(db, 'recipes', selected.id), {
        ...adjustResult,
        updatedAt: Date.now(),
      });
      setAdjustResult(null);
      setAdjustOpen(false);
      setInstruction('');
    } catch (err: any) {
      setError(err?.message ?? 'Übernehmen fehlgeschlagen');
    }
  };

  const saveAdjustAsNew = async () => {
    if (!selected || !adjustResult || !user) return;
    setError('');
    try {
      await addDoc(collection(db, 'recipes'), {
        ...adjustResult,
        ownerId: user.uid,
        source_type: 'manual',
        folders: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      setAdjustResult(null);
      setAdjustOpen(false);
      setInstruction('');
    } catch (err: any) {
      setError(err?.message ?? 'Speichern fehlgeschlagen');
    }
  };

  const runReview = async () => {
    if (!selected || !user) return;
    setReviewLoading(true);
    setReviewError('');
    try {
      const apiKey = getApiKey();
      if (!apiKey) throw new Error('Kein OpenRouter-Key — bitte in den Einstellungen hinterlegen');
      const settings = await loadSettings(user.uid);
      const text = await reviewRecipe(selected, apiKey, settings.review);
      setReviewResult(text);
    } catch (err: any) {
      setReviewError(err?.message ?? 'Review fehlgeschlagen');
    } finally {
      setReviewLoading(false);
    }
  };

  const toggleEditFolder = (f: string) => {
    setEditFolders((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  };

  const updateIngredient = (i: number, field: 'name' | 'amount' | 'unit', value: string) => {
    setEditIngredients((prev) =>
      prev.map((ing, idx) => {
        if (idx !== i) return ing;
        if (field === 'amount') return { ...ing, amount: Number(value) || 0 };
        if (field === 'unit') return { ...ing, unit: value };
        return { ...ing, name: value };
      })
    );
  };

  const removeIngredient = (i: number) => {
    setEditIngredients((prev) => prev.filter((_, idx) => idx !== i));
  };

  const addIngredient = () => {
    setEditIngredients((prev) => [...prev, { name: '', amount: 0, unit: '' }]);
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
          <button onClick={() => setReviewOpen((v) => !v)}>Review</button>
          <button onClick={() => setAdjustOpen((v) => !v)}>Anpassen</button>

          {reviewOpen && (
            <div className="field">
              <button className="primary" onClick={runReview} disabled={reviewLoading}>
                {reviewLoading ? 'Prüfe…' : 'Review starten'}
              </button>
              {reviewError && <div className="error">{reviewError}</div>}
            </div>
          )}

          {reviewResult && (
            <div className="draft">
              <h4>Review</h4>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{reviewResult}</pre>
            </div>
          )}

          {adjustOpen && (
            <div className="field">
              <textarea
                placeholder='Anweisung, z.B. "vegan machen", "doppelte Portion", "mehr Protein"'
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                rows={2}
              />
              <button className="primary" onClick={runAdjust} disabled={adjustLoading || !instruction.trim()}>
                {adjustLoading ? 'Passe an…' : 'Anpassen'}
              </button>
              {adjustError && <div className="error">{adjustError}</div>}
            </div>
          )}

          {adjustResult && (
            <div className="draft">
              <h4>Angepasst: {adjustResult.title}</h4>
              <p>{adjustResult.servings} Portionen</p>
              <h4>Zutaten</h4>
              <ul>
                {adjustResult.ingredients.map((ing, i) => (
                  <li key={i}>
                    {ing.amount > 0 && `${ing.amount} ${ing.unit} `}
                    {ing.name}
                  </li>
                ))}
              </ul>
              <h4>Zubereitung</h4>
              <ol>
                {adjustResult.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
              <button className="primary" onClick={applyAdjust}>
                Übernehmen
              </button>
              <button className="primary" onClick={saveAdjustAsNew}>
                Als neues Rezept speichern
              </button>
            </div>
          )}
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
            <label>Zutaten</label>
            {editIngredients.map((ing, i) => (
              <div className="ingredient-row" key={i}>
                <input
                  placeholder="Zutat"
                  value={ing.name}
                  onChange={(e) => updateIngredient(i, 'name', e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Menge"
                  value={ing.amount || ''}
                  onChange={(e) => updateIngredient(i, 'amount', e.target.value)}
                />
                <input
                  placeholder="Einheit"
                  value={ing.unit}
                  onChange={(e) => updateIngredient(i, 'unit', e.target.value)}
                />
                <button onClick={() => removeIngredient(i)}>×</button>
              </div>
            ))}
            <button onClick={addIngredient}>Zutat hinzufügen</button>
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
