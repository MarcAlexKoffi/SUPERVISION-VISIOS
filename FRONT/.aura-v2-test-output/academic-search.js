"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeAcademicSearch = normalizeAcademicSearch;
exports.matchesAcademicSearch = matchesAcademicSearch;
exports.filterAcademicUes = filterAcademicUes;
/** Recherche académique : accents, casse et espaces indifférents. Aucun état métier n'est modifié. */
function normalizeAcademicSearch(value) {
    return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').trim();
}
function matchesAcademicSearch(query, ...fields) {
    const value = normalizeAcademicSearch(query);
    return !value || normalizeAcademicSearch(fields.join(' ')).includes(value);
}
/** Options UE : recherche par code ou intitulé, sans changer les ID ni l'ordre. */
function filterAcademicUes(ues, query) {
    return ues.filter(ue => matchesAcademicSearch(query, ue.code, ue.name));
}
