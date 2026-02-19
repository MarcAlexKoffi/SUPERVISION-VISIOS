import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.scss',
})
export class DashboardHome {
  stats = [
    { label: 'Total UE Actives', value: '24', icon: 'library_books', color: 'bg-blue-50 text-blue-600' },
    { label: 'Étudiants Inscrits', value: '1,450', icon: 'groups', color: 'bg-green-50 text-green-600' },
    { label: 'Sessions en Cours', value: '8', icon: 'videocam', color: 'bg-purple-50 text-purple-600' }
  ];

  ues = [
    { code: 'INF101', name: 'Introduction à l\'Algorithmique', responsible: 'Dr. K. Sow', dept: 'Informatique', deptColor: 'bg-blue-50 text-blue-700', students: 120, modules: 4 },
    { code: 'MAT200', name: 'Statistiques Appliquées', responsible: 'Prof. A. Benali', dept: 'Sciences', deptColor: 'bg-purple-50 text-purple-700', students: 85, modules: 3 },
    { code: 'ECO305', name: 'Microéconomie Avancée', responsible: 'Dr. S. Diallo', dept: 'Gestion', deptColor: 'bg-orange-50 text-orange-700', students: 45, modules: 2 },
    { code: 'DR0102', name: 'Droit Constitutionnel', responsible: 'Me. J. Dupont', dept: 'Droit', deptColor: 'bg-red-50 text-red-700', students: 210, modules: 5 },
    { code: 'LANG400', name: 'Anglais des Affaires', responsible: 'Mrs. T. Baker', dept: 'Langues', deptColor: 'bg-yellow-50 text-yellow-700', students: 30, modules: 2 },
  ];
}
