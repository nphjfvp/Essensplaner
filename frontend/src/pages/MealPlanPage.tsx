import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import type { Recipe } from '../lib/types';

const DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

export default function MealPlanPage() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [plan, setPlan] = useState<Record<number, string>>({});
  const [shopping, setShopping] = useState<{ name: string }[]>([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!user) return;
    const q1 = query(collection(db, 'recipes'), where('ownerId', '==', user.uid));
    const unsub1 = onSnapshot(q1, (snap) =>
      setRecipes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Recipe)))
    );

    const q2 = query(collection(db, 'mealplan'), where('ownerId', '==', user.uid));
    const unsub2 = onSnapshot(q2, (snap) => {
      const m: Record<number, string> = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        m[data.day as number] = data.recipeId as string;
      });
      setPlan(m);
    });

    const q3 = query(collection(db, 'shopping'), where('ownerId', '==', user.uid));
    const unsub3 = onSnapshot(q3, (snap) =>
      setShopping(snap.docs.map((d) => ({ name: d.data().name as string })))
    );

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [user]);

  const assign = async (day: number, recipeId: string) => {
    if (!user) return;
    if (!recipeId) {
      if (plan[day]) await deleteDoc(doc(db, 'mealplan', `${user.uid}_${day}`));
    } else {
      await setDoc(doc(db, 'mealplan', `${user.uid}_${day}`), { ownerId: user.uid, day, recipeId });
    }
  };

  const plannedRecipes = useMemo(
    () =>
      Object.values(plan)
        .map((rid) => recipes.find((r) => r.id === rid))
        .filter((r): r is Recipe => Boolean(r)),
    [plan, recipes]
  );

  const totalKcal = plannedRecipes.reduce((s, r) => s + (r.estimated_nutrition?.kcal ?? 0), 0);

  const addWeekToShopping = async () => {
    if (!user || !plannedRecipes.length) return;
    const agg = new Map<string, { name: string; amount: number; unit: string }>();
    for (const r of plannedRecipes) {
      for (const ing of r.ingredients) {
        const key = ing.name.trim().toLowerCase();
        const existing = agg.get(key);
        if (!existing) {
          agg.set(key, { name: ing.name.trim(), amount: ing.amount, unit: ing.unit });
        } else if (existing.unit === ing.unit) {
          existing.amount += ing.amount;
        }
      }
    }

    const existingNames = new Set(shopping.map((s) => s.name.trim().toLowerCase()));
    let added = 0;
    let skipped = 0;
    for (const v of agg.values()) {
      if (existingNames.has(v.name.trim().toLowerCase())) {
        skipped++;
        continue;
      }
      await addDoc(collection(db, 'shopping'), {
        ownerId: user.uid,
        name: v.name,
        amount: v.amount,
        unit: v.unit,
        done: false,
      });
      added++;
    }
    setStatus(`${added} Zutat(en) hinzugefügt${skipped ? `, ${skipped} schon auf der Liste` : ''}.`);
  };

  return (
    <div className="page">
      <h2>Wochenplan</h2>

      {totalKcal > 0 && <p>🔥 Wochensumme: {totalKcal} kcal</p>}

      <button className="primary" onClick={addWeekToShopping} disabled={!plannedRecipes.length}>
        Zutaten der Woche auf Einkaufsliste
      </button>
      {status && <p className="meta">{status}</p>}

      {DAYS.map((label, day) => {
        const r = recipes.find((x) => x.id === plan[day]);
        return (
          <div className="card" key={day}>
            <strong>{label}</strong>
            <select value={plan[day] ?? ''} onChange={(e) => assign(day, e.target.value)}>
              <option value="">— frei —</option>
              {recipes.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.title}
                </option>
              ))}
            </select>
            {r?.estimated_nutrition && (
              <span className="meta">🔥 {r.estimated_nutrition.kcal} kcal</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
