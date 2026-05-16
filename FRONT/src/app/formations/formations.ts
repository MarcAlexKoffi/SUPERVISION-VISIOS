import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParcoursService, Parcours } from '../services/parcours.service';
import { ToastService } from '../services/toast.service';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal';

@Component({
  selector: 'app-formations',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmationModalComponent],
  templateUrl: './formations.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./formations.scss']
})
export class Formations implements OnInit, OnDestroy {

  private subscriptions: Subscription = new Subscription();

  trackById(index: number, item: any): any { return item?.id || index; }
  // Parcours State
  parcoursList: Parcours[] = [];
  newParcours: Parcours = { code: '', name: '' };

  // Edit State
  isEditingParcours = false;
  currentParcoursId: string | null = null;
  
  // Modal State
  isModalOpen = false;
  isDeleteModalOpen = false;
  itemToDelete: Parcours | null = null;

  constructor(
    private parcoursService: ParcoursService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadParcours();
  }

  loadParcours() {
    this.subscriptions.add(this.parcoursService.getAll().subscribe({
      next: (data) => {
        this.parcoursList = data;
        this.cdr.markForCheck();
      },
      error: () => this.toastService.error('Erreur lors du chargement des parcours')
    }));
  }

  // --- Parcours Methods ---

  openModal() {
    this.isModalOpen = true;
    this.isEditingParcours = false;
    this.newParcours = { code: '', name: '' };
  }

  closeModal() {
    this.isModalOpen = false;
    this.cancelEditParcours();
  }

  saveParcours() {
    if (!this.newParcours.code || !this.newParcours.name) {
      this.toastService.error('Veuillez remplir tous les champs du parcours');
      return;
    }

    if (this.isEditingParcours && this.currentParcoursId) {
      this.subscriptions.add(this.parcoursService.update(this.currentParcoursId, this.newParcours).subscribe({
        next: () => {
          this.toastService.success('Parcours mis à jour avec succès');
          this.closeModal();
          this.loadParcours();
          this.cdr.markForCheck();
        },
        error: () => this.toastService.error('Erreur lors de la mise à jour du parcours')
      }));
  } else {
      this.subscriptions.add(this.parcoursService.create(this.newParcours).subscribe({
        next: () => {
          this.toastService.success('Parcours ajouté avec succès');
          this.closeModal();
          this.loadParcours();
          this.cdr.markForCheck();
        },
        error: () => this.toastService.error('Erreur lors de l\'ajout du parcours')
      }));
  }
  }

  editParcours(p: Parcours) {
    this.newParcours = { ...p };
    this.isEditingParcours = true;
    this.currentParcoursId = p.id || null;
    this.isModalOpen = true;
  }

  cancelEditParcours() {
    this.newParcours = { code: '', name: '' };
    this.isEditingParcours = false;
    this.currentParcoursId = null;
  }

  confirmDeleteParcours(p: Parcours) {
    this.itemToDelete = p;
    this.isDeleteModalOpen = true;
  }

  onConfirmDelete() {
    if (this.itemToDelete && this.itemToDelete.id) {
      this.subscriptions.add(this.parcoursService.delete(this.itemToDelete.id).subscribe({
        next: () => {
          this.toastService.success('Parcours supprimé');
          this.loadParcours();
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

  // --- Dynamic UI Helpers ---

  getIconName(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('admin') || n.includes('management') || n.includes('business')) return 'domain';
    if (n.includes('audit') || n.includes('finance') || n.includes('compta')) return 'account_balance';
    if (n.includes('market') || n.includes('com')) return 'campaign';
    if (n.includes('info') || n.includes('dev') || n.includes('data') || n.includes('logiciel')) return 'computer';
    if (n.includes('rh') || n.includes('ressources')) return 'group';
    return 'school';
  }

  getIconBg(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('admin') || n.includes('management') || n.includes('business')) return 'bg-indigo-100 text-indigo-600';
    if (n.includes('audit') || n.includes('finance') || n.includes('compta')) return 'bg-sky-100 text-sky-600';
    if (n.includes('market') || n.includes('com')) return 'bg-orange-600 text-white';
    if (n.includes('info') || n.includes('dev') || n.includes('logiciel')) return 'bg-blue-100 text-blue-600';
    if (n.includes('rh') || n.includes('ressources')) return 'bg-emerald-100 text-emerald-600';
    return 'bg-slate-100 text-slate-600';
  }

  getDepartment(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('admin') || n.includes('management') || n.includes('business')) return 'Management';
    if (n.includes('audit') || n.includes('finance') || n.includes('compta')) return 'Finance';
    if (n.includes('market') || n.includes('com')) return 'Communication';
    if (n.includes('info') || n.includes('dev') || n.includes('logiciel')) return 'Informatique';
    if (n.includes('rh') || n.includes('ressources')) return 'Ressources Humaines';
    return 'Général';
  }

  getStudentCount(name: string): number {
    // Generate a pseudo-random deterministic number based on string length to simulate data
    const base = name.length * 7;
    return (base % 100) + 50; 
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}