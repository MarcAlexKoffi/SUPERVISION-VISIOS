import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Admindashboard } from './admindashboard/admindashboard';
import { SupervisionForm } from './supervision-form/supervision-form';
import { DashboardHome } from './dashboard-home/dashboard-home';
import { Users } from './users/users';
import { History } from './history/history';

export const routes: Routes = [
    {
        path: '',
        redirectTo: '/login',
        pathMatch: 'full'
    },
    {
        path: 'login',
        component: Login
    },
    {
        path: 'admin',
        component: Admindashboard,
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            { path: 'dashboard', component: DashboardHome },
            { path: 'users', component: Users },
            { path: 'history', component: History },
            { path: 'supervision-form', component: SupervisionForm }
        ]
    }
];
