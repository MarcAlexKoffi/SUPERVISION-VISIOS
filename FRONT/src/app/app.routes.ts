import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Admindashboard } from './admindashboard/admindashboard';
import { SupervisionForm } from './supervision-form/supervision-form';
import { DashboardHome } from './dashboard-home/dashboard-home';
import { UsersComponent } from './users/users';
import { HistoryComponent } from './history/history';
import { UserHistoryComponent } from './user-history/user-history';
import { TeachersComponent } from './teachers/teachers';
import { UesComponent } from './ues/ues';
import { UserDashboard } from './user-dashboard/user-dashboard'; // Import UserDashboard
import { Plannings } from './plannings/plannings';
import { Formations } from './formations/formations';
import { authGuard } from './guards/auth.guard'; // Import AuthGuard

export const routes: Routes = [
    {
        path: '',
        redirectTo: '/login', // Redirect to login by default
        pathMatch: 'full'
    },
    {
        path: 'login',
        component: Login
    },
    {
        path: 'admin',
        component: Admindashboard,
        canActivate: [authGuard], // Protect this route and its children
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            { path: 'dashboard', component: DashboardHome },
            { path: 'users', component: UsersComponent }, // Ideally protect this with RoleGuard
            { path: 'teachers', component: TeachersComponent },
            { path: 'ues', component: UesComponent },
            { path: 'plannings', component: Plannings },
            { path: 'formations', component: Formations },
            { path: 'history', component: HistoryComponent },
            { path: 'my-history', component: UserHistoryComponent },
            { path: 'supervision-form', component: SupervisionForm }
        ]
    },
    // Redirect old user-dashboard to admin dashboard for unified layout
    {
        path: 'user-dashboard',
        redirectTo: '/admin/dashboard',
        pathMatch: 'full'
    }
];


