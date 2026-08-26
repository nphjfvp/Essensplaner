# Essensplaner

KI-gestützte Rezept-App: Rezepte importieren (URL / Text / Bild), Nährwerte schätzen, kategorisieren. Später: Rezept-Anpassung, Wochenplan, Vorrat + Einkaufsliste.

## Stack

- **Frontend:** React + Vite + TypeScript (SPA)
- **Backend:** Firebase **Spark (kostenlos)** — Auth (Google + anonym), Firestore, Storage, Hosting. **Keine Cloud Functions, kein Blaze.**
- **KI:** OpenRouter — direkt aus dem Browser, mit dem **eigenen** Key jedes Nutzers (BYOK).

## Struktur

```
frontend/        React SPA
  src/lib/openrouter.ts   OpenRouter-Aufruf (client-seitig) + Key-Verwaltung (localStorage)
  src/lib/extract.ts      Rezept-Extraktion (JSON-LD → Vision → Text)
  src/lib/nutrition.ts    Nährwert-Schätzung + Kategorisierung
  src/lib/prompts.ts      Modell-Prompts
firestore.rules  user-scoped Security Rules
storage.rules
.github/workflows/deploy.yml
```

## Einmaliges Setup (Console — kein Billing nötig)

1. **Firestore** → Datenbank erstellen (Location z.B. `europe-west3`).
2. **Authentication** → Sign-in method → **Google** + **Anonym** aktivieren.

Spark-Plan reicht für Auth + Firestore + Storage + Hosting vollständig.

## OpenRouter-Key (BYOK)

Jeder Nutzer trägt seinen **eigenen** OpenRouter-Key in den App-Settings ein. Kosten laufen pro Nutzer über dessen Account. Der Key wird **nur lokal im Browser** (`localStorage`) gespeichert — nie im Code, nie auf dem Server, nie geteilt.

Key von https://openrouter.ai (Account → API Keys).

## Lokal entwickeln

```bash
cd frontend && npm install && npm run dev
```

## Deploy

```bash
firebase deploy --only hosting
```

## CI/CD

GitHub Actions deployed bei Push auf `main`. Benötigt Secret `FIREBASE_TOKEN`:

```bash
firebase login:ci   # Token ausgeben
```

Token als GitHub-Secret `FIREBASE_TOKEN` hinterlegen (Repo → Settings → Secrets → Actions).

## Modellwahl

Pro Funktion separat in den App-Settings einstellbar (Extraktion, Vision, Nährwert, Anpassung, Review). Defaults in `frontend/src/lib/models.ts`. Inkl. kostenloser OpenRouter-Modelle.
