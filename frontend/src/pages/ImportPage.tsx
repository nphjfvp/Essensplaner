import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import { extractRecipe } from '../lib/extract';
import { estimateNutrition, classifyRecipe } from '../lib/nutrition';
import { getApiKey } from '../lib/openrouter';
import { loadSettings } from '../lib/settings';
import { parseSharedPayload } from '../lib/share';
import { resizeImageToDataUrl } from '../lib/image';
import type { Recipe, Nutrition, KcalBucket, SourceType } from '../lib/types';
import { DEFAULT_FOLDERS } from '../lib/folders';
import { useFolders } from '../lib/useFolders';

type Mode = 'url' | 'text' | 'image';

function detectSourceType(u: string): SourceType {
  if (u.includes('instagram')) return 'instagram';
  if (u.includes('tiktok')) return 'tiktok';
  if (u.includes('youtube') || u.includes('youtu.be')) return 'youtube';
  return 'blog';
}

export default function ImportPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>('url');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [imageDataUrls, setImageDataUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sharedHint, setSharedHint] = useState(false);

  // Vom OS-Teilen-Menü übergebene Daten (z.B. Instagram/TikTok-Link geteilt
  // an die installierte App) übernehmen und aus der URL entfernen.
  useEffect(() => {
    const shared = parseSharedPayload({
      title: searchParams.get('title') ?? undefined,
      text: searchParams.get('text') ?? undefined,
      url: searchParams.get('url') ?? undefined,
    });
    if (!shared.url && !shared.text) return;
    if (shared.url) {
      setUrl(shared.url);
      setMode('url');
    }
    if (shared.text) {
      setText(shared.text);
      if (!shared.url) setMode('text');
    }
    setSharedHint(true);
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [draft, setDraft] = useState<Recipe | null>(null);
  const [nutrition, setNutrition] = useState<Nutrition | null>(null);
  const [folders, setFolders] = useState<string[]>([]);
  const [kcalBucket, setKcalBucket] = useState<KcalBucket | undefined>();
  const [newFolder, setNewFolder] = useState('');
  const { all: allFolders, create } = useFolders(user?.uid);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const urls = await Promise.all(files.map((f) => resizeImageToDataUrl(f)));
    setImageDataUrls((prev) => [...prev, ...urls]);
    e.target.value = '';
  };

  const removeImage = (i: number) => {
    setImageDataUrls((prev) => prev.filter((_, idx) => idx !== i));
  };

  const runImport = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const apiKey = getApiKey();
      if (!apiKey) throw new Error('Kein OpenRouter-Key — bitte in den Einstellungen hinterlegen');

      const settings = await loadSettings(user.uid);
      const trimmedUrl = url.trim();
      const sourceType = trimmedUrl ? detectSourceType(trimmedUrl) : 'manual';
      // Text (falls vorhanden) wird unabhängig vom aktiven Tab mitgeschickt:
      // z.B. Instagram/TikTok-Link im URL-Feld + eingefügte Caption im
      // Text-Feld sollen zusammen funktionieren, nicht nur im "Text"-Tab.
      const extracted = await extractRecipe({
        sourceType,
        url: trimmedUrl || undefined,
        text: mode === 'image' ? undefined : text.trim() || undefined,
        imageDataUrls: mode === 'image' ? imageDataUrls : undefined,
        model: settings.extract,
        visionModel: settings.vision,
        apiKey,
      });
      const { sourceUrl, ...rest } = extracted;
      const recipe: Recipe = {
        ...rest,
        ownerId: user.uid,
        source_type: sourceType,
        folders: [],
        ...(sourceUrl ? { source_url: sourceUrl } : {}),
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
    setError('');
    try {
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
      setImageDataUrls([]);
    } catch (err: any) {
      setError(err?.message ?? 'Speichern fehlgeschlagen');
    }
  };

  const toggleFolder = (f: string) => {
    setFolders((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  };

  const addFolder = async () => {
    await create(newFolder);
    setNewFolder('');
  };

  return (
    <div className="page">
      <h2>Rezept importieren</h2>

      {sharedHint && <p className="meta">Geteilter Link/Text übernommen — bitte prüfen und importieren.</p>}

      <div className="tabs">
        {(['url', 'text', 'image'] as Mode[]).map((m) => (
          <button key={m} className={mode === m ? 'active' : ''} onClick={() => setMode(m)}>
            {m === 'url' ? 'URL' : m === 'text' ? 'Text' : 'Bild'}
          </button>
        ))}
      </div>

      {mode === 'url' && (
        <>
          <input
            placeholder="https://… (Blog, YouTube, Instagram, TikTok)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          {url.trim() && detectSourceType(url.trim()) !== 'blog' && (
            <div className="field">
              <p className="meta">
                {detectSourceType(url.trim()) === 'instagram' ? 'Instagram' : detectSourceType(url.trim()) === 'tiktok' ? 'TikTok' : 'YouTube'}-Links
                können nicht automatisch gelesen werden. Bitte Titel/Zutaten/Anleitung (z.B. aus der Beitrags-Beschreibung) hier einfügen:
              </p>
              <textarea
                placeholder="Caption / Beschreibung / Zutatenliste hier einfügen"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
              />
            </div>
          )}
        </>
      )}
      {mode === 'text' && (
        <textarea
          placeholder="Caption / Beschreibung / Zutatenliste hier einfügen"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
        />
      )}
      {mode === 'image' && (
        <>
          <input type="file" accept="image/*" multiple onChange={handleFiles} />
          {imageDataUrls.length > 0 && (
            <div className="thumbs">
              {imageDataUrls.map((u, i) => (
                <div className="thumb" key={i}>
                  <img src={u} alt={`Bild ${i + 1}`} />
                  <button className="x" onClick={() => removeImage(i)}>
                    ×
                  </button>
                </div>
              ))}
              <button className="clear" onClick={() => setImageDataUrls([])}>
                Alle entfernen
              </button>
            </div>
          )}
        </>
      )}

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
            {allFolders.map((f) => (
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
          <div className="new-folder">
            <input
              placeholder="Neuer Ordner…"
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
            />
            <button onClick={addFolder} disabled={!newFolder.trim()}>
              Ordner anlegen
            </button>
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
