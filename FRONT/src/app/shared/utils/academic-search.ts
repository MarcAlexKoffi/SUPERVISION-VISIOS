/** Recherche académique : accents, casse et espaces indifférents. Aucun état métier n'est modifié. */
export function normalizeAcademicSearch(value: unknown): string {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').trim();
}

export function matchesAcademicSearch(query: string, ...fields: unknown[]): boolean {
  const value = normalizeAcademicSearch(query);
  return !value || normalizeAcademicSearch(fields.join(' ')).includes(value);
}

/** Options UE : recherche par code ou intitulé, sans changer les ID ni l'ordre. */
export function filterAcademicUes<T extends { code?: string | null; name?: string | null }>(
  ues: readonly T[], query: string
): T[] {
  return ues.filter(ue => matchesAcademicSearch(query, ue.code, ue.name));
}
