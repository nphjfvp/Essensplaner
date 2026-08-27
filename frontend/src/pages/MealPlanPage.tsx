import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import type { Recipe } from '../lib/types';

const DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

export default function MealPlanPage() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [plan, setPlan] = useState<Record<number, string>>({});

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

    return () => {
      unsub1();
      unsub2();
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

  return (
    <div className="page">
      <h2>Wochenplan</h2>
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
