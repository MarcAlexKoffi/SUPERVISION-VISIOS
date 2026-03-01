import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService, User } from '../services/user.service';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmationModalComponent],
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class UsersComponent implements OnInit {
  isModalOpen = false;
  isDeleteModalOpen = false;
  showPassword = false;
  isEditMode = false;

  newUser: any = {
    username: '',
    email: '',
    role: 'enseignant',
    password: ''
  };

  userToDelete: User | null = null;
  users: User[] = [];

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    const currentUser = this.authService.currentUserValue;
    // Check both potential locations for role to be safe
    const role = currentUser?.user?.role || currentUser?.role;

    // if (role !== 'admin') {
    //   this.router.navigate(['/']); // Redirect if not admin
    //   return;
    // }
    this.loadUsers();
  }

  loadUsers() {
    this.userService.getAll().subscribe({
      next: (data) => {
        this.users = data;
      },
      error: (err) => console.error('Erreur chargement utilisateurs', err)
    });
  }

  openModal(user?: User) {
    if (user) {
      this.isEditMode = true;
      this.newUser = { ...user, password: '' }; // Don't fill password on edit
    } else {
      this.isEditMode = false;
      this.newUser = { username: '', email: '', role: 'enseignant', password: '' };
    }
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.isEditMode = false;
    this.newUser = { username: '', email: '', role: 'enseignant', password: '' };
  }

  openDeleteModal(user: User) {
    this.userToDelete = user;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.userToDelete = null;
  }

  saveUser() {
    if (!this.newUser.username) {
      alert('Le nom d\'utilisateur est obligatoire');
      return;
    }

    if (!this.isEditMode && !this.newUser.password) {
      alert('Le mot de passe est obligatoire pour la création');
      return;
    }

    if (this.isEditMode) {
      this.userService.update(this.newUser.id, this.newUser).subscribe({
        next: () => {
          this.loadUsers();
          this.closeModal();
        },
        error: (err) => {
          console.error('Erreur modification', err);
          alert('Erreur lors de la modification de l\'utilisateur');
        }
      });
    } else {
      this.userService.create(this.newUser).subscribe({
        next: () => {
          this.loadUsers();
          this.closeModal();
        },
        error: (err) => {
          console.error('Erreur création', err);
          alert('Erreur lors de la création de l\'utilisateur');
        }
      });
    }
  }

  confirmDelete() {
    if (this.userToDelete) {
      this.userService.delete(this.userToDelete.id).subscribe({
        next: () => {
          this.loadUsers();
          this.closeDeleteModal();
        },
        error: (err) => {
          console.error(err);
          alert('Erreur lors de la suppression');
        }
      });
    }
  }

  getAvatar(name: string) {
    return `https://ui-avatars.com/api/?name=${name}&background=random&color=fff`;
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'enseignant':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'superviseur':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      case 'etudiant':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
    }
  }
}