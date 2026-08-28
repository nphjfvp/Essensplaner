import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import { DEFAULT_MODELS, MODEL_OPTIONS, sanitizeSettings } from '../lib/models';
import { getApiKey, saveApiKey } from '../lib/openrouter';
import { EMPTY_GOALS } from '../lib/goals';
import type { ModelSettings, NutritionGoals } from '../lib/types';

const KEYS: { key: keyof ModelSettings; label: string }[] = [
  { key: 'extract', label: 'Extraktion (Text/URL)' },
  { key: 'vision', label: 'Bild-Erkennung' },
  { key: 'nutrition', label: 'Nährwert-Schätzung' },
  { key: 'adjust', label: 'Anpassung (Phase 2)' },
  { key: 'review', label: 'Review (Phase 2)' },
];

const GOAL_KEYS: { key: keyof NutritionGoals; label: string }[] = [
  { key: 'kcal', label: 'Kalorien (kcal)' },
  { key: 'protein_g', label: 'Protein (g)' },
  { key: 'carbs_g', label: 'Kohlenhydrate (g)' },
  { key: 'fat_g', label: 'Fett (g)' },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ModelSettings>({ ...DEFAULT_MODELS });
  const [goals, setGoals] = useState<NutritionGoals>({ ...EMPTY_GOALS });
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      const d = snap.data();
      if (d?.settings) setSettings(sanitizeSettings(d.settings));
      if (d?.goals) setGoals({ ...EMPTY_GOALS, ...d.goals });
      const k = getApiKey();
      if (k) setApiKey(k);
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaveError('');
    saveApiKey(apiKey);
    try {
      await setDoc(doc(db, 'users', user.uid), { settings, goals }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setSaveError(err?.message ?? 'Speichern fehlgeschlagen');
    }
  };

  return (
    <div className="page">
      <h2>Einstellungen</h2>

      <div className="field">
        <label>OpenRouter API-Key (dein eigener — Kosten laufen über deinen Account, nur lokal gespeichert)</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-or-…"
        />
      </div>

      <p>Modell pro Funktion wählbar (OpenRouter).</p>

      {KEYS.map(({ key, label }) => (
        <div className="field" key={key}>
          <label>{label}</label>
          <select
            value={settings[key]}
            onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
          >
            {MODEL_OPTIONS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
                {m.free ? ' (kostenlos)' : ''}
              </option>
            ))}
          </select>
        </div>
      ))}

      <h3>Tagesziele (Nährwerte)</h3>
      <p className="meta">Optional — leer/0 lassen für kein Ziel. Wird im Wochenplan gegen die geplante Woche abgeglichen.</p>
      {GOAL_KEYS.map(({ key, label }) => (
        <div className="field" key={key}>
          <label>{label}</label>
          <input
            type="number"
            min={0}
            value={goals[key] || ''}
            onChange={(e) => setGoals({ ...goals, [key]: Number(e.target.value) || 0 })}
          />
        </div>
      ))}

      {saveError && <div className="error">{saveError}</div>}
      <button className="primary" onClick={save}>
        {saved ? 'Gespeichert ✓' : 'Speichern'}
      </button>
    </div>
  );
}
