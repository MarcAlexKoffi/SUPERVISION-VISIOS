import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParcoursService, Parcours } from '../services/parcours.service';
import { ClasseService, Classe } from '../services/classe.service';
import { ToastService } from '../services/toast.service';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal';

@Component({
  selector: 'app-formations',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmationModalComponent],
  templateUrl: './formations.html',
  styleUrls: ['./formations.scss']
})
export class Formations implements OnInit {
  // Parcours State
  parcoursList: Parcours[] = [];
  newParcours: Parcours = { code: '', name: '' };
  
  // Classes State
  classesList: Classe[] = [];
  newClasse: Classe = { name: '', effectif: 0, parcours_id: null };

  // Edit State
  isEditingParcours = false;
  currentParcoursId: number | null = null;
  
  isEditingClasse = false;
  currentClasseId: number | null = null;

  // Modal State
  isDeleteModalOpen = false;
  deleteType: 'parcours' | 'classe' | null = null;
  itemToDelete: any = null;

  constructor(
    private parcoursService: ParcoursService,
    private classeService: ClasseService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.loadParcours();
    this.loadClasses();
  }

  loadParcours() {
    this.parcoursService.getAll().subscribe({
      next: (data) => this.parcoursList = data,
      error: () => this.toastService.error('Erreur lors du chargement des parcours')
    });
  }

  loadClasses() {
    this.classeService.getAll().subscribe({
      next: (data) => this.classesList = data,
      error: () => this.toastService.error('Erreur lors du chargement des classes')
    });
  }

  // --- Parcours Methods ---

  saveParcours() {
    if (!this.newParcours.code || !this.newParcours.name) {
      this.toastService.error('Veuillez remplir tous les champs du parcours');
      return;
    }

    if (this.isEditingParcours && this.currentParcoursId) {
      this.parcoursService.update(this.currentParcoursId, this.newParcours).subscribe({
        next: () => {
          this.toastService.success('Parcours mis à jour avec succès');
          this.cancelEditParcours();
          this.loadParcours();
          this.loadClasses();
        },
        error: () => this.toastService.error('Erreur lors de la mise à jour du parcours')
      });
    } else {
      this.parcoursService.create(this.newParcours).subscribe({
        next: () => {
          this.toastService.success('Parcours ajouté avec succès');
          this.cancelEditParcours();
          this.loadParcours();
        },
        error: () => this.toastService.error('Erreur lors de l\'ajout du parcours')
      });
    }
  }

  editParcours(p: Parcours) {
    this.newParcours = { ...p };
    this.isEditingParcours = true;
    this.currentParcoursId = p.id || null;
  }

  cancelEditParcours() {
    this.newParcours = { code: '', name: '' };
    this.isEditingParcours = false;
    this.currentParcoursId = null;
  }

  confirmDeleteParcours(p: Parcours) {
    this.itemToDelete = p;
    this.deleteType = 'parcours';
    this.isDeleteModalOpen = true;
  }

  // --- Classes Methods ---

  saveClasse() {
    if (!this.newClasse.name || !this.newClasse.effectif || this.newClasse.effectif <= 0) {
      this.toastService.error('Veuillez remplir le nom et un effectif valide');
      return;
    }

    if (this.isEditingClasse && this.currentClasseId) {
      this.classeService.update(this.currentClasseId, this.newClasse).subscribe({
        next: () => {
          this.toastService.success('Classe mise à jour avec succès');
          this.cancelEditClasse();
          this.loadClasses();
        },
        error: () => this.toastService.error('Erreur lors de la mise à jour de la classe')
      });
    } else {
      this.classeService.create(this.newClasse).subscribe({
        next: () => {
          this.toastService.success('Classe ajoutée avec succès');
          this.cancelEditClasse();
          this.loadClasses();
        },
        error: () => this.toastService.error('Erreur lors de l\'ajout de la classe')
      });
    }
  }

  editClasse(c: Classe) {
    this.newClasse = { ...c };
    this.isEditingClasse = true;
    this.currentClasseId = c.id || null;
  }

  cancelEditClasse() {
    this.newClasse = { name: '', effectif: 0, parcours_id: null };
    this.isEditingClasse = false;
    this.currentClasseId = null;
  }

  confirmDeleteClasse(c: Classe) {
    this.itemToDelete = c;
    this.deleteType = 'classe';
    this.isDeleteModalOpen = true;
  }

  // --- Modal Logic ---

  onConfirmDelete() {
    if (this.deleteType === 'parcours' && this.itemToDelete) {
      this.parcoursService.delete(this.itemToDelete.id).subscribe({
        next: () => {
          this.toastService.success('Parcours supprimé');
          this.loadParcours();
          this.loadClasses();
          this.closeDeleteModal();
        },
        error: () => this.toastService.error('Erreur lors de la suppression')
      });
    } else if (this.deleteType === 'classe' && this.itemToDelete) {
      this.classeService.delete(this.itemToDelete.id).subscribe({
        next: () => {
          this.toastService.success('Classe supprimée');
          this.loadClasses();
          this.closeDeleteModal();
        },
        error: () => this.toastService.error('Erreur lors de la suppression')
      });
    }
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.deleteType = null;
    this.itemToDelete = null;
  }
}
