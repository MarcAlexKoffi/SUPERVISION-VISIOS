import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService, User } from '../services/user.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class UsersComponent implements OnInit {
  isModalOpen = false;
  showPassword = false;

  newUser: any = {
    username: '',
    role: 'user',
    password: ''
  };

  users: User[] = [];

  constructor(private userService: UserService) {}

  ngOnInit() {
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

  openModal() {
    this.newUser = { username: '', role: 'user', password: '' };
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  saveUser() {
    if (!this.newUser.username || !this.newUser.password) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

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

  deleteUser(id: number) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      this.userService.delete(id).subscribe({
        next: () => this.loadUsers(),
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