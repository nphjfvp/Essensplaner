import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import { DEFAULT_MODELS, MODEL_OPTIONS, sanitizeSettings } from '../lib/models';
import { getApiKey, saveApiKey } from '../lib/openrouter';
import type { ModelSettings } from '../lib/types';

const KEYS: { key: keyof ModelSettings; label: string }[] = [
  { key: 'extract', label: 'Extraktion (Text/URL)' },
  { key: 'vision', label: 'Bild-Erkennung' },
  { key: 'nutrition', label: 'Nährwert-Schätzung' },
  { key: 'adjust', label: 'Anpassung (Phase 2)' },
  { key: 'review', label: 'Review (Phase 2)' },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ModelSettings>({ ...DEFAULT_MODELS });
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      const d = snap.data();
      if (d?.settings) setSettings(sanitizeSettings(d.settings));
      const k = getApiKey();
      if (k) setApiKey(k);
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaveError('');
    saveApiKey(apiKey);
    try {
      await setDoc(doc(db, 'users', user.uid), { settings }, { merge: true });
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

      {saveError && <div className="error">{saveError}</div>}
      <button className="primary" onClick={save}>
        {saved ? 'Gespeichert ✓' : 'Speichern'}
      </button>
    </div>
  );
}
