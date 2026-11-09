// ATLAS / AURA V2.3.1 – checks style-only changes and fixed shell invariants.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const base = path.join(__dirname, '..', 'FRONT', 'src');
const get = relative => fs.readFileSync(path.join(base, relative), 'utf8');
const hash = s => crypto.createHash('sha256').update(s.replace(/\r\n/g, '\n')).digest('hex');
const original = {"ues": "f86efe17791787d3232a3a3fb97a866a6c7b6399bbe67c92aad1cb6b3e5290e7", "users": "61a9d4e8ecd4039ea9093f50f23de673458c92a349c90f16f2fe2a4e2e6591a9", "formations": "45825fccdd75a4b1fb94405eefe04d999507395dc814da402d31a8c2683589fd", "classes": "3186b2f36134ecc7bb210b0ce444a8ff67d0df841f7c40e5c69de170a814ffe9", "history": "bd49316b25c1a42b792de27dcf9229c45e97c459bf9da230115c6132aee7bca9", "user-history": "deb783cdfd8d668c1f3e52f76679920f30eb4a5c86cdd0d37a8e684c464fcce8", "honoraires": "da042f982f0bfb1c82bb31478a63f5ccb5ea870fe195349cc4c1fee4c79a5e68", "user-dashboard": "191a5c0e75b60ef0e6f3473c8c3c67e41cdbbd8562de95ce6bf0d0fcea15ad77", "supervision-form": "874276b895372468c5e555a3180f8e12f194b5046b6018b22d4431468a044de9", "async-supervision-form": "dd110e1481ad09c08b969621187cc7ab233002e2a23749b4b319f1fb48343d1e"};
const tokens = ["aura-uniform-page ", "aura-form-page ", "aura-ui-primary ", "aura-ui-secondary ", "aura-ui-card ", "aura-ui-avatar "];
const screens = ['ues', 'users', 'formations', 'classes', 'history', 'user-history', 'honoraires', 'user-dashboard'];
const forms = ['supervision-form','async-supervision-form'];

test('Toutes les rubriques secondaires utilisent un gabarit visuel harmonise', () => {
  for (const name of screens) assert.match(get(`app/${name}/${name}.html`), /class="aura-uniform-page /, name);
  for (const name of forms) assert.match(get(`app/${name}/${name}.html`), /class="aura-form-page /, name);
});
test('Seules des classes de style ont ete ajoutees aux templates : bindings et flux inchanges', () => {
  for (const [name, before] of Object.entries(original)) {
    let now = get(`app/${name}/${name}.html`);
    // The UE selector is deliberately upgraded in AURA V2.4 (stable teacher ID).
    // Keep the V2.3.1 visual shell check, delegate new behavior to V2.4 tests.
    if (name === 'ues') {
      assert.match(now, /aura-uniform-page/);
      assert.match(now, /onResponsibleTeacherSelected\(\$event\)/);
      continue;
    }
    for (const token of tokens) now = now.split(token).join('');
    assert.equal(hash(now), before, name);
  }
});
test('Enseignants et Planning ne sont pas remplaces par cette harmonisation', () => {
  assert.match(get('app/teachers/teachers.html'), /aura-teachers-page/);
  assert.match(get('app/plannings/plannings.html'), /Ajouter une s[ée]ance|Ajouter au planning/);
});
test('La top bar reste hors de la zone de defilement principale', () => {
  const ts = get('app/admindashboard/admindashboard.html');
  const css = get('app/admindashboard/admindashboard.scss');
  assert.match(ts, /aura-topbar/);
  assert.match(ts, /aura-shell-main flex-1 overflow-y-auto/);
  assert.match(css, /aura-topbar\s*\{position:sticky!important/);
});
test('Les regles transverses concernent uniquement le rendu ecran, pas les impressions', () => {
  const css = get('styles.scss');
  const pos = css.indexOf('AURA V2.3.1 | Harmonisation globale');
  assert.ok(pos > 0);
  assert.match(css.slice(pos), /@media screen\s*\{/);
  assert.doesNotMatch(css.slice(pos), /@media print/);
  assert.match(get('app/supervision-form/supervision-form.html'), /print:/);
  assert.match(get('app/history/history.html'), /hidden print:block/);
});
test('Taille des textes, tableaux, controles et boutons partagees', () => {
  const css = get('styles.scss');
  for (const token of ['--aura-ui-height: 44px','font-size: 28px !important','font-size: 13px !important','.aura-ui-primary','.aura-ui-secondary','.aura-ui-card']) assert.ok(css.includes(token), token);
});
test('Les actions sensibles et les handlers des fiches restent presents', () => {
  assert.match(get('app/ues/ues.html'), /\(click\)="deleteUE\(ue\)"/);
  assert.match(get('app/users/users.html'), /\(click\)="openDeleteModal\(user\)"/);
  assert.match(get('app/supervision-form/supervision-form.html'), /\(click\)="saveForm\(\)"/);
  assert.match(get('app/async-supervision-form/async-supervision-form.html'), /\(click\)="goBack\(\)"/);
});
test('Les nouvelles regles ne modifient pas topbar ou sidebar', () => {
  const css=get('styles.scss');
  const pos=css.indexOf('AURA V2.3.1 | Harmonisation globale');
  const added=css.slice(pos);
  assert.match(added, /aura-academic-shell/);
  assert.doesNotMatch(added, /\.aura-topbar\s*\{/);
  assert.doesNotMatch(added, /\.aura-sidebar\s*\{/);
});
