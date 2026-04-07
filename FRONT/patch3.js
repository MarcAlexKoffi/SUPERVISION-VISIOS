const fs = require('fs');

const pathTs = 'c:\\Users\\koffi\\Documents\\PROJETS JS\\SUPERVISION-VISIOS\\FRONT\\src\\app\\history\\history.ts';
let contentTs = fs.readFileSync(pathTs, 'utf8');

// 1. Add properties for Async Modal
if (!contentTs.includes('selectedAsyncSupervision')) {
  contentTs = contentTs.replace(
      'selectedSupervision: any = null;',
      'selectedSupervision: any = null;\n  selectedAsyncSupervision: any = null;\n  showAsyncModal: boolean = false;'
  );
}

// 2. Add methods: viewAsyncDetails, closeAsyncModal, editAsyncSupervision, openAsyncEmailModal
const asyncMethods = `
  viewAsyncDetails(supervision: any) {
    this.selectedAsyncSupervision = supervision;
    this.showAsyncModal = true;
  }

  closeAsyncModal() {
    this.showAsyncModal = false;
    this.selectedAsyncSupervision = null;
  }

  editAsyncSupervision(supervision: any) {
    this.activeMenuId = null;
    this.router.navigate(['/admin/async-supervision'], { queryParams: { id: supervision.id } });
  }

  openAsyncEmailModal(supervision: any) {
    let teacherEmail = '';
    const teacherId = supervision.teacher_id || supervision.teacherId;
    if (teacherId) {
        const teacher = this.teachersData?.find(t => t.id === teacherId);
        if (teacher && teacher.email) {
            teacherEmail = teacher.email;
        }
    }
    this.supervisionToSend = supervision;
    this.emailToConfirm = teacherEmail || '';
    this.showEmailModal = true;
    this.activeMenuId = null;
  }

  async generateAsyncReportPDF(s: any): Promise<string> {
      const doc = new jsPDF();
      
      // -- Header --
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 66, 165); // #0f42a5
      doc.text("FICHE DE SUPERVISION ASYNCHRONE", 105, 20, { align: 'center' });
      
      // -- General Info Box --
      let y = 50;
      doc.setDrawColor(200);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(14, y, 182, 45, 3, 3, 'FD');
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text("Informations GÃ©nÃ©rales", 20, y + 10);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      
      const teacherName = s.teacher_name || s.teacherId || 'Non spÃ©cifiÃ©';
      const ueName = s.ue_id || s.ueId || s.ue_name || 'Non spÃ©cifiÃ©';

      doc.text(\`Enseignant: \${teacherName}\`, 20, y + 20);
      doc.text(\`Module / UE: \${ueName}\`, 20, y + 28);
      doc.text(\`Semaine concernÃ©e: \${s.week}\`, 20, y + 36);

      doc.setFont('helvetica', 'bold');
      doc.text(\`Statut: \${s.status || '-'}\`, 130, y + 20);
      doc.setFont('helvetica', 'normal');

      y += 55;
      
      // -- Observations --
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text("Observations et recommandations", 14, y);
      
      y += 6;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const obsLines = doc.splitTextToSize(s.observations || "Aucune observation n'a Ã©tÃ© signalÃ©e.", 182);
      doc.text(obsLines, 14, y);
      
      y += obsLines.length * 5 + 10;

      // -- Footer Signatures --
      y += 20;
      doc.setDrawColor(226, 232, 240);
      doc.line(14, y, 196, y);
      
      y += 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text("Signature Administration", 14, y);

      return doc.output('datauristring');
  }

  printAsyncSupervision(supervision: any) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Veuillez autoriser les pop-ups pour imprimer.');
      return;
    }

    const s = supervision;
    const teacherName = s.teacher_name || s.teacherId || 'N/A';
    const ueName = s.ue_id || s.ueId || s.ue_name || 'N/A';

    const content = \`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fiche de Supervision Asynchrone - \${s.week}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.6; }
          .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #0f42a5; }
          .header h1 { color: #0f42a5; margin: 0 0 10px 0; font-size: 28px; text-transform: uppercase; letter-spacing: 1px; }
          .header p { color: #64748b; margin: 0; font-size: 14px; }
          .info-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 25px; margin-bottom: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .info-item { margin-bottom: 15px; }
          .info-label { font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 4px; }
          .info-value { font-size: 16px; font-weight: 600; color: #0f172a; }
          .section { margin-bottom: 30px; page-break-inside: avoid; }
          .section-title { font-size: 18px; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 15px; }
          .observations-box { background-color: white; border: 1px dashed #cbd5e1; padding: 20px; border-radius: 6px; min-height: 100px; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 50px; page-break-inside: avoid; }
          .signature-box { border-top: 1px solid #cbd5e1; padding-top: 15px; text-align: center; font-weight: bold; color: #475569; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Fiche de Supervision Asynchrone</h1>
          <p>Document officiel certifiant la vÃ©rification de suivi asynchrone</p>
        </div>
        
        <div class="info-box">
          <div class="info-item">
            <div class="info-label">Enseignant</div>
            <div class="info-value">\${teacherName}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Statut</div>
            <div class="info-value" style="color: \${s.status === 'Fait' ? '#16a34a' : (s.status === 'Partiel' ? '#ca8a04' : '#dc2626')}">\${s.status}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Modue / UE</div>
            <div class="info-value">\${ueName}</div>
          </div>
          <div class="info-item">
            <div class="info-label">PÃ©riode / Semaine</div>
            <div class="info-value">\${s.week}</div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Observations et recommandations</div>
          <div class="observations-box">
            \${s.observations ? s.observations.replace(/\\n/g, '<br>') : '<span style="color:#94a3b8;font-style:italic;">Aucune observation n\\'a Ã©tÃ© rÃ©digÃ©e pour cette supervision.</span>'}
          </div>
        </div>

        <div class="signatures">
          <div class="signature-box">
            Administration
          </div>
          <div class="signature-box">
          </div>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    \`;

    printWindow.document.write(content);
    printWindow.document.close();
  }
`;

if (!contentTs.includes('viewAsyncDetails')) {
  // Insert methods before end of class
  contentTs = contentTs.replace(/\n}$/, '\n' + asyncMethods + '\n}');
}

// Update confirmSendReport to handle Async
contentTs = contentTs.replace(
  'const pdfBase64 = await this.generateReportPDF(supervision);',
  'const pdfBase64 = supervision.week ? await this.generateAsyncReportPDF(supervision) : await this.generateReportPDF(supervision);'
);
contentTs = contentTs.replace(
  'subject: `Rapport de Supervision - ${supervision.course?.name || \'Visio\'} - ${new Date(supervision.date).toLocaleDateString()}`,',
  'subject: supervision.week ? `Rapport Supervision Asynchrone - ${supervision.week}` : `Rapport de Supervision - ${supervision.course?.name || \'Visio\'} - ${new Date(supervision.date).toLocaleDateString()}`,'
);

fs.writeFileSync(pathTs, contentTs, 'utf8');
console.log('patched TS successfully');


const pathHtml = 'c:\\Users\\koffi\\Documents\\PROJETS JS\\SUPERVISION-VISIOS\\FRONT\\src\\app\\history\\history.html';
let contentHtml = fs.readFileSync(pathHtml, 'utf8');

// Replace Async Actions Column
const newAsyncActions = `
                    <td class="bg-white dark:bg-slate-800 border-y border-r border-slate-100 dark:border-slate-700 rounded-r-2xl py-4 px-6 shadow-sm group-hover:shadow-md transition-shadow text-right">
                        <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button (click)="viewAsyncDetails(s)" 
                                class="p-2 rounded-full text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                title="Voir les détails">
                                <span class="material-symbols-outlined text-[20px]">visibility</span>
                            </button>
                            
                            <div class="relative">
                                <button (click)="toggleActionMenu($event, s.id)" 
                                    class="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                    [class.bg-slate-100]="activeMenuId === s.id"
                                    [class.text-slate-600]="activeMenuId === s.id">
                                    <span class="material-symbols-outlined text-[20px]">more_vert</span>
                                </button>
                                
                                <!-- Dropdown Menu -->
                                <div *ngIf="activeMenuId === s.id" 
                                    class="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden text-left origin-top-right ring-1 ring-black ring-opacity-5 focus:outline-none"
                                    (click)="$event.stopPropagation()">
                                    <div class="py-1">
                                        <button (click)="openAsyncEmailModal(s)" class="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-indigo-600 flex items-center gap-3 transition-colors group/item">
                                            <span class="material-symbols-outlined text-[18px] text-slate-400 group-hover/item:text-indigo-500">send</span>
                                            Envoyer le rapport
                                        </button>
                                        <button (click)="editAsyncSupervision(s)" class="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-indigo-600 flex items-center gap-3 transition-colors group/item">
                                            <span class="material-symbols-outlined text-[18px] text-slate-400 group-hover/item:text-indigo-500">edit</span>
                                            Modifier
                                        </button>
                                    </div>
                                    <div class="border-t border-slate-100 dark:border-slate-700 my-1"></div>
                                    <div class="py-1">
                                        <button (click)="deleteAsync(s)" class="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors group/item">
                                            <span class="material-symbols-outlined text-[18px] text-red-400 group-hover/item:text-red-500">delete</span>
                                            Supprimer
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </td>
`;

// we need to find the existing td for async actions. Wait, the existing td has: `<button (click)="deleteAsync(s)" class="p-2 ..."` 
const regexAsyncTd = /<td class="bg-white dark:bg-slate-800 border-y border-r border-slate-100 dark:border-slate-700 rounded-r-2xl py-4 px-6 shadow-sm group-hover:shadow-md transition-shadow text-right">[\s\S]*?<\/td>/g;
const tds = contentHtml.match(regexAsyncTd);
if (tds && tds.length >= 2) {
    // The second match is the async table (the first is synchrone which has the exact same classes!) Wait, but synchrone doesn't have `opacity-0 group-hover:opacity-100` wrapped around `relative`. Oh wait, Synchrone td DOES NOT have `opacity-0`... Wait, let's just make it precise.
}
// Let's replace the whole async table body's closing td:
contentHtml = contentHtml.replace(
    /<td class="bg-white dark:bg-slate-800 border-y border-r border-slate-100 dark:border-slate-700 rounded-r-2xl py-4 px-6 shadow-sm group-hover:shadow-md transition-shadow text-right">\s*<div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">\s*<button \(click\)="deleteAsync\(s\)"[\s\S]*?<\/div>\s*<\/td>/,
    newAsyncActions
);

// We need to add the viewAsyncDetails Modal HTML.
const asyncModalHtml = `
    <!-- Async Supervision Details Modal -->
    <div *ngIf="showAsyncModal && selectedAsyncSupervision" class="fixed inset-0 z-[100] flex items-center justify-center">
        <div class="absolute inset-0 transition-opacity bg-slate-900/50 backdrop-blur-sm" (click)="closeAsyncModal()"></div>
        <div class="relative w-full max-w-3xl overflow-hidden shadow-2xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl ring-1 ring-white/20">
            <div class="flex flex-col max-h-[90vh]">
                <!-- Header -->
                <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50">
                    <div class="flex items-center gap-4">
                        <div class="flex items-center justify-center w-12 h-12 text-indigo-600 bg-indigo-100 rounded-2xl dark:bg-indigo-500/20 dark:text-indigo-400">
                            <span class="material-symbols-outlined text-2xl">description</span>
                        </div>
                        <div>
                            <h3 class="text-lg font-bold text-slate-900 dark:text-white">Détails Supervision Asynchrone</h3>
                            <p class="text-xs text-slate-500">Réf: #{{ selectedAsyncSupervision.id }} - {{ selectedAsyncSupervision.week }}</p>
                        </div>
                    </div>
                    <button (click)="closeAsyncModal()" class="p-2 transition-colors rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 dark:hover:bg-slate-700">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>

                <!-- Content -->
                <div class="flex-1 p-6 space-y-6 overflow-y-auto">
                    <div class="grid grid-cols-2 gap-6">
                        <!-- Info Block -->
                        <div class="space-y-4">
                            <div>
                                <div class="text-xs font-bold text-slate-500 uppercase">Enseignant</div>
                                <div class="font-medium text-slate-900 dark:text-white">{{ selectedAsyncSupervision.teacher_name || selectedAsyncSupervision.teacherId || 'N/A' }}</div>
                            </div>
                            <div>
                                <div class="text-xs font-bold text-slate-500 uppercase">Module / UE</div>
                                <div class="font-medium text-slate-900 dark:text-white">{{ selectedAsyncSupervision.ue_name || selectedAsyncSupervision.ue_id || selectedAsyncSupervision.ueId || 'N/A' }}</div>
                            </div>
                            <div>
                                <div class="text-xs font-bold text-slate-500 uppercase">Statut de la réponse</div>
                                <div class="mt-1">
                                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                                        [ngClass]="{
                                            'bg-green-100 text-green-700': selectedAsyncSupervision.status === 'Fait',
                                            'bg-yellow-100 text-yellow-700': selectedAsyncSupervision.status === 'Partiel',
                                            'bg-red-100 text-red-700': selectedAsyncSupervision.status === 'Non fait'
                                        }">
                                        {{ selectedAsyncSupervision.status }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Observations -->
                    <div class="space-y-3">
                        <div class="text-xs font-bold text-slate-500 uppercase">Observations et Recommandations</div>
                        <div class="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl leading-relaxed text-sm text-slate-700 dark:text-slate-300">
                            {{ selectedAsyncSupervision.observations || 'Aucune observation enregistrée.' }}
                        </div>
                    </div>
                </div>

                <!-- Footer Actions -->
                <div class="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                    <button (click)="closeAsyncModal()" class="px-5 py-2.5 font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm">
                        Fermer
                    </button>
                    <div class="flex gap-3">
                        <button (click)="printAsyncSupervision(selectedAsyncSupervision)"
                            class="px-5 py-2.5 font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm">
                            <span class="material-symbols-outlined text-[18px] mr-2 align-middle">print</span>Imprimer
                        </button>
                        <button (click)="printAsyncSupervision(selectedAsyncSupervision)"
                            class="px-5 py-2.5 font-semibold text-white bg-[#0f42a5] rounded-xl hover:bg-[#1e3a8a]">
                            <span class="material-symbols-outlined text-[18px] mr-2 align-middle">download</span>Télécharger PDF
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
`;

// Insert the async modal right before the regular Details Modal
contentHtml = contentHtml.replace('<!-- Supervision Details Modal -->', asyncModalHtml + '\n    <!-- Supervision Details Modal -->');

fs.writeFileSync(pathHtml, contentHtml, 'utf8');
console.log('patched HTML successfully');
