/** Addition sans double comptage de classes ; aucun appel Firestore. */
export interface ClassWithEnrollment {
  id?: string | null;
  name: string;
  effectif?: number | null;
}
export function combinedEnrollment(classes: readonly ClassWithEnrollment[], ids: readonly string[]): {
  total: number; missing: string[]; names: string[];
} {
  const chosen = new Set(ids.map(String));
  const seen = new Set<string>();
  const missing: string[] = [];
  const names: string[] = [];
  let total = 0;
  for (const cls of classes) {
    const id = String(cls.id || '');
    if (!id || !chosen.has(id) || seen.has(id)) continue;
    seen.add(id);
    names.push(cls.name);
    const number = cls.effectif === null || cls.effectif === undefined ? NaN : Number(cls.effectif);
    if (!Number.isFinite(number) || number < 0) missing.push(cls.name);
    else total += number;
  }
  for (const id of chosen) if (!seen.has(id)) missing.push(`Classe non retrouvée (${id})`);
  return {total, missing, names};
}
