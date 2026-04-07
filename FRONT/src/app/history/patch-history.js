const fs = require('fs');

const path = 'c:\\Users\\koffi\\Documents\\PROJETS JS\\SUPERVISION-VISIOS\\FRONT\\src\\app\\history\\history.html';
let content = fs.readFileSync(path, 'utf8');

// 1. Update Print View
// Change title depending on active tab
content = content.replace(
    '<h1 class="text-2xl font-bold uppercase tracking-wider text-black">Relevé de Supervisions</h1>',
    '<h1 class="text-2xl font-bold uppercase tracking-wider text-black">{{ activeTab === \'synchrone\' ? \'Relevé de Supervisions Synchrones\' : \'Relevé de Supervisions Asynchrones\' }}</h1>'
);

// Hide some total duration stats if asynchrone
content = content.replace(
    '<p class="text-xl font-bold text-black mt-2">Total Durée: {{ totalDuration }}</p>',
    '<p *ngIf="activeTab === \'synchrone\'" class="text-xl font-bold text-black mt-2">Total Durée: {{ totalDuration }}</p><p *ngIf="activeTab === \'asynchrone\'" class="text-xl font-bold text-black mt-2">Total: {{ printAsyncSupervisions.length }}</p>'
);

// Swap the print tables
const printTableSynchrone = `
    <!-- Print Table Synchrone -->
    <table *ngIf="activeTab === 'synchrone'" class="w-full text-left border-collapse text-sm mb-8 border border-black">
`;
content = content.replace('<table class="w-full text-left border-collapse text-sm mb-8 border border-black">', printTableSynchrone);

// Append Print Table Asynchrone after the Synchrone table closes
const printTableAsynchrone = `
    <!-- Print Table Asynchrone -->
    <table *ngIf="activeTab === 'asynchrone'" class="w-full text-left border-collapse text-sm mb-8 border border-black">
        <thead>
            <tr class="bg-gray-100 border-b border-black font-bold uppercase text-xs tracking-wider">
                <th class="py-3 px-2 border-r border-black">Semaine</th>
                <th class="py-3 px-2 border-r border-black" *ngIf="!filters.teacher">Enseignant</th>
                <th class="py-3 px-2 border-r border-black text-center">Module/UE</th>
                <th class="py-3 px-2 border-r border-black text-center">Statut</th>
                <th class="py-3 px-2 text-left">Observations</th>
            </tr>
        </thead>
        <tbody class="text-gray-800">
            <tr *ngFor="let s of printAsyncSupervisions; let i = index" [class.bg-gray-50]="i % 2 !== 0"
                class="border-b border-black">
                <td class="py-2 px-2 border-r border-black font-medium">{{ s.week }}</td>
                <td class="py-2 px-2 border-r border-black uppercase text-xs" *ngIf="!filters.teacher">{{ s.teacher_name || 'N/A' }}</td>
                <td class="py-2 px-2 border-r border-black font-bold text-xs">{{ s.ue_id || s.ue_name || 'N/A' }}</td>
                <td class="py-2 px-2 border-r border-black text-center text-xs">
                    <span [class.text-green-600]="s.status === 'Fait'" [class.text-yellow-600]="s.status === 'Partiel'" [class.text-red-600]="s.status === 'Non fait'">{{ s.status }}</span>
                </td>
                <td class="py-2 px-2 text-left text-xs">{{ s.observations || '-' }}</td>
            </tr>
            <tr *ngIf="printAsyncSupervisions.length === 0">
                <td [attr.colspan]="!filters.teacher ? 5 : 4"
                    class="p-8 text-center text-gray-500 italic border-l border-r border-black">Aucune supervision asynchrone pour ces critères.</td>
            </tr>
        </tbody>
    </table>
`;
// We find where the first block ends (</tfoot> followed by </table>)
content = content.replace(
    '</tfoot>\n    </table>', 
    '</tfoot>\n    </table>\n' + printTableAsynchrone
).replace(
    '</tfoot>\r\n    </table>', 
    '</tfoot>\r\n    </table>\n' + printTableAsynchrone
);

// 2. Data Table List wrapper for synchrone
content = content.replace(
    '<div class="overflow-x-auto pb-4"> <!-- pb-4 for potential shadow clipping -->',
    '<div class="overflow-x-auto pb-4" *ngIf="activeTab === \'synchrone\'"> <!-- pb-4 for potential shadow clipping -->'
);

// Add the Asynchrone data table
const asynchroneTableBlock = `
    <!-- Data Table / List ASYNCHRONE -->
    <div class="overflow-x-auto pb-4" *ngIf="activeTab === 'asynchrone'">
        <table class="w-full text-left border-separate border-spacing-0 border-spacing-y-3">
            <thead>
                <tr class="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th class="px-6 py-2">Semaine</th>
                    <th class="px-6 py-2 text-center">Statut</th>
                    <th class="px-6 py-2 text-right">Actions</th>
                </tr>
            </thead>
            <tbody class="text-sm">
                <tr *ngIf="filteredAsyncSupervisions.length === 0">
                    <td colspan="5" class="text-center py-12">
                        <div class="flex flex-col items-center justify-center text-slate-400">
                            <span class="material-symbols-outlined text-6xl mb-4 text-slate-200">history_edu</span>
                            <p class="text-lg font-medium text-slate-500">Aucun rapport asynchrone trouvé</p>
                        </div>
                    </td>
                </tr>

                <tr *ngFor="let s of filteredAsyncSupervisions" 
                    class="group transition-all duration-200 hover:transform hover:scale-[1.002]">
                    <td class="bg-white dark:bg-slate-800 border-y border-l border-slate-100 dark:border-slate-700 rounded-l-2xl py-4 px-6 shadow-sm group-hover:shadow-md transition-shadow">
                        <div class="flex flex-col">
                            <span class="text-sm font-bold text-slate-800 dark:text-slate-100">{{ s.week }}</span>
                            <div class="flex items-center gap-1 mt-1">
                                <span class="material-symbols-outlined text-[14px] text-slate-400">person</span>
                                <span class="text-xs text-slate-500">{{ s.teacher_name || s.teacherId || 'N/A' }}</span>
                            </div>
                        </div>
                    </td>
                    
                    <td class="bg-white dark:bg-slate-800 border-y border-slate-100 dark:border-slate-700 py-4 px-6 shadow-sm group-hover:shadow-md transition-shadow text-center">
                        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                            [ngClass]="{
                                'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400': s.status === 'Fait',
                                'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400': s.status === 'Partiel',
                                'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400': s.status === 'Non fait'
                            }">
                            {{ s.status }}
                        </span>
                    </td>
                    
                    <td class="bg-white dark:bg-slate-800 border-y border-r border-slate-100 dark:border-slate-700 rounded-r-2xl py-4 px-6 shadow-sm group-hover:shadow-md transition-shadow text-right">
                        <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button (click)="deleteAsync(s.id)" class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors" title="Supprimer">
                                <span class="material-symbols-outlined text-[20px]">delete</span>
                            </button>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
`;
content = content.replace(
    '<!-- Pagination -->',
    asynchroneTableBlock + '\n    <!-- Pagination -->'
);

// 3. Make Pagination hidden on Asynchrone since it's not paginated yet
content = content.replace(
    '<div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200/60 dark:border-slate-700">',
    '<div *ngIf="activeTab === \'synchrone\'" class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200/60 dark:border-slate-700">'
);

fs.writeFileSync(path, content, 'utf8');
console.log('history.html updated successfully');
