import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard'; // Import AuthGuard

export const routes: Routes = [
    {
        path: '',
        redirectTo: '/login', // Redirect to login by default
        pathMatch: 'full'
    },
    {
        path: 'login',
        loadComponent: () => import('./login/login').then(m => m.Login)
    },
    {
        path: 'admin',
        loadComponent: () => import('./admindashboard/admindashboard').then(m => m.Admindashboard),
        canActivate: [authGuard], // Protect this route and its children
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            { path: 'dashboard', loadComponent: () => import('./dashboard-home/dashboard-home').then(m => m.DashboardHome) },
            { path: 'users', loadComponent: () => import('./users/users').then(m => m.UsersComponent) }, // Ideally protect this with RoleGuard
            { path: 'teachers', loadComponent: () => import('./teachers/teachers').then(m => m.TeachersComponent) },
            { path: 'ues', loadComponent: () => import('./ues/ues').then(m => m.UesComponent) },
            { path: 'plannings', loadComponent: () => import('./plannings/plannings').then(m => m.Plannings) },
            { path: 'formations', loadComponent: () => import('./formations/formations').then(m => m.Formations) },
            { path: 'history', loadComponent: () => import('./history/history').then(m => m.HistoryComponent) },
            { path: 'my-history', loadComponent: () => import('./user-history/user-history').then(m => m.UserHistoryComponent) },
            { path: 'supervision-form', loadComponent: () => import('./supervision-form/supervision-form').then(m => m.SupervisionForm) },
            { path: 'async-supervision', loadComponent: () => import('./async-supervision-form/async-supervision-form').then(m => m.AsyncSupervisionForm) }
        ]
    },
    // Redirect old user-dashboard to admin dashboard for unified layout
    {
        path: 'user-dashboard',
        redirectTo: '/admin/dashboard',
        pathMatch: 'full'
    }
];


