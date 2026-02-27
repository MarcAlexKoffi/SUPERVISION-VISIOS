import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UeService } from '../services/ue.service';
import { SupervisionService } from '../services/supervision.service';
import { AuthService } from '../services/auth.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.scss',
})
export class DashboardHome implements OnInit {
  isModalOpen = false;
  isAdmin = false;
  currentUser: any = null;

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
    students_count: 0,
    modules_count: 0,
    semester: '',
    phase: '',
    department: ''
  };

  stats: any[] = [
    { label: 'Total UE Actives', value: '0', icon: 'library_books', color: 'bg-blue-50 text-blue-600', iconBg: 'bg-blue-50 text-blue-600' },
    { label: 'Étudiants Inscrits', value: '0', icon: 'groups', color: 'bg-green-50 text-green-600', iconBg: 'bg-green-50 text-green-600' },
    { label: 'Sessions Enregistrées', value: '0', icon: 'videocam', color: 'bg-purple-50 text-purple-600', iconBg: 'bg-purple-50 text-purple-600' }
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
    private authService: AuthService
  ) {}

  loadUserData() {
      // Load user specific stats
      this.supervisionService.getAll().subscribe({
          next: (data) => {
              // The backend filters by userId for non-admins already in getAllSupervisions
              const mySupervisions = data; 
              this.userStats[0].value = mySupervisions.length.toString();
              
              if (mySupervisions.length > 0) {
                  // Sort by date desc
                  mySupervisions.sort((a: any, b: any) => new Date(b.visit_date || b.date).getTime() - new Date(a.visit_date || a.date).getTime());
                  const lastSup = mySupervisions[0];
                  this.userStats[1].value = new Date(lastSup.visit_date || lastSup.date).toLocaleDateString();
                  
                  this.recentSupervisions = mySupervisions.slice(0, 5);
              }
          },
          error: (err) => console.error('Error loading user data', err)
      });
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

  ngOnInit() {
      const user = this.authService.currentUserValue;
      this.currentUser = user?.user;
      this.isAdmin = this.currentUser?.role === 'admin';

      this.checkLocalStorage();

      if (this.isAdmin) {
          this.loadData();
      } else {
          this.loadUserData();
      }
  }

  loadData() {
    // 1. Load UEs from API
    this.ueService.getAll().subscribe({
        next: (data) => {
            console.log('UEs loaded:', data);
            this.ues = data;
            this.updateStats();
        },
        error: (err) => {
            console.error('Error loading UEs', err);
            if (err.status === 401 || err.status === 403) {
                 // Token might be invalid after DB reset
                 alert('Session expirée ou invalide. Veuillez vous reconnecter.');
            }
        }
    });

    // 2. Load Supervision Stats
    this.supervisionService.getAll().subscribe({
        next: (data) => {
             this.stats[2].value = data.length.toString();
        },
        error: (err) => console.error('Error loading supervisions', err)
    });
  }

  updateStats() {
    // 1. Count Active UEs
    this.stats[0].value = this.ues.length.toString();

    // 2. Count Total Students (Sum of students in all UEs)
    const totalStudents = this.ues.reduce((sum, ue) => sum + (parseInt(ue.students_count) || 0), 0);
    this.stats[1].value = totalStudents.toLocaleString('fr-FR');
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
        students_count: 0,
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
    if (deptLower.includes('informat')) return 'bg-blue-50 text-blue-700';
    if (deptLower.includes('sci')) return 'bg-purple-50 text-purple-700';
    if (deptLower.includes('gestion') || deptLower.includes('eco')) return 'bg-orange-50 text-orange-700';
    if (deptLower.includes('audit')) return 'bg-emerald-50 text-emerald-700';
    if (deptLower.includes('finance')) return 'bg-indigo-50 text-indigo-700';
    if (deptLower.includes('grh')) return 'bg-pink-50 text-pink-700';
    if (deptLower.includes('fiscalit')) return 'bg-cyan-50 text-cyan-700';
    if (deptLower.includes('mark')) return 'bg-rose-50 text-rose-700';
    if (deptLower.includes('admin')) return 'bg-slate-50 text-slate-700';
    return 'bg-slate-50 text-slate-700';
  }

  saveUE() {
    if (!this.newUE.code || !this.newUE.name) {
      alert('Veuillez remplir le code et le nom de l\'UE');
      return;
    }

    if (this.isEditMode && this.newUE.id) {
        this.ueService.update(this.newUE.id, this.newUE).subscribe({
            next: () => {
                this.loadData();
                this.closeModal();
            },
            error: (err) => alert('Erreur lors de la mise à jour')
        });
    } else {
        this.ueService.create(this.newUE).subscribe({
            next: () => {
                this.loadData();
                this.closeModal();
            },
            error: (err) => alert('Erreur lors de la création')
        });
    }
  }
}

