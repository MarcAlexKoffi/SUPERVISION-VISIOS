import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClasseService, Classe } from '../services/classe.service';
import { ParcoursService, Parcours } from '../services/parcours.service';
import { ToastService } from '../services/toast.service';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal';

@Component({
  selector: 'app-classes',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmationModalComponent],
  templateUrl: './classes.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClassesComponent implements OnInit, OnDestroy {

  private subscriptions: Subscription = new Subscription();

  trackById(index: number, item: any): any { return item?.id || index; }
  classesList: Classe[] = [];
  parcoursList: Parcours[] = [];
  newClasse: Classe = { name: '', effectif: 0, parcours_id: null };

  isEditingClasse = false;
  currentClasseId: string | null = null;
  
  isFormModalOpen = false;

  isDeleteModalOpen = false;
  itemToDelete: any = null;

  constructor(
    private classeService: ClasseService,
    private parcoursService: ParcoursService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadClasses();
    this.loadParcours();
  }

  loadClasses() {
    this.subscriptions.add(this.classeService.getAll().subscribe({
      next: (data) => {
        this.classesList = data;
        this.cdr.detectChanges();
      },
      error: () => this.toastService.error('Erreur lors du chargement des classes')
    }));
  }

  loadParcours() {
    this.subscriptions.add(this.parcoursService.getAll().subscribe({
      next: (data) => {
        this.parcoursList = data;
        this.cdr.detectChanges();
      },
      error: () => console.error('Erreur chargement parcours pour les classes')
    }));
  }

  saveClasse() {
    if (!this.newClasse.name || !this.newClasse.effectif || this.newClasse.effectif <= 0) {
      this.toastService.error('Veuillez remplir le nom et un effectif valide');
      return;
    }

    if (this.newClasse.parcours_id) {
       this.newClasse.parcours_id = String(this.newClasse.parcours_id);
    }

    if (this.isEditingClasse && this.currentClasseId) {
      this.subscriptions.add(this.classeService.update(this.currentClasseId, this.newClasse).subscribe({
        next: () => {
          this.toastService.success('Classe mise à jour avec succès');
          this.cancelEditClasse();
          this.loadClasses();
          this.cdr.markForCheck();
        },
        error: () => this.toastService.error('Erreur lors de la mise à jour de la classe')
      }));
  } else {
      this.subscriptions.add(this.classeService.create(this.newClasse).subscribe({
        next: () => {
          this.toastService.success('Classe ajoutée avec succès');
          this.cancelEditClasse();
          this.loadClasses();
          this.cdr.markForCheck();
        },
        error: () => this.toastService.error('Erreur lors de l\'ajout de la classe')
      }));
  }
  }

  editClasse(c: Classe) {
    this.newClasse = { ...c };
    this.isEditingClasse = true;
    this.currentClasseId = c.id || null;
    this.isFormModalOpen = true;
  }

  openAddModal() {
    this.cancelEditClasse();
    this.isFormModalOpen = true;
  }

  cancelEditClasse() {
    this.newClasse = { name: '', effectif: 0, parcours_id: null };
    this.isEditingClasse = false;
    this.currentClasseId = null;
    this.isFormModalOpen = false;
  }

  getNiveau(name: string): string {
    if (!name) return 'N/A';
    if (name.includes('L1')) return 'LICENCE 1';
    if (name.includes('L2')) return 'LICENCE 2';
    if (name.includes('L3')) return 'LICENCE 3';
    if (name.includes('M1')) return 'MASTER 1';
    if (name.includes('M2')) return 'MASTER 2';
    if (name.includes('B1')) return 'BACHELOR 1';
    if (name.includes('B2')) return 'BACHELOR 2';
    if (name.includes('B3')) return 'BACHELOR 3';
    return ''; // Return empty so it doesn't duplicate the class name
  }

  getParcoursName(id: string | null | undefined): string {
    if (!id) return '';
    const p = this.parcoursList.find(x => x.id === id);
    return p ? p.name : '';
  }

  confirmDeleteClasse(c: Classe) {
    this.itemToDelete = c;
    this.isDeleteModalOpen = true;
  }

  onConfirmDelete() {
    if (this.itemToDelete) {
      this.subscriptions.add(this.classeService.delete(this.itemToDelete.id).subscribe({
        next: () => {
          this.toastService.success('Classe supprimée');
          this.loadClasses();
          this.closeDeleteModal();
          this.cdr.markForCheck();
        },
        error: () => this.toastService.error('Erreur lors de la suppression')
      }));
  }
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.itemToDelete = null;
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}