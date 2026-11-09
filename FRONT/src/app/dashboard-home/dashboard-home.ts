import { AcademicSearchSelectComponent } from '../shared/components/academic-search-select/academic-search-select';
import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UeService } from '../services/ue.service';
import { SupervisionService } from '../services/supervision.service';
import { AsyncSupervisionService } from '../services/async-supervision.service';
import { combineLatest, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ClasseService } from '../services/classe.service';
import { AuthService } from '../services/auth.service';
import { ParcoursService } from '../services/parcours.service';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { parseDate } from '../shared/utils/date.utils';
import { ActivityService } from '../services/activity.service';
import { PlanningService, Planning } from '../services/planning.service';
import { TeacherService } from '../services/teacher.service';
import { startOfWeek, endOfWeek, addWeeks, format } from 'date-fns';
import { normalizeAcademicSearch } from '../shared/utils/academic-search';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [AcademicSearchSelectComponent,CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.scss',
})
export class DashboardHome implements OnInit, OnDestroy {
  isModalOpen = false;
  isAdmin = false;
  currentUser: any = null;
  private subscriptions: Subscription = new Subscription();
  parcoursList: any[] = [];
  recentActivities: any[] = [];
  activityLoadState: 'loading' | 'ready' | 'error' = 'loading';

  // AURA V2.3: admin-only, period-scoped, based on actual planning documents.
  dashboardPlans: Planning[] = [];
  dashboardClasses: any[] = [];
  dashboardTeachers: any[] = [];
  dashboardLoadState: 'loading' | 'ready' | 'error' = 'loading';
  dashboardWeekStart = startOfWeek(new Date(), {weekStartsOn: 1});
  dashboardSearch = '';
  dashboardClass = '';
  dashboardUe = '';
  dashboardTeacher = '';

  private dateKey(date: Date): string { return format(date, 'yyyy-MM-dd'); }
  get dashboardWeekEnd(): Date { return endOfWeek(this.dashboardWeekStart, {weekStartsOn: 1}); }
  get dateKeyForPlanning(): string { return this.dateKey(this.dashboardWeekStart); }
  get dashboardWeekLabel(): string {
    return `${format(this.dashboardWeekStart,'dd/MM/yyyy')} – ${format(this.dashboardWeekEnd,'dd/MM/yyyy')}`;
  }
  dashboardMoveWeek(delta: number): void {
    this.dashboardWeekStart = addWeeks(this.dashboardWeekStart, delta);
  }
  dashboardToday(): void { this.dashboardWeekStart = startOfWeek(new Date(), {weekStartsOn: 1}); }
  get dashboardWeekPlans(): Planning[] {
    const from = this.dateKey(this.dashboardWeekStart);
    const to = this.dateKey(this.dashboardWeekEnd);
    return this.dashboardPlans.filter(p => p.date >= from && p.date <= to);
  }
  get dashboardPlannedCount(): number { return this.dashboardWeekPlans.length; }
  get dashboardPendingCount(): number { return this.dashboardWeekPlans.filter(p => p.status === 'À superviser').length; }
  get dashboardSupervisedCount(): number { return this.dashboardWeekPlans.filter(p => p.status === 'Supervisé').length; }
  get dashboardCancelledCount(): number { return this.dashboardWeekPlans.filter(p => p.status === 'Annulé').length; }
  get dashboardProgressPercent(): number | null {
    const eligible = this.dashboardPendingCount + this.dashboardSupervisedCount;
    return eligible ? Math.round(this.dashboardSupervisedCount * 100 / eligible) : null;
  }
  get dashboardPriorities(): Planning[] {
    const now = this.dateKey(new Date());
    return [...this.dashboardPlans]
      .filter(p => p.status === 'À superviser')
      .sort((a,b) => {
        const aFuture = a.date >= now ? 1 : 0;
        const bFuture = b.date >= now ? 1 : 0;
        return aFuture - bFuture || (aFuture ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)) ||
          String(a.start_time || '').localeCompare(String(b.start_time || ''));
      }).slice(0,5);
  }
  dashboardIsOverdue(plan: Planning): boolean {
    const today = this.dateKey(new Date());
    const time = format(new Date(),'HH:mm');
    return plan.date < today || (plan.date === today && !!plan.end_time && plan.end_time < time);
  }
  get dashboardFilteredPlans(): Planning[] {
    const q = normalizeAcademicSearch(this.dashboardSearch);
    return this.dashboardWeekPlans.filter(p => {
      const teacher = `${p.teacher_first_name || ''} ${p.teacher_last_name || ''}`;
      const text = `${p.ue_code || ''} ${p.ue_name || ''} ${p.title || ''} ${teacher} ${p.parcours || ''} ${p.classe_name || ''}`;
      return (!this.dashboardClass || p.parcours === this.dashboardClass || p.classe_name === this.dashboardClass) &&
        (!this.dashboardUe || p.ue_id === this.dashboardUe) &&
        (!this.dashboardTeacher || p.teacher_id === this.dashboardTeacher) &&
        (!q || normalizeAcademicSearch(text).includes(q));
    }).sort((a,b) => a.date.localeCompare(b.date) || String(a.start_time || '').localeCompare(String(b.start_time || '')));
  }
  get dashboardQuickRows(): Planning[] { return this.dashboardFilteredPlans.slice(0, 8); }
  dashboardResetFilters(): void { this.dashboardClass=''; this.dashboardTeacher=''; this.dashboardUe=''; this.dashboardSearch=''; }
  dashboardSelectClass(v: string | number | null): void { this.dashboardClass = String(v ?? ''); }
  dashboardSelectUe(v: string | number | null): void { this.dashboardUe = String(v ?? ''); }
  dashboardSelectTeacher(v: string | number | null): void { this.dashboardTeacher = String(v ?? ''); }
  get dashboardHasFilters(): boolean { return !!(this.dashboardClass || this.dashboardUe || this.dashboardTeacher || this.dashboardSearch); }
  retryDashboardPlanning(): void { this.loadDashboardPlanning(); }
  private loadDashboardPlanning(): void {
    this.dashboardLoadState = 'loading';
    this.subscriptions.add(this.planningService.getPlannings().subscribe({
      next: rows => { this.dashboardPlans = rows; this.dashboardLoadState='ready'; this.cdr.markForCheck(); },
      error: err => { console.error('Planning dashboard non disponible',err); this.dashboardLoadState='error'; this.cdr.markForCheck(); }
    }));
    this.subscriptions.add(this.teacherService.getAll().subscribe({
      next: rows => { this.dashboardTeachers = rows; this.cdr.markForCheck(); },
      error: err => console.error('Enseignants indisponibles sur le dashboard',err)
    }));
  }

  // DB Fields: code, name, responsible, students_count, level, semester, phase
  // UI Fields mapping:
  // code -> code
  // name -> name
  // dept -> level
  // responsible -> responsible
  // students -> students_count
  // modules -> (ignored/calculated?)

  newUE: any = {
    code: '',
    name: '',
    level: '', // Mapped to 'dept' in UI for now
    responsible: '',
    credits: 0,
    modules_count: 0,
    semester: '',
    phase: '',
    department: ''
  };

  stats: any[] = [
    { label: 'UNITÉS D\'ENSEIGNEMENT', value: '0', subtext: 'Chargement...', subtextIcon: 'school', subtextColor: 'text-emerald-500', icon: 'book', iconBg: 'bg-blue-50 text-[#0f42a5]', color: 'bg-blue-50 text-[#0f42a5]' },
    { label: 'SESSIONS DE SUPERVISION', value: '0', subtext: 'Chargement...', subtextIcon: 'history', subtextColor: 'text-slate-400', icon: 'smart_display', iconBg: 'bg-purple-50 text-purple-600', color: 'bg-purple-50 text-purple-600' },
    { label: 'NOMBRE TOTAL DE CLASSES', value: '0', subtext: 'Chargement...', subtextIcon: 'groups', subtextColor: 'text-slate-400', icon: 'hub', iconBg: 'bg-orange-50 text-orange-600', color: 'bg-orange-50 text-orange-600' }
  ];
  
  // User Stats
  userStats = [
      { label: 'Mes Supervisions', value: '0', icon: 'assignment', color: 'bg-blue-50 text-blue-600', iconBg: 'bg-blue-50 text-blue-600' },
      { label: 'Dernière Activité', value: '-', icon: 'history', color: 'bg-green-50 text-green-600', iconBg: 'bg-green-50 text-green-600' },
  ];
  recentSupervisions: any[] = [];

  ues: any[] = [];
  searchTerm: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  isDeleteModalOpen = false;
  ueToDelete: any | null = null;
  isEditMode = false;
  
  // View Modal
  isViewModalOpen = false;
  selectedUE: any = null;
  ueSupervisions: any[] = []; // To store supervisions related to the selected UE

  currentPage = 1;
  itemsPerPage = 10;

  localUEsCount = 0;
  localUEsData: any[] = [];
  isRestoring = false;

  constructor(
    private ueService: UeService,
    private supervisionService: SupervisionService,
    private asyncSupervisionService: AsyncSupervisionService,
    private authService: AuthService,
    private parcoursService: ParcoursService,
    private classeService: ClasseService,
    private activityService: ActivityService,
    private planningService: PlanningService,
    private teacherService: TeacherService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.currentUserValue;
    if (this.currentUser) {
        this.isAdmin = this.currentUser.role === 'admin';
        
        // Setup realtime listeners via active subscription methods
        this.loadData();
    }
  }

  loadData() {
      this.loadParcours();
      
      if (this.isAdmin) {
          // Check if data from previous versions exists in localstorage
          this.checkLocalStorage();
          this.loadStats();
          this.loadDashboardPlanning();
      } else {
          this.loadUserData();
          this.loadStats(); // Loads !isAdmin context correctly based on logic
      }

      // Confidentiality: absence of an authenticated user ID must never fall back
      // to an unfiltered activities collection for non-admin users.
      const activityUserId = this.currentUser?.uid || this.currentUser?.id;
      if (!this.isAdmin && !activityUserId) {
        this.activityLoadState = 'error';
        this.cdr.markForCheck();
        return;
      }
      this.subscriptions.add(
        this.activityService.getRecentActivities(5, this.isAdmin ? undefined : String(activityUserId)).subscribe({
          next: (acts: any[]) => {
            this.recentActivities = acts.map(a => ({ ...a, parsedDate:
              a.created_at?.toDate?.() || (a.created_at?.seconds ? new Date(a.created_at.seconds * 1000) :
              (a.created_at ? new Date(a.created_at) : null)) }));
            this.activityLoadState='ready';
            this.cdr.markForCheck();
          },
          error: (err) => { this.activityLoadState='error'; this.cdr.markForCheck(); console.error('Failed to load recent activities', err); }
        })
      );
  }

  loadParcours() {
    this.parcoursService.getAll().subscribe({
        next: (data) => this.parcoursList = data,
        error: (err) => console.error('Erreur chargement parcours', err)
    });
  }

  loadUserData() {
      // Load user specific stats (supervisions)
      combineLatest({
          sync: this.supervisionService.getAll(this.currentUser.id).pipe(catchError(() => of([]))),
          async: this.asyncSupervisionService.getAll(this.currentUser.id).pipe(catchError(() => of([])))
      }).subscribe({
          next: ({ sync, async }) => {
              // The backend filters by userId for non-admins already
              const mySupervisions = [...sync.map((s: any) => ({ ...s, isAsync: false })), ...async.map((s: any) => ({ ...s, isAsync: true }))]; 
              this.recentSupervisions = mySupervisions
                .sort((a: any, b: any) => {
                    const dateA = this.getSupervisionDate(a);
                    const dateB = this.getSupervisionDate(b);
                    return dateB.getTime() - dateA.getTime();
                })
                .map((a: any) => ({ ...a, parsedDate: this.getSupervisionDate(a) }))
                .slice(0, 3);

              // Only update if we have user stats array (for user dashboard view)
              if (this.userStats && this.userStats.length > 0) {
                  this.userStats[0].value = mySupervisions.length.toString();
              }
              
              if (mySupervisions.length > 0) {
                  if (this.userStats && this.userStats.length > 1) {
                      const lastSup = mySupervisions[0];
                      // Handle Firestore Timestamps or Dates
                      const dateObj = this.getSupervisionDate(lastSup);
                      this.userStats[1].value = dateObj.toLocaleDateString();
                  }
              }
              this.cdr.markForCheck();
          },
          error: (err) => console.error('Failed to load user supervisions', err)
      });
  }

  getSupervisionDate(sup: any): Date {
      if (sup.visit_date || sup.date) {
          return parseDate(sup.visit_date || sup.date);
      }
      if (sup.created_at) {
          if (typeof sup.created_at.toDate === 'function') return sup.created_at.toDate();
          if (sup.created_at.seconds) return new Date(sup.created_at.seconds * 1000);
          return new Date(sup.created_at);
      }
      return new Date();
  }

  loadStats() {
     // 1. Fetch UEs
     this.subscriptions.add(this.ueService.getAll().subscribe({
         next: (uesData) => {
             this.ues = uesData;
             const totalUEs = uesData.length;
             this.userDashboardStats.ueCount = totalUEs;
             this.stats[0].value = totalUEs.toString();
             this.stats[0].subtext = 'Gérées sur la plateforme';
             this.cdr.markForCheck();
         },
         error: (err) => console.error('Failed to load UEs for stats', err)
     }));

     // 2. Fetch Supervisions
     const userId = !this.isAdmin && this.currentUser ? this.currentUser.id : undefined;
     this.subscriptions.add(
         combineLatest({
             sync: this.supervisionService.getAll(userId).pipe(catchError(() => of([]))),
             async: this.asyncSupervisionService.getAll(userId).pipe(catchError(() => of([])))
         }).subscribe({
         next: ({ sync, async }) => {
             const supervisionsData = [...sync.map((s: any) => ({ ...s, isAsync: false })), ...async.map((s: any) => ({ ...s, isAsync: true }))];
             this.userDashboardStats.activeSupervisions = supervisionsData.length;
             this.stats[1].value = supervisionsData.length.toString();
             this.stats[1].subtext = 'Historique des visios et asynchrones';
             this.recentSupervisions = supervisionsData
                .sort((a: any, b: any) => this.getSupervisionDate(b).getTime() - this.getSupervisionDate(a).getTime())
                .map((a: any) => ({ ...a, parsedDate: this.getSupervisionDate(a) }))
                .slice(0, 3);
             this.cdr.markForCheck();
         },
         error: (err) => console.error('Failed to load supervisions for stats', err)
     }));

     // 3. Fetch Classes & Parcours for stats calculation
     this.subscriptions.add(this.classeService.getAll().subscribe({
       next: (classes) => {
         this.dashboardClasses = classes;
         const totalClasses = classes.length;
         let totalStudents = 0;
         classes.forEach((c: any) => {
             totalStudents += (c.effectif || 0);
         });
         this.userDashboardStats.totalStudents = totalStudents;
         this.stats[2].value = totalClasses.toString();
         
         // Fetch Parcours to combine stats
         this.subscriptions.add(this.parcoursService.getAll().subscribe({
            next: (parcours) => {
                this.stats[2].subtext = `Réparties sur ${parcours.length} parcours`;
                this.cdr.markForCheck();
            }
         }));
       },
       error: (err) => console.error('Failed to load classes for stats', err)
     }));
  }
  
  userDashboardStats = {
      activeSupervisions: 0,
      ueCount: 0,
      totalStudents: 0
  };

  getUeCode(sup: any): string {
    const ueId = sup.ue_id || sup.ueId;
    if (ueId && this.ues.length) {
      const ue = this.ues.find(u => u.id === ueId || u.code === ueId);
      if (ue && ue.code) return ue.code;
    }
    return sup.ue_code || (sup.course && sup.course.code) || 'UE';
  }

  getUeName(sup: any): string {
    const ueId = sup.ue_id || sup.ueId;
    if (ueId && this.ues.length) {
      const ue = this.ues.find(u => u.id === ueId || u.code === ueId);
      if (ue && ue.name) return ue.name;
    }
    return sup.ue_real_name || sup.module || (sup.course && sup.course.name) || 'Non spécifié';
  }

  checkLocalStorage() {
    // Check common keys for previous data
    const keys = ['ues', 'courses', 'modules', 'teaching_units'];
    for (const key of keys) {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log(`Found ${parsed.length} items in localStorage key "${key}"`);
            this.localUEsData = parsed;
            this.localUEsCount = parsed.length;
            return; // Stop after first match
          }
        } catch (e) {
          console.error(`Error parsing localStorage key "${key}"`, e);
        }
      }
    }
  }

  restoreLocalUEs() {
    if (!this.localUEsData.length || this.isRestoring) return;
    
    this.isRestoring = true;
    let successCount = 0;
    let failCount = 0;
    const total = this.localUEsData.length;

    this.localUEsData.forEach(ue => {
        // Map old structure to new if necessary
        // Adjust fields if necessary (e.g. old had 'teacher' instead of 'responsible')
        const newUE = {
            ...ue,
            responsible: ue.responsible || ue.teacher || ue.teacherName || '',
            level: ue.level || ue.dept || ''
        };
        
        // Remove ID to let DB generate new one
        delete newUE.id; 
        
        this.ueService.create(newUE).subscribe({
            next: () => {
                successCount++;
                this.checkCompletion(successCount, failCount, total);
            },
            error: (err) => {
                console.error('Failed to restore UE', ue, err);
                failCount++;
                this.checkCompletion(successCount, failCount, total);
            }
        });
    });
  }

  checkCompletion(success: number, fail: number, total: number) {
      if (success + fail === total) {
          this.isRestoring = false;
          alert(`Restauration terminée : ${success} UEs importées, ${fail} échecs.`);
          this.loadData();
          // Optional: clear local storage key
          // localStorage.removeItem('ues'); 
          this.localUEsCount = 0; // Hide button
      }
  }

  get displayedUEs() {
    let result = [...this.ues];
    
    // Filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(ue => 
        (ue.code || '').toLowerCase().includes(term) || 
        (ue.name || '').toLowerCase().includes(term) ||
        (ue.level || '').toLowerCase().includes(term) ||
        (ue.responsible || '').toLowerCase().includes(term)
      );
    }

    // Sort
    result.sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      if (nameA < nameB) return this.sortDirection === 'asc' ? -1 : 1;
      if (nameA > nameB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }

  get paginatedUEs() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.displayedUEs.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages() {
    return Math.ceil(this.displayedUEs.length / this.itemsPerPage);
  }

  get pagesArray() {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }
  
  protected readonly Math = Math;

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  // --- View Modal Logic ---

  openViewModal(ue: any) {
    this.selectedUE = ue;
    this.isViewModalOpen = true;
    
    // Fetch supervisions for this UE if needed
    // Assuming supervisions have a 'ueCode' or similar field
    // For now, let's just show UE details. If you have an endpoint, uncomment:
    /*
    this.supervisionService.getAll().subscribe(supervisions => {
        this.ueSupervisions = supervisions.filter(s => s.ue_id === ue.id || s.ue_code === ue.code);
    });
    */
  }

  closeViewModal() {
    this.isViewModalOpen = false;
    this.selectedUE = null;
    this.ueSupervisions = [];
  }
  
  // --- Create / Edit Modal Logic ---

  toggleSort() {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.currentPage = 1;
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  openModal(ue: any = null) {
    this.isModalOpen = true;
    if (ue) {
      this.isEditMode = true;
      this.newUE = { ...ue }; // Clone to avoid direct mutation
      if (this.newUE.credits === undefined) {
        this.newUE.credits = this.newUE.modules_count || 0;
      }
    } else {
      this.isEditMode = false;
      this.newUE = {
        code: '',
        name: '',
        level: '',
        responsible: '',
        credits: 0,
        modules_count: 0,
        semester: '',
        phase: '',
        department: ''
      };
    }
  }

  closeModal() {
    this.isModalOpen = false;
    this.isEditMode = false;
  }

  openDeleteModal(ue: any) {
    this.ueToDelete = ue;
    this.isDeleteModalOpen = true;
  }
  
  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.ueToDelete = null;
  }

  confirmDelete() {
    if (this.ueToDelete) {
        this.ueService.delete(this.ueToDelete.id).subscribe({
            next: () => {
                this.loadData(); // Reload to refresh list and stats
                this.closeDeleteModal();
            },
            error: (err) => console.error('Error deleting UE', err)
        });
    }
  }

  getDeptBadgeClass(dept: string): string {
    const deptLower = (dept || '').toLowerCase();
    if (deptLower.includes('informat') || deptLower.includes('logiciel')) return 'bg-blue-50 text-blue-600';
    if (deptLower.includes('sci')) return 'bg-purple-50 text-purple-600';
    if (deptLower.includes('gestion') || deptLower.includes('eco') || deptLower.includes('admin') || deptLower.includes('business')) return 'bg-emerald-50 text-emerald-600';
    if (deptLower.includes('audit')) return 'bg-teal-50 text-teal-600';
    if (deptLower.includes('finance')) return 'bg-indigo-50 text-indigo-600';
    if (deptLower.includes('grh')) return 'bg-pink-50 text-pink-600';
    if (deptLower.includes('tronc') || deptLower.includes('commun')) return 'bg-slate-100 text-slate-600';
    if (deptLower.includes('multi')) return 'bg-purple-50 text-purple-600';
    return 'bg-slate-50 text-slate-700';
  }

  saveUE() {
    if (!this.newUE.code || !this.newUE.name) {
      alert('Veuillez remplir le code et le nom de l\'UE');
      return;
    }

    // Ensure numeric fields are numbers
    this.newUE.students_count = Number(this.newUE.students_count) || 0;
    this.newUE.credits = Number(this.newUE.credits) || 0;
    this.newUE.modules_count = this.newUE.credits; // double write for compatibility
    this.newUE.semester = Number(this.newUE.semester) || 1;
    this.newUE.phase = Number(this.newUE.phase) || 1;

    if (this.isEditMode && this.newUE.id) {
        this.ueService.update(this.newUE.id, this.newUE).subscribe({
            next: () => {
                this.loadData();
                this.closeModal();
            },
            error: (err) => {
                 console.error(err);
                 alert('Erreur lors de la mise à jour: ' + (err.error?.message || err.message));
            }
        });
    } else {
        this.ueService.create(this.newUE).subscribe({
            next: () => {
                this.loadData();
                this.closeModal();
            },
            error: (err) => {
                console.error(err);
                alert('Erreur lors de la création: ' + (err.error?.message || err.message));
            }
        });
    }
  }
}

