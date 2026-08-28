import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import type { NutritionGoals, Recipe } from '../lib/types';
import { categorize } from '../lib/shoppingCategories';
import { EMPTY_GOALS, hasGoals, loadGoals } from '../lib/goals';
import { computeTemplateApply, type DayPlan, type MealPlanTemplate } from '../lib/mealplanTemplates';
import { scaleIngredients } from '../lib/scale';
import { useToast } from '../lib/ToastContext';

const GOAL_LABELS: { key: keyof NutritionGoals; label: string; unit: string }[] = [
  { key: 'kcal', label: 'Kalorien', unit: 'kcal' },
  { key: 'protein_g', label: 'Protein', unit: 'g' },
  { key: 'carbs_g', label: 'Kohlenhydrate', unit: 'g' },
  { key: 'fat_g', label: 'Fett', unit: 'g' },
];

const DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

export default function MealPlanPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [plan, setPlan] = useState<Record<number, DayPlan>>({});
  const [shopping, setShopping] = useState<{ id: string; name: string; amount?: number; unit?: string }[]>([]);
  const [pantry, setPantry] = useState<{ name: string }[]>([]);
  const [goals, setGoals] = useState<NutritionGoals>({ ...EMPTY_GOALS });
  const [templates, setTemplates] = useState<MealPlanTemplate[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!user) return;
    loadGoals(user.uid).then(setGoals);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q1 = query(collection(db, 'recipes'), where('ownerId', '==', user.uid));
    const unsub1 = onSnapshot(q1, (snap) =>
      setRecipes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Recipe)))
    );

    const q2 = query(collection(db, 'mealplan'), where('ownerId', '==', user.uid));
    const unsub2 = onSnapshot(q2, (snap) => {
      const m: Record<number, DayPlan> = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        // portions fehlt bei älteren Einträgen (vor diesem Feature) — Default 1.
        m[data.day as number] = { recipeId: data.recipeId as string, portions: (data.portions as number) || 1 };
      });
      setPlan(m);
    });

    const q3 = query(collection(db, 'shopping'), where('ownerId', '==', user.uid));
    const unsub3 = onSnapshot(q3, (snap) =>
      setShopping(
        snap.docs.map((d) => {
          const data = d.data();
          return { id: d.id, name: data.name as string, amount: data.amount as number | undefined, unit: data.unit as string | undefined };
        })
      )
    );

    const q4 = query(collection(db, 'pantry'), where('ownerId', '==', user.uid));
    const unsub4 = onSnapshot(q4, (snap) =>
      setPantry(snap.docs.map((d) => ({ name: d.data().name as string })))
    );

    const q5 = query(collection(db, 'mealplanTemplates'), where('ownerId', '==', user.uid));
    const unsub5 = onSnapshot(q5, (snap) =>
      setTemplates(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MealPlanTemplate)))
    );

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
    };
  }, [user]);

  const assign = async (day: number, recipeId: string) => {
    if (!user) return;
    try {
      if (!recipeId) {
        if (plan[day]) await deleteDoc(doc(db, 'mealplan', `${user.uid}_${day}`));
      } else {
        // Portionen bei Rezeptwechsel beibehalten, statt auf 1 zurückzusetzen.
        const portions = plan[day]?.portions ?? 1;
        await setDoc(doc(db, 'mealplan', `${user.uid}_${day}`), { ownerId: user.uid, day, recipeId, portions });
      }
    } catch (err: any) {
      showToast(err?.message ?? 'Speichern fehlgeschlagen');
    }
  };

  const setPortions = async (day: number, portions: number) => {
    if (!user || !plan[day] || portions < 1) return;
    try {
      await updateDoc(doc(db, 'mealplan', `${user.uid}_${day}`), { portions });
    } catch (err: any) {
      showToast(err?.message ?? 'Speichern fehlgeschlagen');
    }
  };

  const plannedEntries = useMemo(
    () =>
      Object.values(plan)
        .map((dp) => {
          const recipe = recipes.find((r) => r.id === dp.recipeId);
          return recipe ? { recipe, portions: dp.portions } : null;
        })
        .filter((e): e is { recipe: Recipe; portions: number } => e !== null),
    [plan, recipes]
  );

  const weeklyTotals: NutritionGoals = useMemo(
    () => ({
      kcal: plannedEntries.reduce((s, e) => s + (e.recipe.estimated_nutrition?.kcal ?? 0) * e.portions, 0),
      protein_g: plannedEntries.reduce((s, e) => s + (e.recipe.estimated_nutrition?.protein_g ?? 0) * e.portions, 0),
      carbs_g: plannedEntries.reduce((s, e) => s + (e.recipe.estimated_nutrition?.carbs_g ?? 0) * e.portions, 0),
      fat_g: plannedEntries.reduce((s, e) => s + (e.recipe.estimated_nutrition?.fat_g ?? 0) * e.portions, 0),
    }),
    [plannedEntries]
  );
  const totalKcal = Math.round(weeklyTotals.kcal);

  const pantryHits = useMemo(() => {
    const pantryNames = new Set(pantry.map((p) => p.name.trim().toLowerCase()));
    const names = new Set<string>();
    for (const e of plannedEntries) {
      for (const ing of e.recipe.ingredients) {
        if (pantryNames.has(ing.name.trim().toLowerCase())) names.add(ing.name.trim());
      }
    }
    return Array.from(names);
  }, [plannedEntries, pantry]);

  // Name+Einheit als Schlüssel: unterschiedliche Einheiten werden nicht vermischt,
  // sondern als eigene Positionen behandelt (statt eine davon still zu verwerfen).
  const shoppingKey = (name: string, unit: string) => `${name.trim().toLowerCase()}|${unit.trim().toLowerCase()}`;

  const addWeekToShopping = async () => {
    if (!user || !plannedEntries.length) return;
    setStatus('');
    const agg = new Map<string, { name: string; amount: number; unit: string }>();
    for (const e of plannedEntries) {
      // Zutatenmengen auf die geplante Portionenzahl skalieren, nicht die
      // volle Rezeptmenge annehmen.
      const scaled = scaleIngredients(e.recipe.ingredients, e.recipe.servings, e.portions).ingredients;
      for (const ing of scaled) {
        const key = shoppingKey(ing.name, ing.unit);
        const existing = agg.get(key);
        if (existing) {
          existing.amount += ing.amount;
        } else {
          agg.set(key, { name: ing.name.trim(), amount: ing.amount, unit: ing.unit });
        }
      }
    }

    const pantryNames = new Set(pantry.map((p) => p.name.trim().toLowerCase()));
    const existingByKey = new Map(shopping.map((s) => [shoppingKey(s.name, s.unit ?? ''), s]));
    let added = 0;
    let merged = 0;
    let inPantry = 0;
    const batch = writeBatch(db);
    for (const v of agg.values()) {
      if (pantryNames.has(v.name.trim().toLowerCase())) {
        inPantry++;
        continue;
      }
      const existing = existingByKey.get(shoppingKey(v.name, v.unit));
      if (existing) {
        batch.update(doc(db, 'shopping', existing.id), { amount: (existing.amount ?? 0) + v.amount });
        merged++;
      } else {
        batch.set(doc(collection(db, 'shopping')), {
          ownerId: user.uid,
          name: v.name,
          category: categorize(v.name),
          amount: v.amount,
          unit: v.unit,
          done: false,
        });
        added++;
      }
    }
    try {
      await batch.commit();
      setStatus(
        `${added} Zutat(en) hinzugefügt` +
          (merged ? `, ${merged} Menge(n) aktualisiert` : '') +
          (inPantry ? `, ${inPantry} schon im Vorrat übersprungen` : '') +
          '.'
      );
    } catch (err: any) {
      showToast(err?.message ?? 'Einkaufsliste aktualisieren fehlgeschlagen');
    }
  };

  const saveTemplate = async () => {
    if (!user || !templateName.trim() || !Object.keys(plan).length) return;
    try {
      await addDoc(collection(db, 'mealplanTemplates'), {
        ownerId: user.uid,
        name: templateName.trim(),
        days: plan,
        createdAt: Date.now(),
      });
      setTemplateName('');
    } catch (err: any) {
      showToast(err?.message ?? 'Vorlage speichern fehlgeschlagen');
    }
  };

  const applyTemplate = async (t: MealPlanTemplate) => {
    if (!user) return;
    if (!window.confirm(`Vorlage "${t.name}" anwenden? Die aktuelle Wochenplanung wird ersetzt.`)) return;
    const validRecipeIds = new Set(recipes.map((r) => r.id).filter((id): id is string => Boolean(id)));
    const { toSet, toDelete } = computeTemplateApply(plan, t.days, validRecipeIds);
    const batch = writeBatch(db);
    for (const [day, dp] of toSet) {
      batch.set(doc(db, 'mealplan', `${user.uid}_${day}`), { ownerId: user.uid, day, recipeId: dp.recipeId, portions: dp.portions });
    }
    for (const day of toDelete) {
      batch.delete(doc(db, 'mealplan', `${user.uid}_${day}`));
    }
    try {
      await batch.commit();
    } catch (err: any) {
      showToast(err?.message ?? 'Vorlage anwenden fehlgeschlagen');
    }
  };

  const removeTemplate = async (id?: string) => {
    if (!id) return;
    if (!window.confirm('Vorlage wirklich löschen?')) return;
    try {
      await deleteDoc(doc(db, 'mealplanTemplates', id));
    } catch (err: any) {
      showToast(err?.message ?? 'Vorlage löschen fehlgeschlagen');
    }
  };

  return (
    <div className="page">
      <h2>Wochenplan</h2>

      {totalKcal > 0 && <p>🔥 Wochensumme: {totalKcal} kcal</p>}

      {hasGoals(goals) && (
        <div className="goals">
          <h3>Wochenziel</h3>
          {GOAL_LABELS.map(({ key, label, unit }) => {
            const target = goals[key] * 7;
            if (!target) return null;
            const actual = Math.round(weeklyTotals[key]);
            const pct = Math.min(100, Math.round((actual / target) * 100));
            return (
              <div className="goal-row" key={key}>
                <span className="meta">
                  {label}: {actual} / {target} {unit} ({pct}%)
                </span>
                <div className="goal-bar">
                  <div className="goal-bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button className="primary" onClick={addWeekToShopping} disabled={!plannedEntries.length}>
        Zutaten der Woche auf Einkaufsliste
      </button>
      {pantryHits.length > 0 && (
        <p className="meta">Schon im Vorrat (wird nicht hinzugefügt): {pantryHits.join(', ')}</p>
      )}
      {status && <p className="meta">{status}</p>}

      {DAYS.map((label, day) => {
        const dp = plan[day];
        const r = recipes.find((x) => x.id === dp?.recipeId);
        return (
          <div className="card" key={day}>
            <strong>{label}</strong>
            <select value={dp?.recipeId ?? ''} onChange={(e) => assign(day, e.target.value)}>
              <option value="">— frei —</option>
              {recipes.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.title}
                </option>
              ))}
            </select>
            {r && (
              <div className="meta">
                <label>
                  Portionen:{' '}
                  <input
                    type="number"
                    min={1}
                    value={dp?.portions ?? 1}
                    onChange={(e) => setPortions(day, Number(e.target.value) || 1)}
                    style={{ width: '4em', display: 'inline-block' }}
                  />
                </label>
                {r.estimated_nutrition && <span>🔥 {Math.round(r.estimated_nutrition.kcal * (dp?.portions ?? 1))} kcal</span>}
              </div>
            )}
          </div>
        );
      })}

      <h3>Vorlagen</h3>
      <div className="new-folder">
        <input
          placeholder="Vorlagenname…"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && saveTemplate()}
        />
        <button onClick={saveTemplate} disabled={!templateName.trim() || !Object.keys(plan).length}>
          Aktuelle Woche speichern
        </button>
      </div>
      {templates.length === 0 && <p className="meta">Noch keine Vorlagen gespeichert.</p>}
      <ul>
        {templates.map((t) => (
          <li key={t.id}>
            {t.name}{' '}
            <span className="meta">({Object.keys(t.days).length} Tag(e) belegt)</span>
            <button onClick={() => applyTemplate(t)}>Anwenden</button>
            <button onClick={() => removeTemplate(t.id)}>×</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
