
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UeService } from '../services/ue.service';
import { ToastService } from '../services/toast.service';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal';

@Component({
  selector: 'app-ues',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmationModalComponent],
  templateUrl: './ues.html',
})
export class UesComponent implements OnInit {
  ues: any[] = [];
  showModal = false;
  isEditing = false;
  isLoading = false;
  isDeleteModalOpen = false;
  ueToDelete: any = null;

  currentUE: any = {
    id: null,
    code: '',
    name: '',
    department: '',
    level: '',
    semester: '',
    students_count: 0
  };

  constructor(
    private ueService: UeService,
    private toastService: ToastService
  ) { }

  ngOnInit() {
    this.loadUEs();
    this.ueService.refreshNeeded$.subscribe(() => {
      this.loadUEs();
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

  openModal(ue: any = null) {
    if (ue) {
      this.isEditing = true;
      this.currentUE = { ...ue };
    } else {
      this.isEditing = false;
      this.currentUE = { code: '', name: '', department: '', level: '', semester: '', students_count: 0 };
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
