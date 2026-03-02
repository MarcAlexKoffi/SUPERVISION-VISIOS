import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParcoursService, Parcours } from '../services/parcours.service';
import { ClasseService, Classe } from '../services/classe.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-formations',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  addParcours() {
    if (!this.newParcours.code || !this.newParcours.name) {
      this.toastService.error('Veuillez remplir tous les champs du parcours');
      return;
    }
    this.parcoursService.create(this.newParcours).subscribe({
      next: () => {
        this.toastService.success('Parcours ajouté avec succès');
        this.newParcours = { code: '', name: '' };
        this.loadParcours();
      },
      error: () => this.toastService.error('Erreur lors de l\'ajout du parcours')
    });
  }

  deleteParcours(id: number) {
    if (confirm('Voulez-vous vraiment supprimer ce parcours ? Cette action peut avoir un impact sur les classes liées.')) {
      this.parcoursService.delete(id).subscribe({
        next: () => {
          this.toastService.success('Parcours supprimé');
          this.loadParcours();
          this.loadClasses(); // Reload classes as well since parcours might turn null
        },
        error: () => this.toastService.error('Erreur lors de la suppression')
      });
    }
  }

  addClasse() {
    if (!this.newClasse.name || !this.newClasse.effectif || this.newClasse.effectif <= 0) {
      this.toastService.error('Veuillez remplir le nom et un effectif valide');
      return;
    }
    this.classeService.create(this.newClasse).subscribe({
      next: () => {
        this.toastService.success('Classe ajoutée avec succès');
        this.newClasse = { name: '', effectif: 0, parcours_id: null };
        this.loadClasses();
      },
      error: () => this.toastService.error('Erreur lors de l\'ajout de la classe')
    });
  }

  deleteClasse(id: number) {
    if (confirm('Voulez-vous vraiment supprimer cette classe ?')) {
      this.classeService.delete(id).subscribe({
        next: () => {
          this.toastService.success('Classe supprimée');
          this.loadClasses();
        },
        error: () => this.toastService.error('Erreur lors de la suppression')
      });
    }
  }
}
