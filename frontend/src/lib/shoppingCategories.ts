export const SHOPPING_CATEGORIES = [
  'Obst & Gemüse',
  'Brot & Backwaren',
  'Trockenware & Konserven',
  'Kühlregal',
  'Fleisch & Fisch',
  'Tiefkühl',
  'Gewürze & Öle',
  'Getränke',
  'Sonstiges',
] as const;

export type ShoppingCategory = (typeof SHOPPING_CATEGORIES)[number];

type KeywordCategory = Exclude<ShoppingCategory, 'Sonstiges'>;

// Stichwort-Heuristik statt KI-Call — kostenlos, deterministisch, für den
// Supermarkt-Anwendungsfall genau genug. Reihenfolge = Prüfreihenfolge, damit
// z.B. "kokosmilch" (Trockenware) vor dem generischen "milch" (Kühlregal) matcht.
const KEYWORDS: Record<KeywordCategory, string[]> = {
  'Obst & Gemüse': [
    'apfel', 'äpfel', 'birne', 'banane', 'orange', 'zitrone', 'limette', 'beere',
    'erdbeere', 'himbeere', 'blaubeere', 'traube', 'kiwi', 'mango', 'ananas',
    'avocado', 'tomate', 'gurke', 'paprika', 'zwiebel', 'knoblauch', 'kartoffel',
    'möhre', 'karotte', 'salat', 'spinat', 'brokkoli', 'blumenkohl', 'zucchini',
    'aubergine', 'pilz', 'champignon', 'sellerie', 'lauch', 'porree', 'kohl',
    'kürbis', 'radieschen', 'rote bete', 'ingwer', 'petersilie', 'basilikum',
    'koriander', 'schnittlauch', 'minze', 'dill',
  ],
  'Brot & Backwaren': ['brot', 'brötchen', 'baguette', 'toast', 'tortilla', 'wrap', 'croissant', 'brezel'],
  'Trockenware & Konserven': [
    'nudel', 'pasta', 'spaghetti', 'reis', 'mehl', 'zucker', 'hafer', 'müsli',
    'cornflakes', 'linsen', 'bohnen', 'kichererbsen', 'kokosmilch', 'kokosnuss',
    'tomatenmark', 'passata', 'dose', 'konserve', 'brühe', 'backpulver', 'hefe',
    'honig', 'marmelade', 'nussmus', 'erdnussbutter', 'schokolade', 'kakao', 'nüsse',
  ],
  Kühlregal: [
    'milch', 'joghurt', 'quark', 'käse', 'butter', 'sahne', 'ei', 'eier',
    'frischkäse', 'skyr', 'mascarpone', 'feta', 'mozzarella', 'parmesan', 'buttermilch',
  ],
  'Fleisch & Fisch': [
    'hähnchen', 'huhn', 'pute', 'rind', 'hack', 'schwein', 'speck', 'wurst',
    'schinken', 'lachs', 'thunfisch', 'fisch', 'garnele', 'shrimp', 'forelle', 'hering',
  ],
  Tiefkühl: ['tiefkühl', 'tk-', 'gefroren', 'pommes'],
  'Gewürze & Öle': [
    'öl', 'olivenöl', 'essig', 'pfeffer', 'curry', 'kreuzkümmel', 'zimt', 'muskat',
    'vanille', 'sojasauce', 'senf', 'ketchup', 'mayo', 'gewürz', 'salz',
  ],
  Getränke: ['wasser', 'saft', 'cola', 'limonade', 'bier', 'wein', 'kaffee', 'tee', 'sekt'],
};

export function categorize(name: string): ShoppingCategory {
  const n = name.trim().toLowerCase();
  for (const cat of SHOPPING_CATEGORIES) {
    if (cat === 'Sonstiges') continue;
    if (KEYWORDS[cat as KeywordCategory].some((w) => n.includes(w))) return cat;
  }
  return 'Sonstiges';
}
