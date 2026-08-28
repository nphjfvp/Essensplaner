export interface DayPlan {
  recipeId: string;
  portions: number;
}

export interface MealPlanTemplate {
  id?: string;
  ownerId: string;
  name: string;
  days: Record<number, DayPlan>; // Tag (0=Montag..6=Sonntag) -> Rezept + Portionen
  createdAt?: number;
}

interface ApplyOps {
  toSet: [number, DayPlan][];
  toDelete: number[];
}

// Berechnet die nötigen Schreib-/Löschoperationen, um die aktuell geplante
// Woche durch eine Vorlage zu ersetzen. Verweist die Vorlage auf ein
// inzwischen gelöschtes Rezept, wird dieser Tag einfach freigelassen statt
// einen kaputten Verweis zu setzen. Unveränderte Tage (Rezept UND
// Portionen gleich) werden ausgelassen, um unnötige Firestore-Writes zu
// vermeiden.
export function computeTemplateApply(
  currentPlan: Record<number, DayPlan>,
  templateDays: Record<number, DayPlan>,
  validRecipeIds: Set<string>
): ApplyOps {
  const toSet: [number, DayPlan][] = [];
  const toDelete: number[] = [];
  for (let day = 0; day < 7; day++) {
    const templateEntry = templateDays[day];
    const isValid = Boolean(templateEntry?.recipeId) && validRecipeIds.has(templateEntry.recipeId);
    if (isValid) {
      const current = currentPlan[day];
      if (current?.recipeId !== templateEntry.recipeId || current?.portions !== templateEntry.portions) {
        toSet.push([day, templateEntry]);
      }
    } else if (currentPlan[day]) {
      toDelete.push(day);
    }
  }
  return { toSet, toDelete };
}
