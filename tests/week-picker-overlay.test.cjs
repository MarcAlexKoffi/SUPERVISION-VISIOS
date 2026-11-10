'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../FRONT/node_modules/typescript');
const src = fs.readFileSync(path.join(__dirname,'../FRONT/src/app/shared/utils/week-picker-overlay.ts'),'utf8');
const js = ts.transpileModule(src, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const moduleShim = {exports:{}};
new Function('module','exports',js)(moduleShim,moduleShim.exports);
const {WeekPickerOverlay} = moduleShim.exports;

class Element {
  constructor(tag){this.tagName=tag;this.children=[];this.attributes=new Map();this.events=new Map();this.dataset={};this.style={};this.parentElement=null;this._text='';this._class='';this.focused=false;}
  set className(value){this._class=String(value);} get className(){return this._class;}
  get classList(){return {add: n => {this._class=(this._class+' '+n).trim();},contains:n=>this._class.split(' ').includes(n)};}
  get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}
  set textContent(value){this._text=String(value);this.children.forEach(c=>c.parentElement=null);this.children=[];}
  setAttribute(key,value){this.attributes.set(key,String(value));}
  getAttribute(key){return this.attributes.get(key)||null;}
  getAttributeNames(){return [...this.attributes.keys()];}
  appendChild(child){child.parentElement?.removeChild(child);this.children.push(child);child.parentElement=this;return child;}
  removeChild(child){const i=this.children.indexOf(child);if(i>=0){this.children.splice(i,1);child.parentElement=null;}return child;}
  replaceChildren(...children){for(const child of this.children)child.parentElement=null;this.children=[];children.forEach(c=>this.appendChild(c));this._text='';}
  remove(){this.parentElement?.removeChild(this);}
  addEventListener(type,fn){if(!this.events.has(type))this.events.set(type,[]);this.events.get(type).push(fn);}
  click(){for(const handler of this.events.get('click')||[])handler({preventDefault(){}});}
  focus(){this.focused=true;}
  get scrollHeight(){return 330;}
  get isConnected(){return !!this.parentElement;}
  getBoundingClientRect(){return {width:260,height:320,top:120,bottom:165,left:150,right:410};}
  contains(node){return this===node||this.children.some(c=>c.contains(node));}
  querySelector(selector){
    const found=this.querySelectorAll(selector);return found[0]||null;
  }
  querySelectorAll(selector){
    const matches=node=>{
      if(selector==='strong')return node.tagName==='strong';
      if(selector.startsWith('.'))return node.classList.contains(selector.slice(1));
      const dataset=/^\[data-month-direction="(-?\d+)"\]$/.exec(selector);
      return dataset && node.dataset.monthDirection===dataset[1];
    };
    let all=[];for(const c of this.children){if(matches(c))all.push(c);all.push(...c.querySelectorAll(selector));}return all;
  }
}
const makeDay=(year,month,date)=>new Date(year,month,date,12);
const dayKey=date=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');

test('Popup click events are bound to real DOM-owned buttons, not transplanted Angular nodes',()=>{
  const oldDocument=global.document, oldWindow=global.window;
  const body=new Element('body');
  global.document={body, createElement:tag=>new Element(tag)};
  global.window={innerWidth:1280,innerHeight:900};
  try{
    const trigger=new Element('button');trigger.setAttribute('_ngcontent-ng-c42','');body.appendChild(trigger);
    let month=makeDay(2026,10,1),selected=null,changed=0;
    const options={
      monthLabel:()=>month.toLocaleDateString('fr-FR',{month:'long',year:'numeric'}),
      days:()=>Array.from({length:42},(_,i)=>makeDay(month.getFullYear(),month.getMonth(),i-2)),
      isOutsideMonth:day=>day.getMonth()!==month.getMonth(),
      isInSelectedWeek:day=>dayKey(day)==='2026-11-10',
      isToday:day=>dayKey(day)==='2026-11-10',
      onChangeMonth:delta=>{changed++;month=makeDay(month.getFullYear(),month.getMonth()+delta,1);popup.render();},
      onSelectDay:day=>{selected=dayKey(day);popup.close();},
      onToday:()=>{selected='today';popup.close();}
    };
    const popup=new WeekPickerOverlay(trigger,options);
    popup.open();
    assert.equal(popup.element?.parentElement,body);
    assert.ok(popup.element?.getAttributeNames().includes('_ngcontent-ng-c42'));
    assert.equal(popup.element?.querySelectorAll('.aura-week-popup-grid').length,1);
    const previous=popup.element.querySelector('[data-month-direction="-1"]');
    previous.click();
    assert.equal(changed,1);
    assert.match(popup.element.querySelector('strong').textContent,/octobre/i);
    const chosen=popup.element.children[1].children.find(d=>d.getAttribute('aria-label')==='Afficher la semaine du 13/10/2026');
    assert.ok(chosen,'button 13 october exists');
    assert.ok(chosen.getAttributeNames().includes('_ngcontent-ng-c42'));
    chosen.click();
    assert.equal(selected,'2026-10-13');
    assert.equal(popup.element,null);
    assert.equal(body.children.length,1);
    popup.open();
    assert.equal(body.children.length,2);
    popup.close();
    assert.equal(body.children.length,1);
  }finally{global.document=oldDocument;global.window=oldWindow;}
});


test('TypeScript strict : week-picker overlay compiles with noPropertyAccessFromIndexSignature', () => {
  const file = path.join(__dirname, '../FRONT/src/app/shared/utils/week-picker-overlay.ts');
  const program = ts.createProgram([file], {
    strict: true,
    noEmit: true,
    noPropertyAccessFromIndexSignature: true,
    target: ts.ScriptTarget.ES2022,
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
    types: [],
    skipLibCheck: true
  });
  const errors = ts.getPreEmitDiagnostics(program).filter(d => d.category === ts.DiagnosticCategory.Error);
  const detail = ts.formatDiagnosticsWithColorAndContext(errors, {
    getCanonicalFileName: f => f,
    getCurrentDirectory: () => __dirname,
    getNewLine: () => '\n'
  });
  assert.equal(errors.length, 0, detail);
});
