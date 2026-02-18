import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CourseStore } from '../../store/course-store';
import { CourseMetadata } from '../../model/questions';

@Component({
    selector: 'app-course-overview',
    imports: [RouterLink, CommonModule],
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

        // Only load course if it's not already loaded or if it's a different course
        const currentCourse = this.courseStore.currentCourseMetadata();
        if (!currentCourse || currentCourse.id !== courseId) {
            // Create course metadata from the route parameter
            const courseMetadata: CourseMetadata = {
                id: courseId,
                name: this.getCourseName(courseId)
            };

            // Load the course data
            this.courseStore.loadCourse(courseMetadata);
        }
    }

    private getCourseName(courseId: string): string {
        // Map course IDs to their display names
        const courseNames: Record<string, string> = {
            'daten-informatikrecht': 'Daten und Informatikrecht'
        };
        return courseNames[courseId] || courseId;
    }

    protected startQuestions(groupName?: string): void {
        const courseId = this.route.snapshot.paramMap.get('courseId');
        if (!courseId) return;

        if (groupName) {
            // Navigate to questions for specific group
            this.router.navigate(['/course', courseId, 'questions', groupName]);
        } else {
            // Navigate to all questions
            this.router.navigate(['/course', courseId, 'questions']);
        }
    }
}






