'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = r => fs.readFileSync(path.join(root,r),'utf8');
const select = read('FRONT/src/app/shared/components/academic-search-select/academic-search-select.ts');
const selectHtml = read('FRONT/src/app/shared/components/academic-search-select/academic-search-select.html');
const dash = read('FRONT/src/app/dashboard-home/dashboard-home.ts');
const dashHtml = read('FRONT/src/app/dashboard-home/dashboard-home.html');

test('V2.3: topbar is not scrolled with the page body', () => {
 const shell = read('FRONT/src/app/admindashboard/admindashboard.html');
 const css = read('FRONT/src/app/admindashboard/admindashboard.scss');
 assert.match(shell, /aura-shell-main[^\"]*overflow-y-auto/);
 assert.match(css, /\.aura-academic-shell \.(?:aura-topbar)\s*\{[^}]*position:sticky!important;top:0!important;/s);
 assert.match(css, /\.aura-academic-shell \.(?:aura-shell-main)\s*\{[^}]*overflow-y:auto!important;/s);
});
test('V2.3: dashboard uses true planning data, period-scoped KPIs and a visible error state', () => {
 assert.match(dash,/this\.planningService\.getPlannings\(\)/);
 assert.match(dash,/dashboardWeekPlans\(\): Planning\[\]/);
 assert.match(dash,/dashboardProgressPercent/);
 assert.match(dashHtml,/dashboardLoadState==='error'/);
 assert.match(dashHtml,/dashboardLoadState==='ready'\? dashboardPlannedCount : '—'/);
});
test('V2.3: dashboard provides actionable priorities, search and links without writes', () => {
 assert.match(dashHtml,/Prochaines actions/);
 assert.match(dashHtml,/dashboardPriorities/);
 assert.match(dashHtml,/dashboardSearch/);
 assert.match(dashHtml,/routerLink="\/admin\/plannings"/);
 assert.match(dashHtml,/\[queryParams\]="\{add:1\}"/);
});
test('V2.3: dashboard preserves historic UE list and local data restoration', () => {
 assert.match(dashHtml,/restoreLocalUEs\(\)/);
 assert.match(dashHtml,/<details class="aura-dash-legacy">/);
 assert.match(dashHtml,/\(click\)="openViewModal\(ue\)"/);
 assert.match(dashHtml,/\(ngSubmit\)="saveUE\(\)"/);
});
test('V2.3: users without an ID never receive an unfiltered activity feed', () => {
 assert.match(dash,/if \(!this\.isAdmin && !activityUserId\)/);
 assert.match(dash,/this\.activityLoadState = 'error'/);
 assert.match(dash,/this\.activityService\.getRecentActivities\(5, this\.isAdmin \? undefined : String\(activityUserId\)\)/);
});
test('V2.3: the common popup is rendered outside drawer clipping and removed on destruction', () => {
 assert.match(select,/document\.body\.appendChild\(this\.popup\)/);
 assert.match(select,/this\.popup\?\.remove\(\)/);
 assert.match(select,/getBoundingClientRect/);
 assert.match(select,/window\.innerHeight/);
 assert.match(select,/window\.removeEventListener\('resize'/);
});
test('V2.3: common search preserves keyboard, labels and business IDs', () => {
 assert.match(select,/event\.key === 'ArrowDown'/);
 assert.match(select,/event\.key === 'ArrowUp'/);
 assert.match(select,/event\.key === 'Escape'/);
 assert.match(select,/event\.key === 'Enter'/);
 assert.match(selectHtml,/aria-autocomplete="list"/);
 assert.match(select,/b\.setAttribute\('role','option'\)/);
 assert.match(select,/primary\.textContent=label/);
 assert.match(select,/this\.valueChange\.emit\(this\.emptyValue\)/);
});
test('V2.3: all relevant screens use the shared searchable component', () => {
 const screenNames=['plannings','supervision-form','async-supervision-form','history','user-history','classes','teachers','ues','dashboard-home'];
 for(const route of screenNames) assert.match(read(`FRONT/src/app/${route}/${route}.html`),/<app-academic-search-select/,`Search absent: ${route}`);
});
test('V2.3: class, teacher and UE all use a single searchable control in Planning drawer', () => {
 const html=read('FRONT/src/app/plannings/plannings.html');
 for(const selector of ['databaseClasses','ues','teachers']) assert.match(html,new RegExp(`<app-academic-search-select[^>]*\\[options\\]="${selector}"`), selector);
 const ts=read('FRONT/src/app/plannings/plannings.ts');
 for(const action of ['onModalClassSelected','onModalUeSelected','onModalTeacherSelected']) assert.match(ts,new RegExp(action+'\\(value: string \\| number \\| null\\)'));
 assert.match(ts,/if \(!this\.modalClassId\) \{ this\.modalData\.parcours = ''/);
});
test('V2.3: simple status and session-type controls remain their existing inputs', () => {
 const html=read('FRONT/src/app/plannings/plannings.html');
 assert.match(html,/<select id="auraPlanningStatus"/);
 assert.match(html,/<input[^>]*type="radio"[^>]*\[\(ngModel\)\]="modalData\.session_type"/s);
});
test('V2.3: approval preserves planning guards, links and no Firebase rules edits', () => {
 const ts=read('FRONT/src/app/plannings/plannings.ts');
 assert.match(ts,/this\.planningService\.createPlanning/);
 assert.match(ts,/this\.planningService\.updatePlanning/);
 // V2.4 replaces immediate writes with a confirmed in-app action.
 assert.match(ts,/confirmActionDialog\(\)/);
 assert.match(ts,/this\.planningService\.updatePlanning\(String\(plan\.id\),/);
 assert.match(read('FRONT/src/app/supervision-form/supervision-form.ts'),/linkedPlanningId/);
});
test('V2.3: copied Angular template does not duplicate a search-select binding', () => {
 for(const route of ['supervision-form','async-supervision-form']) {
  const html=read(`FRONT/src/app/${route}/${route}.html`);
  for(const tag of html.match(/<app-academic-search-select[\s\S]*?>/g)||[]) {
   assert.equal((tag.match(/\[detailFields\]/g)||[]).length<=1,true,`Duplicate [detailFields] in ${route}`);
  }
 }
});
