import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import { DEFAULT_MODELS, MODEL_OPTIONS } from '../lib/models';
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
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then((snap) => {
      const s = snap.data()?.settings;
      if (s) setSettings({ ...DEFAULT_MODELS, ...s });
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid), { settings }, { merge: true });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="page">
      <h2>Einstellungen</h2>
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

      <button className="primary" onClick={save}>
        {saved ? 'Gespeichert ✓' : 'Speichern'}
      </button>
    </div>
  );
}
