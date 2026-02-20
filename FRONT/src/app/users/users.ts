import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

  newUser = {
    name: '',
    email: '',
    role: '',
    password: '',
    status: true // true for Active, false for Inactive
  };

  users = [
    {
      id: '#89201',
      name: 'Jean Dupont',
      email: 'jean.d@udmci.edu',
      role: 'Admin',
      status: 'Actif',
      avatar: 'https://ui-avatars.com/api/?name=Jean+Dupont&background=1e293b&color=fff'
    },
    {
      id: '#89205',
      name: 'Marie Curie',
      email: 'm.curie@udmci.edu',
      role: 'Enseignant',
      status: 'Actif',
      avatar: 'https://ui-avatars.com/api/?name=Marie+Curie&background=e0e7ff&color=4338ca'
    },
    {
      id: '#89210',
      name: 'Albert Einstein',
      email: 'a.einstein@udmci.edu',
      role: 'Superviseur',
      status: 'Inactif',
      avatar: 'https://ui-avatars.com/api/?name=Albert+Einstein&background=7c3aed&color=fff'
    },
    {
      id: '#89212',
      name: 'Niels Bohr',
      email: 'n.bohr@udmci.edu',
      role: 'Enseignant',
      status: 'Actif',
      avatar: 'https://ui-avatars.com/api/?name=Niels+Bohr&background=fce7f3&color=db2777'
    },
    {
      id: '#89215',
      name: 'Sarah Connor',
      email: 's.connor@udmci.edu',
      role: 'Superviseur',
      status: 'Actif',
      avatar: 'https://ui-avatars.com/api/?name=Sarah+Connor&background=0e7490&color=fff'
    }
  ];

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'Admin':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'Enseignant':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'Superviseur':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
    }
  }

  openModal() {
    this.isModalOpen = true;
    this.showPassword = false;
    // Reset form
    this.newUser = {
      name: '',
      email: '',
      role: '',
      password: '',
      status: true
    };
  }

  togglePassword() {
      this.showPassword = !this.showPassword;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  ngOnInit() {
    const storedUsers = localStorage.getItem('users');
    if (storedUsers) {
      this.users = JSON.parse(storedUsers);
    }
  }

  saveUser() {
    // Validate form (basic validation)
    if (!this.newUser.name || !this.newUser.email || !this.newUser.role) {
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    // Add new user to the list
    const newId = `#${Math.floor(Math.random() * 10000) + 89000}`;
    const initials = this.newUser.name.split(' ').map(n => n[0]).join('+');
    
    this.users.unshift({
      id: newId,
      name: this.newUser.name,
      email: this.newUser.email,
      role: this.newUser.role,
      status: this.newUser.status ? 'Actif' : 'Inactif',
      avatar: `https://ui-avatars.com/api/?name=${initials}&background=random&color=fff`
    });

    localStorage.setItem('users', JSON.stringify(this.users));
    this.closeModal();
  }
}
