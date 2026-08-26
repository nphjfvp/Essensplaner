import { useState } from 'react';
import { addDoc, collection, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import { extractRecipe } from '../lib/extract';
import { estimateNutrition, classifyRecipe } from '../lib/nutrition';
import { getApiKey } from '../lib/openrouter';
import { DEFAULT_MODELS } from '../lib/models';
import type { Recipe, Nutrition, KcalBucket, SourceType, ModelSettings } from '../lib/types';
import { DEFAULT_FOLDERS } from '../lib/folders';

type Mode = 'url' | 'text' | 'image';

function detectSourceType(u: string): SourceType {
  if (u.includes('instagram')) return 'instagram';
  if (u.includes('tiktok')) return 'tiktok';
  if (u.includes('youtube') || u.includes('youtu.be')) return 'youtube';
  return 'blog';
}

async function loadSettings(uid: string): Promise<ModelSettings> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    const d = snap.data();
    if (d?.settings) return { ...DEFAULT_MODELS, ...d.settings };
  } catch {
    // Fallback auf Defaults
  }
  return { ...DEFAULT_MODELS };
}

export default function ImportPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('url');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [draft, setDraft] = useState<Recipe | null>(null);
  const [nutrition, setNutrition] = useState<Nutrition | null>(null);
  const [folders, setFolders] = useState<string[]>([]);
  const [kcalBucket, setKcalBucket] = useState<KcalBucket | undefined>();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 1024 / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        setImageDataUrl(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const runImport = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const apiKey = getApiKey();
      if (!apiKey) throw new Error('Kein OpenRouter-Key — bitte in den Einstellungen hinterlegen');

      const settings = await loadSettings(user.uid);
      const sourceType = mode === 'url' ? detectSourceType(url) : 'manual';
      const extracted = await extractRecipe({
        sourceType,
        url: mode === 'url' ? url : undefined,
        text: mode === 'text' ? text : undefined,
        imageDataUrl: mode === 'image' ? imageDataUrl : undefined,
        model: settings.extract,
        visionModel: settings.vision,
        apiKey,
      });
      const { sourceUrl, ...rest } = extracted;
      const recipe: Recipe = {
        ...rest,
        ownerId: user.uid,
        source_type: sourceType,
        source_url: sourceUrl,
        folders: [],
      };
      setDraft(recipe);

      const [nutrition, cls] = await Promise.all([
        estimateNutrition(recipe, apiKey, settings.nutrition),
        classifyRecipe(recipe, apiKey, settings.nutrition),
      ]);
      setNutrition(nutrition);
      setFolders(cls.folders.filter((f) => DEFAULT_FOLDERS.includes(f)));
      setKcalBucket(cls.kcal_bucket);
    } catch (err: any) {
      setError(err.message ?? 'Fehler beim Import');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!draft || !user) return;
    await addDoc(collection(db, 'recipes'), {
      ...draft,
      estimated_nutrition: nutrition ?? null,
      estimated_price: nutrition?.price_eur ?? null,
      folders,
      kcal_bucket: kcalBucket ?? null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    setDraft(null);
    setNutrition(null);
    setFolders([]);
    setKcalBucket(undefined);
    setUrl('');
    setText('');
    setImageDataUrl('');
  };

  const toggleFolder = (f: string) => {
    setFolders((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  };

  return (
    <div className="page">
      <h2>Rezept importieren</h2>

      <div className="tabs">
        {(['url', 'text', 'image'] as Mode[]).map((m) => (
          <button key={m} className={mode === m ? 'active' : ''} onClick={() => setMode(m)}>
            {m === 'url' ? 'URL' : m === 'text' ? 'Text' : 'Bild'}
          </button>
        ))}
      </div>

      {mode === 'url' && (
        <input
          placeholder="https://… (Blog, YouTube, Instagram, TikTok)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      )}
      {mode === 'text' && (
        <textarea
          placeholder="Caption / Beschreibung / Zutatenliste hier einfügen"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
        />
      )}
      {mode === 'image' && <input type="file" accept="image/*" onChange={handleFile} />}

      <button className="primary" onClick={runImport} disabled={loading}>
        {loading ? 'Importiere…' : 'Importieren'}
      </button>
      {error && <div className="error">{error}</div>}

      {draft && (
        <div className="draft">
          <h3>{draft.title || 'Ohne Titel'}</h3>
          <p>{draft.servings} Portionen</p>

          <h4>Zutaten</h4>
          <ul>
            {draft.ingredients.map((ing, i) => (
              <li key={i}>
                {ing.amount > 0 && `${ing.amount} ${ing.unit} `}
                {ing.name}
              </li>
            ))}
          </ul>

          <h4>Zubereitung</h4>
          <ol>
            {draft.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>

          {nutrition && (
            <div className="nutrition">
              <h4>Nährwerte (geschätzt, pro Portion)</h4>
              <div>
                <span>🔥 {nutrition.kcal} kcal</span>
                <span>🥩 {nutrition.protein_g} g Protein</span>
                <span>🍞 {nutrition.carbs_g} g KH</span>
                <span>🧈 {nutrition.fat_g} g Fett</span>
                <span>🥦 {nutrition.fiber_g} g Ballast</span>
                <span>💰 ~{nutrition.price_eur} €</span>
              </div>
            </div>
          )}

          <h4>Ordner</h4>
          <div className="folders">
            {DEFAULT_FOLDERS.map((f) => (
              <label key={f}>
                <input
                  type="checkbox"
                  checked={folders.includes(f)}
                  onChange={() => toggleFolder(f)}
                />
                {f}
              </label>
            ))}
          </div>
          {kcalBucket && <p>kcal-Bucket: {kcalBucket}</p>}

          <button className="primary" onClick={save}>
            Speichern
          </button>
        </div>
      )}
    </div>
  );
}
