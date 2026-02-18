import { Routes } from '@angular/router';
import { HomeView } from './view/home/home';

export const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        component: HomeView
    },
    {
        path: '**',
        redirectTo: ''
    }
];
