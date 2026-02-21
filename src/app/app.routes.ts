import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./view/home/home').then(m => m.HomeView),
    },
    {
        path: 'course/:courseId',
        loadComponent: () => import('./view/course-overview/course-overview').then(m => m.CourseOverviewView),
    },
    {
        path: 'course/:courseId/questions',
        loadComponent: () => import('./view/question-view/question-view').then(m => m.QuestionView),
    },
    {
        path: 'course/:courseId/questions/:groupName',
        loadComponent: () => import('./view/question-view/question-view').then(m => m.QuestionView),
    },
    {
        path: '**',
        loadComponent: () => import('./view/not-found/not-found').then(m => m.NotFoundView),
    },
];
