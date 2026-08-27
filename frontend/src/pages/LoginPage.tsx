import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { generateCode, formatCode } from '../lib/code';

export default function LoginPage() {
  const { signInGoogle, createAccountWithCode, signInWithCode } = useAuth();
  const [mode, setMode] = useState<'enter' | 'new'>('enter');
  const [codeInput, setCodeInput] = useState('');
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const doGenerate = () => {
    setError('');
    setPendingCode(generateCode());
  };

  const doCreate = async () => {
    if (!pendingCode) return;
    setBusy(true);
    setError('');
    try {
      await createAccountWithCode(pendingCode);
      // Erfolg → eingeloggt, App leitet weiter. Code wurde bereits angezeigt.
    } catch (err: any) {
      setError(err.message ?? 'Fehler beim Erstellen des Kontos');
      setBusy(false);
    }
  };

  const doSignIn = async () => {
    setBusy(true);
    setError('');
    try {
      await signInWithCode(codeInput);
    } catch {
      setError('Falscher Code oder Konto existiert nicht.');
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <h1>Essensplaner</h1>
      <p>Rezepte importieren, anpassen und Wochenpläne bauen.</p>

      <button className="primary" onClick={signInGoogle}>
        Mit Google anmelden
      </button>

      <div className="divider">oder mit Code</div>

      <div className="tabs">
        <button className={mode === 'enter' ? 'active' : ''} onClick={() => setMode('enter')}>
          Mit Code anmelden
        </button>
        <button className={mode === 'new' ? 'active' : ''} onClick={() => setMode('new')}>
          Neuen Code
        </button>
      </div>

      {mode === 'enter' && (
        <>
          <input
            placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
          />
          <button onClick={doSignIn} disabled={busy}>
            Anmelden
          </button>
        </>
      )}

      {mode === 'new' && !pendingCode && (
        <button className="primary" onClick={doGenerate}>
          Code erzeugen
        </button>
      )}

      {mode === 'new' && pendingCode && (
        <div className="code-box">
          <p>Dein Code — unbedingt sicher aufbewahren:</p>
          <strong>{formatCode(pendingCode)}</strong>
          <p className="warn">Code verloren = Rezepte weg. Kein Zurücksetzen.</p>
          <button className="primary" onClick={doCreate} disabled={busy}>
            Code notiert — Konto erstellen
          </button>
          <button onClick={doGenerate}>Neuen Code erzeugen</button>
        </div>
      )}

      {error && <div className="error">{error}</div>}
    </div>
  );
}
