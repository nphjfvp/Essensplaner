# Essensplaner

KI-gestützte Rezept-App: Rezepte importieren (URL / Text / Bild), Nährwerte schätzen, kategorisieren. Später: Rezept-Anpassung, Wochenplan, Vorrat + Einkaufsliste.

## Stack

- **Frontend:** React + Vite + TypeScript (SPA)
- **Backend:** Firebase — Auth (Google + anonym), Firestore, Storage, Cloud Functions, Hosting
- **KI:** OpenRouter (API-Key **nur** serverseitig in Cloud Functions)

## Struktur

```
frontend/        React SPA
functions/       Cloud Functions v2 (OpenRouter-Proxy: extract, nutrition, classify)
firestore.rules  user-scoped Security Rules
storage.rules
.github/workflows/deploy.yml
```

## Einmaliges Setup (Console — Account/Billing nötig)

1. **Blaze-Plan** aktivieren (Cloud Functions brauchen das; Free-Tier reicht).
2. **APIs aktivieren** (falls Fehler wie „API has not been used…"):
   - Firestore: `https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=essensplaner-38899`
3. **Authentication** → Sign-in method → **Google** + **Anonym** aktivieren.
4. **Firestore** → Datenbank erstellen (Location z.B. `europe-west3`).

## OpenRouter-Key

```bash
firebase functions:secrets:set OPENROUTER_API_KEY
```

Key von https://openrouter.ai (Account → API Keys). Wird nie ins Frontend geschrieben.

## Lokal entwickeln

```bash
cd frontend && npm install && npm run dev
cd functions && npm install
```

## Deploy

```bash
firebase deploy
```

## CI/CD

GitHub Actions deployed bei Push auf `main`. Benötigt Secret `FIREBASE_TOKEN`:

```bash
firebase login:ci   # Token ausgeben
```

Token als GitHub-Secret `FIREBASE_TOKEN` hinterlegen (Repo → Settings → Secrets → Actions).

## Modellwahl

Pro Funktion separat in den App-Settings einstellbar (Extraktion, Vision, Nährwert, Anpassung, Review). Defaults in `frontend/src/lib/models.ts` / `functions/src/_shared/models.ts`. Inkl. kostenloser OpenRouter-Modelle.
