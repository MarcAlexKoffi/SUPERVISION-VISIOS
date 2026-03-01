
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeacherService } from '../services/teacher.service';
import { ToastService } from '../services/toast.service'; // Assuming ToastService exists
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal';

@Component({
  selector: 'app-teachers',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmationModalComponent],
  templateUrl: './teachers.html',
})
export class TeachersComponent implements OnInit {
  teachers: any[] = [];
  showModal = false;
  isEditing = false;
  isLoading = false;

  showDeleteModal = false;
  teacherToDelete: any = null;

  currentTeacher: any = {
    id: null,
    firstName: '',
    lastName: '',
    email: '',
    department: '',
    status: 'active'
  };

  constructor(
    private teacherService: TeacherService,
    private toastService: ToastService
  ) { }

  ngOnInit() {
    this.loadTeachers();
    this.teacherService.refreshNeeded$.subscribe(() => {
      this.loadTeachers();
    });
  }

  loadTeachers() {
    this.teacherService.getAll().subscribe({
      next: (data) => {
        this.teachers = data;
      },
      error: (err) => console.error('Erreur chargement enseignants', err)
    });
  }

  openModal(teacher: any = null) {
    if (teacher) {
      this.isEditing = true;
      this.currentTeacher = {
        id: teacher.id,
        firstName: teacher.first_name,
        lastName: teacher.last_name,
        email: teacher.email,
        department: teacher.department,
        status: teacher.status || 'active'
      };
    } else {
      this.isEditing = false;
      this.currentTeacher = { firstName: '', lastName: '', email: '', department: '', status: 'active' };
    }
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  saveTeacher() {
    this.isLoading = true;
    if (this.isEditing) {
      this.teacherService.update(this.currentTeacher.id, this.currentTeacher).subscribe({
        next: () => {
          this.toastService.success('Enseignant mis à jour avec succès');
          this.isLoading = false;
          this.closeModal();
        },
        error: () => {
          this.toastService.error('Erreur lors de la mise à jour');
          this.isLoading = false;
        }
      });
    } else {
      this.teacherService.create(this.currentTeacher).subscribe({
        next: () => {
          this.toastService.success('Enseignant ajouté avec succès');
          this.isLoading = false;
          this.closeModal();
        },
        error: () => {
          this.toastService.error('Erreur lors de l\'ajout');
          this.isLoading = false;
        }
      });
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
    this.teacherService.delete(this.teacherToDelete.id).subscribe({
      next: () => {
        this.toastService.success('Enseignant supprimé');
        this.showDeleteModal = false;
        this.teacherToDelete = null;
      },
      error: () => {
        this.toastService.error('Erreur lors de la suppression');
        this.showDeleteModal = false;
      }
    });
  }
}
