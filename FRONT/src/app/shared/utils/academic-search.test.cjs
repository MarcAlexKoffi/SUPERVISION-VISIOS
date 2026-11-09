const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { normalizeAcademicSearch, matchesAcademicSearch, filterAcademicUes } = require(path.resolve(__dirname, '../../../../.aura-v2-test-output/academic-search.js'));

test('accent, casse et espace de fin ne bloquent pas la recherche', () => {
  assert.equal(normalizeAcademicSearch('  AÏCHA Koné '), 'aicha kone');
  assert.ok(matchesAcademicSearch('KONE', 'Aïcha', 'Koné'));
  assert.ok(matchesAcademicSearch('aicha', 'Aïcha', 'Koné'));
});
test('recherche au sein des noms, des emails et des parcours', () => {
  assert.ok(matchesAcademicSearch('ENS-032', 'Aïcha Koné', 'ENS-032', 'Gestion'));
  assert.ok(matchesAcademicSearch('informatique', 'Licence 3 - Informatique A'));
  assert.ok(matchesAcademicSearch('fouad@exemple.test', 'Fouad', 'fouad@exemple.test'));
  assert.equal(matchesAcademicSearch('aucun', 'Aïcha Koné', 'Gestion'), false);
});
test('recherche vide = aucune restriction des lignes', () => {
  assert.ok(matchesAcademicSearch('', 'Aïcha Koné'));
  assert.ok(matchesAcademicSearch('  ', 'Aïcha Koné'));
});

const ueOptions = [
  { id: 'ue-fin-1', code: 'FIN-201', name: 'Mathématiques financières' },
  { id: 'ue-eco-2', code: 'ECO-105', name: 'Économie générale' },
  { id: 'ue-eng-3', code: 'ENG-009', name: 'Anglais des affaires' },
];
test('UE : recherche par code indépendamment de la casse', () => {
  assert.deepEqual(filterAcademicUes(ueOptions, 'fin-201').map(u => u.id), ['ue-fin-1']);
});
test('UE : recherche par intitulé indépendamment des accents et espaces', () => {
  assert.deepEqual(filterAcademicUes(ueOptions, '  economie GENERALE ').map(u => u.id), ['ue-eco-2']);
});
test('UE : résultat vide sans perte d’ID et sans mutation de la liste', () => {
  assert.deepEqual(filterAcademicUes(ueOptions, 'AUCUNE'), []);
  assert.deepEqual(filterAcademicUes(ueOptions, '').map(u => u.id), ['ue-fin-1','ue-eco-2','ue-eng-3']);
  assert.equal(ueOptions[0].id, 'ue-fin-1');
});
