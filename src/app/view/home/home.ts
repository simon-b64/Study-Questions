import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CourseMetadata } from '../../model/questions';

@Component({
    selector: 'app-home',
    imports: [],
    templateUrl: './home.html',
    styleUrl: './home.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeView {
    private readonly router = inject(Router);

    protected readonly courses = signal<CourseMetadata[]>([
        {
            id: 'daten-informatikrecht',
            name: 'Daten und Informatikrecht',
            description: 'Rechtliche Grundlagen im Bereich Daten und Informatik'
        }
    ]);

    protected navigateToCourse(courseId: string): void {
        this.router.navigate(['/course', courseId]);
    }
}



