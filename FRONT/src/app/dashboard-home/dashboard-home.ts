import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UeService } from '../services/ue.service';
import { SupervisionService } from '../services/supervision.service';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.scss',
})
export class DashboardHome implements OnInit {
  isModalOpen = false;

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

  stats = [
    { label: 'Total UE Actives', value: '0', icon: 'library_books', color: 'bg-blue-50 text-blue-600', iconBg: 'bg-blue-50 text-blue-600' },
    { label: 'Étudiants Inscrits', value: '0', icon: 'groups', color: 'bg-green-50 text-green-600', iconBg: 'bg-green-50 text-green-600' },
    { label: 'Sessions Enregistrées', value: '0', icon: 'videocam', color: 'bg-purple-50 text-purple-600', iconBg: 'bg-purple-50 text-purple-600' }
  ];

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

  constructor(
    private ueService: UeService,
    private supervisionService: SupervisionService
  ) {}

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
    this.loadData();
  }

  loadData() {
    // 1. Load UEs from API
    this.ueService.getAll().subscribe({
        next: (data) => {
            this.ues = data;
            this.updateStats();
        },
        error: (err) => console.error('Error loading UEs', err)
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

