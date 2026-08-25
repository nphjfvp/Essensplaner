export const EXTRACT_PROMPT = `Du bist ein Rezept-Extraktor. Extrahiere aus dem folgenden Text ein Rezept als JSON.

Antworte NUR mit einem JSON-Objekt im Format:
{
  "title": string,
  "servings": number,
  "ingredients": [{ "name": string, "amount": number, "unit": string }],
  "steps": [string]
}

Regeln:
- amount als Zahl (0 wenn keine Menge angegeben). unit als String ("g", "ml", "Stück", "EL", "TL", "" etc.)
- Wenn keine Portionen angegeben, schätze realistisch (Standard: 4)
- Kein Rezept im Text => title leer, leere Listen

Text:
`;

export const NUTRITION_PROMPT = `Du bist ein Ernährungs-Analyst. Schätze für das folgende Rezept die Nährwerte PRO PORTION und einen groben Preis.

Antworte NUR mit JSON:
{
  "kcal": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "fiber_g": number,
  "price_eur": number
}

Regeln:
- Alle Werte PRO PORTION (Rezept ergibt <servings> Portionen)
- Grobe Schätzung, keine Genauigkeit vortäuschen
- price_eur = ungefährer Einkaufspreis aller Zutaten zusammen in Euro (grob)

Rezept:
`;

export const CLASSIFY_PROMPT = `Ordne das folgende Rezept den passenden Kategorien zu.

Antworte NUR mit JSON:
{
  "folders": [string],
  "kcal_bucket": "<500" | "500-1000" | ">1000"
}

Erlaubte Folder: "vegan", "vegetarisch", "ballaststoffreich", "proteinreich", "longevity"
Regeln:
- vegan: keine tierischen Produkte (auch kein Honig)
- vegetarisch: kein Fleisch/Fisch, aber Eier/Milch ok
- ballaststoffreich: viele Ballaststoffe (Hülsenfrüchte, Vollkorn, Gemüse)
- proteinreich: proteinreiche Zutaten, >25g Protein/Portion
- longevity: viele unverarbeitete pflanzliche Lebensmittel
- kcal_bucket aus kcal pro Portion

Rezept:
`;
