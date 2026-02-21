import { Component, ChangeDetectionStrategy, inject, OnInit, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { CourseStore } from '../../store/course-store';
import { getCourseName } from '../../utils/course-name.util';
import { AuthStore } from '../../store/auth-store';
import { ConfirmService } from '../../services/confirm.service';
import { ProgressImportExportService } from '../../services/progress-import-export.service';
import { setupAuthAwareCourseLoad } from '../../utils/auth-aware-course-load.util';
import { signal } from '@angular/core';

@Component({
    selector: 'app-course-overview',
    imports: [RouterLink, NgbDropdownModule],
    templateUrl: './course-overview.html',
    styleUrl: './course-overview.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseOverviewView implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly courseStore = inject(CourseStore);
    private readonly confirmService = inject(ConfirmService);
    private readonly importExport = inject(ProgressImportExportService);

    private readonly pendingMetadata = setupAuthAwareCourseLoad(
        this.courseStore,
        inject(AuthStore),
    );

    protected readonly quickSessionLimit = signal<number>(20);

    protected readonly isLoading = this.courseStore.isLoading;
    protected readonly error = this.courseStore.error;
    protected readonly course = this.courseStore.course;
    protected readonly progress = this.courseStore.progress;
    protected readonly courseName = computed(() => this.courseStore.currentCourseMetadata()?.name);
    protected readonly progressStats = this.courseStore.progressStats;

    ngOnInit(): void {
        const courseId = this.route.snapshot.paramMap.get('courseId');

        if (!courseId) {
            this.router.navigate(['/']);
            return;
        }

        this.pendingMetadata.set({
            id: courseId,
            name: getCourseName(courseId),
        });
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

    protected startQuickSession(): void {
        const courseId = this.route.snapshot.paramMap.get('courseId');
        if (!courseId) return;

        // Navigate to all questions with limit query parameter
        this.router.navigate(['/course', courseId, 'questions'], {
            queryParams: { limit: this.quickSessionLimit() }
        });
    }

    protected setQuickSessionLimit(limit: number): void {
        this.quickSessionLimit.set(limit);
    }

    protected async resetProgress(): Promise<void> {
        const courseId = this.route.snapshot.paramMap.get('courseId');
        if (!courseId) return;

        const confirmed = await this.confirmService.confirm({
            title: 'Fortschritt zurücksetzen',
            message: 'Möchtest du deinen gesamten Lernfortschritt für diesen Kurs wirklich zurücksetzen? Diese Aktion kann nicht rückgängig gemacht werden.',
            confirmLabel: 'Zurücksetzen',
            confirmClass: 'btn-danger',
        });

        if (!confirmed) return;

        this.courseStore.clearProgress(courseId);
        this.courseStore.loadCourse({ id: courseId, name: getCourseName(courseId) });
    }

    protected downloadProgress(): void {
        const progress = this.courseStore.progress();
        if (!progress) return;

        this.importExport.download(progress);
    }

    protected async uploadProgress(): Promise<void> {
        const courseId = this.route.snapshot.paramMap.get('courseId');
        if (!courseId) return;

        const progress = await this.importExport.upload(courseId);
        if (progress) await this.courseStore.updateProgress(progress);
    }

    protected navigateHome(): void {
        this.router.navigate(['/']);
    }
}
