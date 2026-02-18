import { Routes } from '@angular/router';
import { HomeView } from './view/home/home';
import { CourseOverviewView } from './view/course-overview/course-overview';
import { QuestionView } from './view/question-view/question-view';

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
        path: 'course/:courseId/questions',
        component: QuestionView
    },
    {
        path: 'course/:courseId/questions/:groupName',
        component: QuestionView
    },
    {
        path: '**',
        redirectTo: ''
    }
];
