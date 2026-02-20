import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Admindashboard } from './admindashboard/admindashboard';
import { SupervisionForm } from './supervision-form/supervision-form';
import { DashboardHome } from './dashboard-home/dashboard-home';
import { UsersComponent } from './users/users';
import { HistoryComponent } from './history/history';
import { UserDashboard } from './user-dashboard/user-dashboard'; // Import UserDashboard

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
        path: 'user-dashboard', // Add route for user dashboard
        component: UserDashboard
    },
    {
        path: 'admin',
        component: Admindashboard,
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            { path: 'dashboard', component: DashboardHome },
            { path: 'users', component: UsersComponent },
            { path: 'history', component: HistoryComponent },
            { path: 'supervision-form', component: SupervisionForm }
        ]
    }
];
