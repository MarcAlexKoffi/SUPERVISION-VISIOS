
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UeService } from '../services/ue.service';
import { ToastService } from '../services/toast.service';
import { ParcoursService } from '../services/parcours.service';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal';

@Component({
  selector: 'app-ues',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmationModalComponent],
  templateUrl: './ues.html',
})
export class UesComponent implements OnInit {
  ues: any[] = [];
  searchTerm: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage = 1;
  itemsPerPage = 10;
  parcoursList: any[] = [];

  isViewModalOpen = false;
  selectedUE: any = null;

  showModal = false;
  isEditing = false;
  isLoading = false;
  isDeleteModalOpen = false;
  ueToDelete: any = null;

  currentUE: any = {
    id: null,
    code: '',
    name: '',
    responsible: '',
    department: '',
    level: '',
    semester: '',
    phase: '',
    students_count: 0,
    modules_count: 0
  };

  constructor(
    private ueService: UeService,
    private parcoursService: ParcoursService,
    private toastService: ToastService
  ) { }

  ngOnInit() {
    this.loadUEs();
    this.loadParcours();
    
    // Subscribe to refresh events if available
    if (this.ueService.refreshNeeded$) {
      this.ueService.refreshNeeded$.subscribe(() => {
        this.loadUEs();
      });
    }
  }

  loadParcours() {
    this.parcoursService.getAll().subscribe({
      next: (data) => {
        this.parcoursList = data;
        console.log('Parcours loaded:', data);
      },
      error: (err) => console.error('Erreur loading parcours', err)
    });
  }

  loadUEs() {
    this.ueService.getAll().subscribe({
      next: (data) => {
        this.ues = data;
      },
      error: (err) => console.error('Erreur chargement UEs', err)
    });
  }

  get displayedUEs() {
    let result = [...this.ues];
    
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(ue => 
        (ue.code || '').toLowerCase().includes(term) || 
        (ue.name || '').toLowerCase().includes(term) ||
        (ue.department || '').toLowerCase().includes(term) ||
        (ue.level || '').toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
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
    return Math.max(1, Math.ceil(this.displayedUEs.length / this.itemsPerPage));
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  toggleSort() {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.currentPage = 1;
  }

  openViewModal(ue: any) {
    this.selectedUE = ue;
    this.isViewModalOpen = true;
  }

  closeViewModal() {
    this.isViewModalOpen = false;
    this.selectedUE = null;
  }

  openModal(ue: any = null) {
    if (ue) {
      this.isEditing = true;
      this.currentUE = { ...ue };
    } else {
      this.isEditing = false;
      this.currentUE = { 
        code: '', 
        name: '', 
        responsible: '',
        department: '', 
        level: '', 
        semester: '', 
        phase: '',
        students_count: 0,
        modules_count: 0
      };
    }
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  saveUE() {
    this.isLoading = true;
    if (this.isEditing) {
      this.ueService.update(this.currentUE.id, this.currentUE).subscribe({
        next: () => {
          this.toastService.success('UE mise à jour avec succès');
          this.isLoading = false;
          this.closeModal();
          this.loadUEs();
        },
        error: () => {
          this.toastService.error('Erreur lors de la mise à jour');
          this.isLoading = false;
        }
      });
    } else {
      this.ueService.create(this.currentUE).subscribe({
        next: () => {
          this.toastService.success('UE ajoutée avec succès');
          this.isLoading = false;
          this.closeModal();
          this.loadUEs();
        },
        error: () => {
          this.toastService.error('Erreur lors de l\'ajout');
          this.isLoading = false;
        }
      });
    }
  }

  deleteUE(ue: any) {
    console.log('deleteUE called for', ue);
    // open our custom confirmation modal
    this.ueToDelete = ue;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.ueToDelete = null;
  }

  cancelDelete() {
    console.log('cancel delete clicked');
    this.closeDeleteModal();
  }

  confirmDelete() {
    if (!this.ueToDelete) return;
    console.log('confirmDelete called for', this.ueToDelete);
    this.ueService.delete(this.ueToDelete.id).subscribe({
      next: () => {
        this.toastService.success('UE supprimée');
        this.closeDeleteModal();
        this.loadUEs();
      },
      error: () => {
        this.toastService.error('Erreur lors de la suppression');
        this.closeDeleteModal();
      }
    });
  }

  onDeleteButtonClick() {
    console.log('onDeleteButtonClick - button pressed');
    this.confirmDelete();
  }
}
