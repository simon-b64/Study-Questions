import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CourseStore } from '../../store/course-store';
import { CourseMetadata } from '../../model/questions';

@Component({
    selector: 'app-course-overview',
    imports: [RouterLink],
    templateUrl: './course-overview.html',
    styleUrl: './course-overview.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseOverviewView implements OnInit {
    private readonly route = inject(ActivatedRoute);
    protected readonly router = inject(Router);
    protected readonly courseStore = inject(CourseStore);

    ngOnInit(): void {
        const courseId = this.route.snapshot.paramMap.get('courseId');

        if (!courseId) {
            this.router.navigate(['/']);
            return;
        }

        // Create course metadata from the route parameter
        const courseMetadata: CourseMetadata = {
            id: courseId,
            name: this.getCourseName(courseId)
        };

        // Load the course data
        this.courseStore.loadCourse(courseMetadata);
    }

    private getCourseName(courseId: string): string {
        // Map course IDs to their display names
        const courseNames: Record<string, string> = {
            'daten-informatikrecht': 'Daten und Informatikrecht'
        };
        return courseNames[courseId] || courseId;
    }
}






