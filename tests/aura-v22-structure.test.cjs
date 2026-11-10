'use strict';
// Approved AURA V2.3 upgrades the common search component while preserving V2.2 invariants.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const planning = read('FRONT/src/app/plannings/plannings.html');
const planningTs = read('FRONT/src/app/plannings/plannings.ts');
const planningCss = read('FRONT/src/app/plannings/plannings.scss');

test('V2.2->V2.3: planning session editor stays a right-hand drawer', () => {
  assert.match(planning, /class="aura-planning-modal"/);
  assert.match(planning, /class="aura-planning-drawer"/);
  assert.match(planningCss, /\.aura-planning-modal\s*\{[^}]*justify-content:flex-end/s);
  assert.match(planningCss, /\.aura-planning-drawer-body\s*\{[^}]*overflow-y:auto/s);
  assert.match(planningCss, /\.aura-planning-drawer-footer\s*\{[^}]*flex:none/s);
});
test('V2.2->V2.3: UE uses a single searchable field with stable business ID', () => {
  assert.match(planning, /<app-academic-search-select[^>]*\[options\]="ues"[^>]*valueField="id"/s);
  assert.match(planning, /\(valueChange\)="onModalUeSelected\(\$event\)"/);
  assert.doesNotMatch(planning, /\[\(ngModel\)\]="modalData\.ue_id"/);
  assert.match(planningTs, /onModalUeSelected\([\s\S]*?this\.modalData\.ue_id = value \? String\(value\) : undefined;/);
});
test('V2.2->V2.3: free UE text invalidates an old selected ID', () => {
  const search = read('FRONT/src/app/shared/components/academic-search-select/academic-search-select.ts');
  assert.match(search, /if \(this\.chosen && next !== previousLabel\)/);
  assert.match(search, /this\.valueChange\.emit\(this\.emptyValue\)/);
});
test('V2.2: extra-curricular activities stay independent; exams are the explicit exception', () => {
  assert.match(planning, /\(click\)="setActivityMode\(true\)"/);
  assert.match(planningTs, /setActivityMode\(activity: boolean\)/);
  assert.match(planningTs, /this\.modalData\.ue_id = null;/);
  assert.match(planning, /\*ngIf="!isActivityMode \|\| isExamMode"/);
  assert.match(planning, /\*ngIf="isActivityMode && !isExamMode"/);
});
test('V2.2: complete administrative shell remains enabled', () => {
  const html = read('FRONT/src/app/admindashboard/admindashboard.html');
  assert.match(html, /class="aura-academic-shell /);
  assert.doesNotMatch(html, /\[class\.aura-academic-shell\]/);
  assert.match(html, /\{\{ currentPageLabel \}\}/);
});
test('V2.2: save, linked supervision and PDF remain reachable', () => {
  assert.match(planning, /\(click\)="savePlanning\(\)"/);
  assert.match(planning, /\(click\)="openSupervision\(plan\)"/);
  assert.match(planning, /\(click\)="exportPDF\(\)"/);
});
test('V2.3: shared searchable chooser returns business values independently from labels', () => {
  const component = read('FRONT/src/app/shared/components/academic-search-select/academic-search-select.ts');
  const html = read('FRONT/src/app/shared/components/academic-search-select/academic-search-select.html');
  assert.match(component, /optionValue\(option: any\)/);
  assert.match(component, /option\[this\.valueField\]/);
  assert.match(component, /normalizeAcademicSearch/);
  assert.match(component, /this\.valueChange\.emit\(this\.optionValue\(option\)\)/);
  assert.match(html, /role="combobox"/);
  assert.match(component, /setAttribute\('role','listbox'\)/);
  assert.match(html, /onKeydown\(\$event\)/);
});
test('V2.2->V2.3: synchronous and asynchronous supervision keep historical UE value types', () => {
  const sync = read('FRONT/src/app/supervision-form/supervision-form.html');
  const async = read('FRONT/src/app/async-supervision-form/async-supervision-form.html');
  assert.match(sync, /<app-academic-search-select[^>]*valueField="code"/s);
  assert.match(sync, /onUeCodeSelected\(\$event\)/);
  assert.match(async, /<app-academic-search-select[^>]*valueField="id"/s);
  assert.match(async, /formData\.ueId\s*=\s*\$event/);
});
test('V2.2->V2.3: history and my-history still filter by course name', () => {
  const history = read('FRONT/src/app/history/history.html');
  const userHistory = read('FRONT/src/app/user-history/user-history.html');
  assert.match(history, /<app-academic-search-select[^>]*valueField="name"/s);
  assert.match(userHistory, /<app-academic-search-select[^>]*\[options\]="courses"/s);
  assert.match(history, /onCourseSelected\(\$event\)/);
  assert.match(userHistory, /onCourseSelected\(\$event\)/);
});
