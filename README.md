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

## Teilen aus Instagram/TikTok/YouTube (PWA Share Target)

Essensplaner ist als installierbare PWA konfiguriert (Manifest + Icons in `frontend/public/icons`, generiert via `frontend/scripts/generate-icons.mjs`). Einmal installiert ("Zum Startbildschirm hinzufügen"), erscheint sie im OS-Teilen-Menü: ein aus Instagram/TikTok/YouTube geteilter Link landet direkt vorausgefüllt im Import (`frontend/src/lib/share.ts` extrahiert Link + Caption aus dem geteilten Text).

**Einschränkung:** Die Web-Share-Target-API wird nur von Android/Chrome unterstützt — iOS/Safari kennt sie nicht. Auf iOS bleibt nur "Link kopieren" → manuell in den Import einfügen.

## Firestore-Rules testen

`firestore.rules` hat einen eigenen Testpfad mit dem Firebase-Emulator (braucht Java, wird beim ersten Lauf automatisch heruntergeladen):

```bash
cd frontend && npm run test:rules
```

Separat von `npm run test`, damit der normale Testlauf (und damit jeder Deploy) nicht den Emulator-Start braucht. Läuft in CI nur bei Änderungen an `firestore.rules` oder `frontend/firestore-rules/**` (`.github/workflows/firestore-rules.yml`).
