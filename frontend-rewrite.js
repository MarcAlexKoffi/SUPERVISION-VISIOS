const fs = require('fs');

const path = 'C:\\Users\\koffi\\Documents\\PROJETS JS\\SUPERVISION-VISIOS\\FRONT\\src\\app\\history\\history.html';
let content = fs.readFileSync(path, 'utf8');

// I will preserve the top "print" section
const printEndIndex = content.indexOf('<!-- Print Table Asynchrone -->');
const realPrintEnd = content.indexOf('<div class="p-6', printEndIndex);
const printHeader = content.substring(0, realPrintEnd);

let rest = content.substring(realPrintEnd);

const restAfterAsyncModalIndex = content.indexOf('<!-- History Modal -->');
const historyModalAndLater = restAfterAsyncModalIndex !== -1 ? content.substring(restAfterAsyncModalIndex) : '';

const newRest = `
<div class="p-6 md:p-8 w-full print:hidden max-w-[1600px] mx-auto bg-[#F8FAFC] min-h-screen font-sans">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 mt-2">
        <div>
            <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Historique des cours</h1>
            <p class="text-base text-slate-500 dark:text-slate-400 mt-2">
                Consultez les sessions passées, présences et journaux d'activité.
            </p>
            
            <!-- Type Tab Toggle (Synchrone/Asynchrone) -->
            <div class="flex bg-slate-100 dark:bg-slate-800 rounded-xl w-fit shadow-inner p-1 mt-4">
                <button (click)="activeTab = 'synchrone'"
                    [class.bg-white]="activeTab === 'synchrone'" [class.shadow-sm]="activeTab === 'synchrone'" [class.text-indigo-600]="activeTab === 'synchrone'"
                    [class.text-slate-500]="activeTab !== 'synchrone'"
                    class="px-6 py-2 text-sm font-semibold rounded-lg transition-all">
                    Synchrone
                </button>
                <button (click)="activeTab = 'asynchrone'"
                    [class.bg-white]="activeTab === 'asynchrone'" [class.shadow-sm]="activeTab === 'asynchrone'" [class.text-indigo-600]="activeTab === 'asynchrone'"
                    [class.text-slate-500]="activeTab !== 'asynchrone'"
                    class="px-6 py-2 text-sm font-semibold rounded-lg transition-all">
                    Asynchrone
                </button>
            </div>
        </div>
        
        <!-- Filters & Export Inline like Mockup -->
        <div class="flex flex-wrap items-center gap-3">
            
            <!-- Teacher Filter button style -->
            <div class="relative group">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span class="material-symbols-outlined text-slate-400 text-[18px]">person</span>
                </div>
                <select [(ngModel)]="filters.teacher" (change)="onTeacherChange()"
                    class="block w-full pl-9 pr-8 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm appearance-none cursor-pointer">
                    <option value="">Tous les enseignants</option>
                    <option *ngFor="let t of teachers" [value]="t">{{ t }}</option>
                </select>
                <div class="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                    <span class="material-symbols-outlined text-slate-400 text-[18px]">arrow_drop_down</span>
                </div>
            </div>

            <!-- Course Filter -->
            <div class="relative group">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span class="material-symbols-outlined text-slate-400 text-[18px]">menu_book</span>
                </div>
                 <select [(ngModel)]="filters.course" (change)="applyFilters()"
                    class="block w-full pl-9 pr-8 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm appearance-none cursor-pointer">
                    <option value="">Tous les cours</option>
                    <option *ngFor="let c of courses" [value]="c">{{ c }}</option>
                </select>
                <div class="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                    <span class="material-symbols-outlined text-slate-400 text-[18px]">arrow_drop_down</span>
                </div>
            </div>

            <!-- Period Filter -->
             <div class="flex items-center gap-1 bg-white rounded-xl px-2 border border-slate-300 shadow-sm py-0.5">
                <span class="material-symbols-outlined text-slate-400 text-[18px] ml-1">calendar_today</span>
                <input [(ngModel)]="filters.startDate" (change)="applyFilters()" type="date"
                    class="w-32 py-2 bg-transparent border-none text-sm text-slate-700 focus:ring-0 outline-none placeholder-slate-400" title="Date de début">
                <span class="text-slate-300">-</span>
                <input [(ngModel)]="filters.endDate" (change)="applyFilters()" type="date"
                    class="w-32 py-2 bg-transparent border-none text-sm text-slate-700 focus:ring-0 outline-none placeholder-slate-400" title="Date de fin">
            </div>

            <!-- Export / Honoraires -->
            <button *ngIf="filters.teacher && filters.course" 
                (click)="genererHonoraires()"
                class="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors shadow-sm focus:ring-2 focus:ring-emerald-100">
                <span class="material-symbols-outlined text-[20px]">request_quote</span>
                <span>Honoraires</span>
            </button>

            <!-- Export Button (Blue) -->
            <button (click)="exportCSV()"
                class="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-xl hover:bg-blue-800 transition-colors shadow-md focus:ring-2 focus:ring-blue-500">
                <span class="material-symbols-outlined text-[20px]">download</span>
                <span>Exporter</span>
            </button>
            
            <button routerLink="/admin/supervision-form"
                class="hidden md:flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-800 rounded-xl hover:bg-slate-900 transition-colors shadow-md focus:ring-2 focus:ring-slate-500">
                <span class="material-symbols-outlined text-[20px]">add</span>
                <span>Nouveau</span>
            </button>
        </div>
    </div>

    <!-- Data Table Card -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        
        <!-- Synchrone Table -->
        <table *ngIf="activeTab === 'synchrone'" class="w-full text-left border-collapse">
            <thead>
                <tr class="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-widest">
                    <th class="px-6 py-4 w-[15%]">DATE & HEURE</th>
                    <th class="px-6 py-4 w-[25%]">COURS</th>
                    <th class="px-6 py-4 w-[20%]">ENSEIGNANT</th>
                    <th class="px-6 py-4 w-[15%]">PLATEFORME</th>
                    <th class="px-6 py-4 w-[15%]">STATUT</th>
                    <th class="px-6 py-4 text-center w-[10%]">ACTIONS</th>
                </tr>
            </thead>
            <tbody class="text-sm divide-y divide-slate-100">
                <tr *ngIf="paginatedSupervisions.length === 0">
                    <td colspan="6" class="text-center py-12 text-slate-500">
                        Aucun rapport trouvé pour ces critères.
                    </td>
                </tr>

                <tr *ngFor="let s of paginatedSupervisions" class="hover:bg-slate-50/50 transition-colors group">
                    <!-- Date & Heure -->
                    <td class="px-6 py-4 align-top">
                        <div class="text-slate-900 font-medium">{{ s.date | date:'dd MMM yyyy':'':'fr' }}</div>
                        <div class="text-slate-500 text-sm mt-1">{{ s.startTimeStr }} - {{ s.endTimeStr }}</div>
                    </td>

                    <!-- Cours -->
                    <td class="px-6 py-4 align-top">
                        <div class="text-slate-900 font-medium">{{ s.course.name }}</div>
                        <div class="text-slate-500 text-sm mt-1">{{ s.course.code }}</div>
                    </td>

                    <!-- Enseignant -->
                    <td class="px-6 py-4 align-top">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full flex shrink-0 items-center justify-center text-xs font-bold ring-2 ring-white shadow-sm {{ s.teacher.color }}">
                                {{ s.teacher.initials }}
                            </div>
                            <span class="text-slate-700 font-medium group-hover:text-blue-600 transition-colors">
                                {{ s.teacher.name }}
                            </span>
                        </div>
                    </td>

                    <!-- Plateforme / Salle -->
                    <td class="px-6 py-4 align-top">
                        <div class="inline-flex items-center px-3 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                            {{ s.platform || 'Non défini' }}
                        </div>
                    </td>

                    <!-- Statut -->
                    <td class="px-6 py-4 align-top">
                        <!-- Statut badge variations based on value -->
                        <span [ngClass]="{
                            'bg-emerald-100 text-emerald-700': s.status === 'Terminé' || s.status === 'Réalisé',
                            'bg-red-100 text-red-700': s.status === 'Annulé',
                            'bg-amber-100 text-amber-700': s.status === 'En attente',
                            'bg-blue-100 text-blue-700': s.status !== 'Terminé' && s.status !== 'Réalisé' && s.status !== 'Annulé' && s.status !== 'En attente'
                        }" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium">
                            <span [ngClass]="{
                                'bg-emerald-500': s.status === 'Terminé' || s.status === 'Réalisé',
                                'bg-red-500': s.status === 'Annulé',
                                'bg-amber-500': s.status === 'En attente',
                                'bg-blue-500': s.status !== 'Terminé' && s.status !== 'Réalisé' && s.status !== 'Annulé' && s.status !== 'En attente'
                            }" class="w-1.5 h-1.5 rounded-full"></span>
                            {{ s.status || 'Terminé' }}
                        </span>
                    </td>

                    <!-- Actions -->
                    <td class="px-6 py-4 align-top text-center w-full">
                        <div class="flex items-center justify-center">
                            <div class="relative">
                                <button (click)="toggleActionMenu($event, s.id)" 
                                    class="p-2 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                                    [class.bg-slate-200]="activeMenuId === s.id"
                                    [class.text-slate-700]="activeMenuId === s.id">
                                    <span class="material-symbols-outlined text-[20px]">more_horiz</span>
                                </button>
                                <!-- Synchrone Dropdown Menu -->
                                <div *ngIf="activeMenuId === s.id" 
                                    class="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden text-left"
                                    (click)="$event.stopPropagation()">
                                    <div class="py-1">
                                        <button (click)="viewDetails(s)" class="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                            <span class="material-symbols-outlined text-[18px]">visibility</span> Voir détails
                                        </button>
                                        <button (click)="editSupervision(s)" class="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                            <span class="material-symbols-outlined text-[18px]">edit</span> Modifier
                                        </button>
                                        <button (click)="openEmailModal(s)" class="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                            <span class="material-symbols-outlined text-[18px]">send</span> Envoyer
                                        </button>
                                    </div>
                                    <div class="border-t border-slate-100 mx-1"></div>
                                    <div class="py-1">
                                        <button (click)="deleteSupervision(s)" class="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                            <span class="material-symbols-outlined text-[18px]">delete</span> Supprimer
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>

        <!-- Asynchrone Table -->
        <table *ngIf="activeTab === 'asynchrone'" class="w-full text-left border-collapse">
            <thead>
                <tr class="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-widest">
                    <th class="px-6 py-4 w-[20%]">SEMAINE & DATE</th>
                    <th class="px-6 py-4 w-[25%]">MODULE / UE</th>
                    <th class="px-6 py-4 w-[25%]">ENSEIGNANT</th>
                    <th class="px-6 py-4 w-[15%]">STATUT</th>
                    <th class="px-6 py-4 text-center w-[15%]">ACTIONS</th>
                </tr>
            </thead>
            <tbody class="text-sm divide-y divide-slate-100">
                <tr *ngIf="filteredAsyncSupervisions.length === 0">
                    <td colspan="5" class="text-center py-12 text-slate-500">
                        Aucun rapport asynchrone trouvé.
                    </td>
                </tr>

                <tr *ngFor="let s of pagedFilteredAsyncSupervisions" class="hover:bg-slate-50/50 transition-colors group">
                    <td class="px-6 py-4 align-top">
                        <div class="text-slate-900 font-medium">{{ s.week }}</div>
                        <div class="text-slate-500 text-sm mt-1">{{ s.date | date:'dd MMM yyyy':'':'fr' }}</div>
                    </td>
                    <td class="px-6 py-4 align-top">
                        <div class="text-slate-900 font-medium">{{ getAsyncUeName(s) }}</div>
                        <div class="text-slate-500 text-sm mt-1">{{ s.classe_name || s.classe || 'Général' }}</div>
                    </td>
                    <td class="px-6 py-4 align-top">
                        <div class="flex items-center gap-3">
                            <span class="material-symbols-outlined text-slate-400 text-[20px]">person</span>
                            <span class="text-slate-700 font-medium group-hover:text-blue-600 transition-colors">
                                {{ getAsyncTeacherName(s) }}
                            </span>
                        </div>
                    </td>
                    <td class="px-6 py-4 align-top">
                        <span [ngClass]="{
                            'bg-emerald-100 text-emerald-700': s.status === 'Fait' || s.status === 'Réalisé',
                            'bg-red-100 text-red-700': s.status === 'Non fait' || s.status === 'Non réalisé',
                            'bg-amber-100 text-amber-700': s.status === 'Partiel' || s.status === 'Partiellement réalisé'
                        }" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium">
                            {{ s.status === 'Fait' ? 'Réalisé' : (s.status === 'Partiel' ? 'Partiellement réalisé' : (s.status === 'Non fait' ? 'Non réalisé' : s.status)) }}
                        </span>
                    </td>
                    <td class="px-6 py-4 align-top text-center w-full">
                        <div class="flex items-center justify-center gap-1">
                            <button (click)="openAsyncHistoryModal(s)" class="p-2 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors">
                                <span class="material-symbols-outlined text-[20px]">visibility</span>
                            </button>
                            <button (click)="exportSingleAsyncPDF(s)" class="p-2 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors">
                                <span class="material-symbols-outlined text-[20px]">download</span>
                            </button>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
        
        <!-- Pagination Footer matching mockup (Showing x to y of z entries ...) -->
        <div class="border-t border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-600 bg-white">
            <div>
                Affichage de {{ (currentPage - 1) * itemsPerPage + 1 }} à {{ Math.min(currentPage * itemsPerPage, activeTab === 'synchrone' ? filteredSupervisions.length : filteredAsyncSupervisions.length) }} sur {{ activeTab === 'synchrone' ? filteredSupervisions.length : filteredAsyncSupervisions.length }} entrées
            </div>
            
            <div class="flex items-center gap-1">
                <button (click)="prevPage()" [disabled]="currentPage === 1" class="w-8 h-8 flex items-center justify-center rounded-md border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
                    <span class="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                
                <ng-container *ngFor="let p of getPagesArray()">
                    <button *ngIf="p !== '...'" (click)="goToPage(p)"
                        [class.bg-blue-700]="currentPage === p" [class.text-white]="currentPage === p" [class.border-blue-700]="currentPage === p"
                        [class.border-slate-300]="currentPage !== p" [class.hover:bg-slate-50]="currentPage !== p"
                        class="w-8 h-8 flex items-center justify-center rounded-md border text-sm font-medium transition-colors">
                        {{ p }}
                    </button>
                    <span *ngIf="p === '...'" class="px-1 text-slate-400">...</span>
                </ng-container>
                
                <button (click)="nextPage()" [disabled]="currentPage === totalPages" class="w-8 h-8 flex items-center justify-center rounded-md border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
                    <span class="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
            </div>
        </div>
    </div>
</div>
` + historyModalAndLater;

const res = printHeader + newRest;

fs.writeFileSync(path, res);
