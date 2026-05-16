import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UeService } from '../services/ue.service';
import { SupervisionService } from '../services/supervision.service';
import { ClasseService } from '../services/classe.service';
import { AuthService } from '../services/auth.service';
import { ParcoursService } from '../services/parcours.service';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { parseDate } from '../shared/utils/date.utils';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.scss',
})
export class DashboardHome implements OnInit, OnDestroy {
  isModalOpen = false;
  isAdmin = false;
  currentUser: any = null;
  private subscriptions: Subscription = new Subscription();
  parcoursList: any[] = [];

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
    private authService: AuthService,
    private parcoursService: ParcoursService,
    private classeService: ClasseService,
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
      } else {
          this.loadUserData();
          this.loadStats(); // Loads !isAdmin context correctly based on logic
      }
  }

  loadParcours() {
    this.parcoursService.getAll().subscribe({
        next: (data) => this.parcoursList = data,
        error: (err) => console.error('Erreur chargement parcours', err)
    });
  }

  loadUserData() {
      // Load user specific stats (supervisions)
      this.supervisionService.getAll(this.currentUser.id).subscribe({
          next: (data) => {
              // The backend filters by userId for non-admins already
              const mySupervisions = data; 
              this.recentSupervisions = mySupervisions
                .sort((a: any, b: any) => {
                    const dateA = parseDate(a.visit_date || a.date);
                    const dateB = parseDate(b.visit_date || b.date);
                    return dateB.getTime() - dateA.getTime();
                })
                .map((a: any) => ({ ...a, parsedDate: parseDate(a.visit_date || a.date) }))
                .slice(0, 3);

              // Only update if we have user stats array (for user dashboard view)
              if (this.userStats && this.userStats.length > 0) {
                  this.userStats[0].value = mySupervisions.length.toString();
              }
              
              if (mySupervisions.length > 0) {
                  if (this.userStats && this.userStats.length > 1) {
                      const lastSup = mySupervisions[0];
                      // Handle Firestore Timestamps or Dates
                      const dateObj = parseDate(lastSup.visit_date || lastSup.date);
                      this.userStats[1].value = dateObj.toLocaleDateString();
                  }
              }
          },
          error: (err) => console.error('Failed to load user supervisions', err)
      });
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
     this.subscriptions.add(this.supervisionService.getAll(userId).subscribe({
         next: (supervisionsData) => {
             this.userDashboardStats.activeSupervisions = supervisionsData.length;
             this.stats[1].value = supervisionsData.length.toString();
             this.stats[1].subtext = 'Historique des visios';
             this.recentSupervisions = supervisionsData
                .sort((a: any, b: any) => parseDate(b.visit_date || b.date).getTime() - parseDate(a.visit_date || a.date).getTime())
                .map((a: any) => ({ ...a, parsedDate: parseDate(a.visit_date || a.date) }))
                .slice(0, 3);
             this.cdr.markForCheck();
         },
         error: (err) => console.error('Failed to load supervisions for stats', err)
     }));

     // 3. Fetch Classes & Parcours for stats calculation
     this.subscriptions.add(this.classeService.getAll().subscribe({
       next: (classes) => {
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
    } else {
      this.isEditMode = false;
      this.newUE = {
        code: '',
        name: '',
        level: '',
        responsible: '',
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
    this.newUE.modules_count = Number(this.newUE.modules_count) || 0;
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

