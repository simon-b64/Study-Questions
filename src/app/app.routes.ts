import { Routes } from '@angular/router';
import { HomeView } from './view/home/home';
import { CourseOverviewView } from './view/course-overview/course-overview';

export const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        component: HomeView
    },
    {
        path: 'course/:courseId',
        component: CourseOverviewView
    },
    {
        path: '**',
        redirectTo: ''
    }
];
