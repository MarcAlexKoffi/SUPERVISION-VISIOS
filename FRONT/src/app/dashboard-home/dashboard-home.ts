import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.scss',
})
export class DashboardHome implements OnInit {
  isModalOpen = false;

  newUE: any = {
    code: '',
    name: '',
    dept: '',
    responsible: '',
    students: 0,
    modules: 0,
    level: '',
    semester: null,
    phase: null
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
  ueToDeleteIndex: number | null = null;
  isEditMode = false;
  editingIndex: number | null = null;
  
  currentPage = 1;
  itemsPerPage = 10;

  get displayedUEs() {
    let result = [...this.ues];
    
    // Filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(ue => 
        ue.code.toLowerCase().includes(term) || 
        ue.name.toLowerCase().includes(term) ||
        ue.dept.toLowerCase().includes(term) ||
        ue.responsible.toLowerCase().includes(term)
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

  toggleSort() {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.currentPage = 1;
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    // 1. Load UEs
    const storedUEs = localStorage.getItem('ues');
    if (storedUEs) {
      this.ues = JSON.parse(storedUEs);
    } else {
      // Initialize with default if empty
      this.ues = [
        { code: 'INF101', name: 'Introduction à l\'Algorithmique', responsible: 'Dr. K. Sow', dept: 'Informatique', deptColor: 'bg-blue-50 text-blue-700', students: 120, modules: 4 },
        { code: 'MAT200', name: 'Statistiques Appliquées', responsible: 'Prof. A. Benali', dept: 'Sciences', deptColor: 'bg-purple-50 text-purple-700', students: 85, modules: 3 },
        { code: 'ECO305', name: 'Microéconomie Avancée', responsible: 'Dr. S. Diallo', dept: 'Gestion', deptColor: 'bg-orange-50 text-orange-700', students: 45, modules: 2 },
      ];
      localStorage.setItem('ues', JSON.stringify(this.ues));
    }
    this.updateStats();
  }

  updateStats() {
    // 1. Count Active UEs
    this.stats[0].value = this.ues.length.toString();

    // 2. Count Total Students (Sum of students in all UEs)
    const totalStudents = this.ues.reduce((sum, ue) => sum + (parseInt(ue.students) || 0), 0);
    this.stats[1].value = totalStudents.toLocaleString('fr-FR');

    // 3. Count Sessions (Supervisions)
    const storedHistory = localStorage.getItem('supervisionHistory');
    if (storedHistory) {
      const history = JSON.parse(storedHistory);
      this.stats[2].value = history.length.toString();
    } else {
      this.stats[2].value = '0';
    }
  }

  editingUE: any = null;
  ueToDelete: any = null;

  openModal(ue: any = null) {
    this.isModalOpen = true;
    if (ue) {
      this.isEditMode = true;
      this.editingUE = ue;
      this.newUE = { ...ue }; // Clone to avoid direct mutation
    } else {
      this.isEditMode = false;
      this.editingUE = null;
      this.newUE = {
        code: '',
        name: '',
        dept: '',
        responsible: '',
        students: 0,
        modules: 1
      };
    }
  }

  closeModal() {
    this.isModalOpen = false;
    this.isEditMode = false;
    this.editingUE = null;
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
      this.ues = this.ues.filter(u => u !== this.ueToDelete);
      this.saveToLocalStorage();
      this.updateStats();
      this.closeDeleteModal();
    }
  }

  saveToLocalStorage() {
    localStorage.setItem('ues', JSON.stringify(this.ues));
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
    if (!this.newUE.code || !this.newUE.name || !this.newUE.dept) {
      alert('Veuillez remplir les champs obligatoires');
      return;
    }

    const color = this.getDeptBadgeClass(this.newUE.dept);
    
    const ueToSave = {
      ...this.newUE,
      deptColor: color
    };

    if (this.isEditMode && this.editingUE) {
      const index = this.ues.indexOf(this.editingUE);
      if (index !== -1) {
        this.ues[index] = ueToSave;
      }
    } else {
      this.ues.unshift(ueToSave);
    }

    this.saveToLocalStorage();
    this.updateStats();

    this.closeModal();
  }
}

