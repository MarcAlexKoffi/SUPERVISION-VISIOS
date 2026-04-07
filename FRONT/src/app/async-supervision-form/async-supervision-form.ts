import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AsyncSupervisionService } from '../services/async-supervision.service';
import { UeService } from '../services/ue.service';
import { TeacherService } from '../services/teacher.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-async-supervision-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './async-supervision-form.html',
  styleUrl: './async-supervision-form.scss',
})
export class AsyncSupervisionForm implements OnInit, OnDestroy {
  isSaving = false;
  
  showSuccessModal = false;
  showErrorModal = false;
  errorMessage = '';

  ues: any[] = [];
  teachers: any[] = [];
  
  startDate: string = '';
  endDate: string = '';

  formData = {
    teacherId: null as string | number | null,
    ueId: null as string | number | null,
    week: '',
    status: '', // Fait, Partiel, Non fait
    observations: ''
  };

  statusOptions = [
    { label: 'Réalisé', value: 'Fait', textClass: 'text-green-600', bgClass: 'bg-green-100', dotClass: 'bg-green-500' },
    { label: 'Partiellement réalisé', value: 'Partiel', textClass: 'text-yellow-600', bgClass: 'bg-yellow-100', dotClass: 'bg-yellow-500' },
    { label: 'Non réalisé', value: 'Non fait', textClass: 'text-red-600', bgClass: 'bg-red-100', dotClass: 'bg-red-500' }
  ];

  constructor(
    private asyncSupervisionService: AsyncSupervisionService,
    private ueService: UeService,
    private teacherService: TeacherService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadUEs();
    this.loadTeachers();
    this.setDefaultWeek();
  }

  ngOnDestroy() {
    
  }

  setDefaultWeek() {
    // Keep it empty or set some default string dates like 'YYYY-MM-DD' if desired
  }

  updateWeekString() {
    if (this.startDate && this.endDate) {
      const startParts = this.startDate.split('-');
      const endParts = this.endDate.split('-');
      const startFormatted = startParts[2] + '/' + startParts[1] + '/' + startParts[0];
      const endFormatted = endParts[2] + '/' + endParts[1] + '/' + endParts[0];
      this.formData.week = this.formData.week = 'Semaine du ' + startFormatted + ' au ' + endFormatted;
    } else {
      this.formData.week = '';
    }
  }

  loadUEs() {
    this.ueService.getAll().subscribe({
      next: (data: any[]) => {
        this.ues = data;
      },
      error: (err: any) => {
        console.error('Erreur chargement UEs', err);
      }
    });
  }

  loadTeachers() {
    this.teacherService.getAll().subscribe({
      next: (data: any[]) => {
        this.teachers = data;
      },
      error: (err: any) => {
        console.error('Erreur chargement Enseignants', err);
      }
    });
  }

  onSubmit() {
    if (!this.formData.teacherId || !this.formData.ueId || !this.formData.week || !this.formData.status) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires.';
      this.showErrorModal = true;
      return;
    }

    this.isSaving = true;

    this.asyncSupervisionService.create(this.formData).subscribe({
      next: () => {
        this.isSaving = false;
        this.showSuccessModal = true;
      },
      error: (err) => {
        console.error('Erreur save', err);
        this.isSaving = false;
        this.errorMessage = 'Erreur lors de l\'enregistrement. Réessayez.';
        this.showErrorModal = true;
      }
    });
  }

  resetForm() {
    this.formData = {
      teacherId: null,
      ueId: null,
      week: '',
      status: '',
      observations: ''
    };
    this.setDefaultWeek();
  }

  goBack() {
    this.router.navigate(['/']);
  }
}


