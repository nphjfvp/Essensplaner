import { useAuth } from '../auth/AuthContext';

export default function LoginPage() {
  const { signInGoogle, signInAnon } = useAuth();

  return (
    <div className="login">
      <h1>Essensplaner</h1>
      <p>Rezepte importieren, anpassen und Wochenpläne bauen.</p>
      <button className="primary" onClick={signInGoogle}>
        Mit Google anmelden
      </button>
      <button onClick={signInAnon}>Anonym fortfahren</button>
    </div>
  );
}
