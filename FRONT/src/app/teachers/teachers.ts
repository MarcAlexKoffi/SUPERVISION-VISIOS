
import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeacherService } from '../services/teacher.service';
import { ToastService } from '../services/toast.service';
import { ParcoursService } from '../services/parcours.service';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal';

@Component({
  selector: 'app-teachers',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmationModalComponent],
  templateUrl: './teachers.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TeachersComponent implements OnInit, OnDestroy {

  private subscriptions: Subscription = new Subscription();

  trackById(index: number, item: any): any { return item?.id || index; }
  teachers: any[] = [];
  searchQuery: string = '';
  parcoursList: any[] = [];
  showModal = false;
  isEditing = false;
  isLoading = false;

  get filteredTeachers(): any[] {
    if (!this.searchQuery) return this.teachers;
    const lowerQuery = this.searchQuery.toLowerCase();
    return this.teachers.filter(t => 
      t.first_name?.toLowerCase().includes(lowerQuery) || 
      t.last_name?.toLowerCase().includes(lowerQuery) ||
      t.email?.toLowerCase().includes(lowerQuery) ||
      t.department?.toLowerCase().includes(lowerQuery)
    );
  }

  showDeleteModal = false;
  teacherToDelete: any = null;

  currentTeacher: any = {
    id: null,
    first_name: '',
    last_name: '',
    email: '',
    department: '',
    status: 'active'
  };

  constructor(
    private teacherService: TeacherService,
    private parcoursService: ParcoursService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.loadTeachers(); // Starts the realtime listener
    // Parcours are also loaded via realtime listener if migrated
    // this.loadParcours(); 
    // Actually, loadParcours calls getAll.
    this.subscriptions.add(this.parcoursService.getAll().subscribe({
      next: (data) => {
        this.parcoursList = data;
        this.cdr.detectChanges();
      }
    }));
  }

  // loadParcours removed as separate method if simple enough or keep it but change logic
  // Let's keep loadParcours separate if needed but I'll inline for clarity in replacement
  
  loadTeachers() {
    this.subscriptions.add(this.teacherService.getAll().subscribe({
      next: (data) => {
        this.teachers = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Erreur chargement enseignants', err)
    }));
  }

  openModal(teacher: any = null) {
    if (teacher) {
      this.isEditing = true;
      this.currentTeacher = {
        id: teacher.id,
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        email: teacher.email,
        department: teacher.department,
        status: teacher.status || 'active'
      };
    } else {
      this.isEditing = false;
      this.currentTeacher = { first_name: '', last_name: '', email: '', department: '', status: 'active' };
    }
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  saveTeacher() {
    this.isLoading = true;
    if (this.isEditing) {
      this.subscriptions.add(this.teacherService.update(this.currentTeacher.id, this.currentTeacher).subscribe({
        next: () => {
          this.toastService.success('Enseignant mis à jour avec succès');
          this.isLoading = false;
          this.closeModal();
          this.cdr.markForCheck();
        },
        error: () => {
          this.toastService.error('Erreur lors de la mise à jour');
          this.isLoading = false;
        }
      }));
  } else {
      this.subscriptions.add(this.teacherService.create(this.currentTeacher).subscribe({
        next: () => {
          this.toastService.success('Enseignant ajouté avec succès');
          this.isLoading = false;
          this.closeModal();
          this.cdr.markForCheck();
        },
        error: () => {
          this.toastService.error('Erreur lors de l\'ajout');
          this.isLoading = false;
        }
      }));
  }
  }

  deleteTeacher(teacher: any) {
    this.teacherToDelete = teacher;
    this.showDeleteModal = true;
  }

  cancelDelete() {
    this.showDeleteModal = false;
    this.teacherToDelete = null;
  }

  confirmDelete() {
    if (!this.teacherToDelete) return;
    this.subscriptions.add(this.teacherService.delete(this.teacherToDelete.id).subscribe({
      next: () => {
        this.toastService.success('Enseignant supprimé');
        this.showDeleteModal = false;
        this.teacherToDelete = null;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toastService.error('Erreur lors de la suppression');
        this.showDeleteModal = false;
        this.cdr.markForCheck();
      }
    }));
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}