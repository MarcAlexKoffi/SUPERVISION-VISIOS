const fs = require('fs');
let htmlContent = fs.readFileSync('src/app/async-supervision-form/async-supervision-form.html', 'utf8');
const searchString = \                          <div>
                              <label class="block text-sm font-semibold mb-2 text-slate-700">Période (Calendrier)</label>\;
const replacementString = \                          <div>
                              <label class="block text-sm font-semibold mb-2 text-slate-700">Classe</label>
                              <select [(ngModel)]="formData.classe" name="classe" (ngModelChange)="onClassChange()" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0f42a5] focus:border-[#0f42a5] transition-all">
                                  <option value="">Sélectionner une classe</option>
                                  <option *ngFor="let c of classesList" [value]="c.name">{{ c.name }}</option>
                              </select>
                          </div>
                          <div>
                              <label class="block text-sm font-semibold mb-2 text-slate-700">Effectif</label>
                              <input type="number" [(ngModel)]="formData.effectif" name="effectif" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0f42a5] focus:border-[#0f42a5] transition-all">
                          </div>
                          <div>
                              <label class="block text-sm font-semibold mb-2 text-slate-700">Période (Calendrier)</label>\;
htmlContent = htmlContent.replace(searchString, replacementString);

const searchSigs = \                  <!-- Footer & Submit -->\;
const sigs = \                  <!-- Section 3: Signatures -->
                  <section class="space-y-4 pt-4">
                      <div class="flex items-center gap-3 pb-2 border-b border-slate-200">
                          <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-100 text-orange-600">
                              <span class="material-symbols-outlined text-[18px]">draw</span>
                          </div>
                          <h2 class="text-lg font-bold text-slate-800">3. Validations & Signatures</h2>
                      </div>
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div class="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                              <div class="flex justify-between items-center mb-3">
                                  <label class="block text-sm font-bold text-slate-700 uppercase">Superviseur(e)</label>
                                  <button type="button" (click)="clearSignature('supervisor')" class="text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">refresh</span> Effacer</button>
                              </div>
                              <div class="border border-dashed border-slate-300 rounded-lg overflow-hidden bg-white">
                                  <canvas #supervisorCanvas class="w-full h-[140px] touch-none cursor-crosshair" (touchstart)="startDrawing( + '$' + event, 'supervisor')" (touchmove)="draw( + '$' + event, 'supervisor')" (touchend)="stopDrawing()" (mousedown)="startDrawing( + '$' + event, 'supervisor')" (mousemove)="draw( + '$' + event, 'supervisor')" (mouseup)="stopDrawing()" (mouseleave)="stopDrawing()"></canvas>
                              </div>
                          </div>
                          <div class="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                              <div class="flex justify-between items-center mb-3">
                                  <label class="block text-sm font-bold text-slate-700 uppercase">Enseignant(e)</label>
                                  <button type="button" (click)="clearSignature('teacher')" class="text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">refresh</span> Effacer</button>
                              </div>
                              <div class="border border-dashed border-slate-300 rounded-lg overflow-hidden bg-white">
                                  <canvas #teacherCanvas class="w-full h-[140px] touch-none cursor-crosshair" (touchstart)="startDrawing( + '$' + event, 'teacher')" (touchmove)="draw( + '$' + event, 'teacher')" (touchend)="stopDrawing()" (mousedown)="startDrawing( + '$' + event, 'teacher')" (mousemove)="draw( + '$' + event, 'teacher')" (mouseup)="stopDrawing()" (mouseleave)="stopDrawing()"></canvas>
                              </div>
                          </div>
                      </div>
                  </section>

                  <!-- Footer & Submit -->\;
htmlContent = htmlContent.replace(searchSigs, sigs);
fs.writeFileSync('src/app/async-supervision-form/async-supervision-form.html', htmlContent);
console.log('Fixed');
