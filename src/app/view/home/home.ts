import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CourseMetadata } from '../../model/questions';
import { COURSE_NAMES } from '../../utils/course-name.util';

@Component({
    selector: 'app-home',
    imports: [],
    templateUrl: './home.html',
    styleUrl: './home.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeView {
    private readonly router = inject(Router);

    protected readonly courses: readonly CourseMetadata[] = Object.entries(COURSE_NAMES).map(
        ([id, name]) => ({ id, name })
    );

    protected navigateToCourse(courseId: string): void {
        this.router.navigate(['/course', courseId]);
    }
}

