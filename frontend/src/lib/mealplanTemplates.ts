export interface MealPlanTemplate {
  id?: string;
  ownerId: string;
  name: string;
  days: Record<number, string>; // Tag (0=Montag..6=Sonntag) -> recipeId
  createdAt?: number;
}

interface ApplyOps {
  toSet: [number, string][];
  toDelete: number[];
}

// Berechnet die nötigen Schreib-/Löschoperationen, um die aktuell geplante
// Woche durch eine Vorlage zu ersetzen. Verweist die Vorlage auf ein
// inzwischen gelöschtes Rezept, wird dieser Tag einfach freigelassen statt
// einen kaputten Verweis zu setzen. Unveränderte Tage werden ausgelassen,
// um unnötige Firestore-Writes zu vermeiden.
export function computeTemplateApply(
  currentPlan: Record<number, string>,
  templateDays: Record<number, string>,
  validRecipeIds: Set<string>
): ApplyOps {
  const toSet: [number, string][] = [];
  const toDelete: number[] = [];
  for (let day = 0; day < 7; day++) {
    const templateRecipeId = templateDays[day];
    const isValid = Boolean(templateRecipeId) && validRecipeIds.has(templateRecipeId);
    if (isValid) {
      if (currentPlan[day] !== templateRecipeId) toSet.push([day, templateRecipeId]);
    } else if (currentPlan[day]) {
      toDelete.push(day);
    }
  }
  return { toSet, toDelete };
}
