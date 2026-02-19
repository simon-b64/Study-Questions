import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CourseStore, migrateOldProgress } from '../../store/course-store';
import { CourseMetadata } from '../../model/questions';
import { generateCourseHash } from '../../utils/course-hash.util';

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

    protected resetProgress(): void {
        const courseId = this.route.snapshot.paramMap.get('courseId');
        if (!courseId) return;

        if (confirm('Möchtest du deinen gesamten Lernfortschritt für diesen Kurs wirklich zurücksetzen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
            // Clear progress from localStorage
            this.courseStore.clearProgress(courseId);

            // Reload the course to initialize fresh progress
            const courseMetadata: CourseMetadata = {
                id: courseId,
                name: this.getCourseName(courseId)
            };
            this.courseStore.loadCourse(courseMetadata);
        }
    }

    protected downloadProgress(): void {
        const progress = this.courseStore.progress();
        if (!progress) return;

        // Convert progress to JSON string
        const json = JSON.stringify(progress, null, 2);

        // Create blob and download link
        const blob = new Blob([json], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Generate filename with course name and timestamp
        const timestamp = new Date().toISOString().split('T')[0];
        link.download = `${progress.courseId}-progress-${timestamp}.json`;

        // Trigger download
        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    protected uploadProgress(): void {
        // Create file input element
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = (event: Event) => {
            const target = event.target as HTMLInputElement;
            const file = target.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target?.result as string;
                    let progress = JSON.parse(content);

                    // Validate that it's a valid progress object
                    if (!progress.courseId || !progress.groupsProgress) {
                        alert('Ungültige Fortschrittsdatei. Bitte wähle eine gültige JSON-Datei aus.');
                        return;
                    }

                    // Check if it matches the current course
                    const currentCourseId = this.route.snapshot.paramMap.get('courseId');
                    if (progress.courseId !== currentCourseId) {
                        if (!confirm(`Diese Fortschrittsdatei ist für einen anderen Kurs (${progress.courseId}). Trotzdem laden?`)) {
                            return;
                        }
                    }

                    // Validate hash if present
                    const currentCourse = this.courseStore.course();
                    if (currentCourse) {
                        // Migrate old progress if needed
                        progress = migrateOldProgress(progress, currentCourse);

                        if (progress.courseDataHash) {
                            // Generate current course hash
                            const currentHash = generateCourseHash(currentCourse);

                            if (progress.courseDataHash !== currentHash) {
                                const proceed = confirm(
                                    '⚠️ Warnung: Kurs-Version stimmt nicht überein!\n\n' +
                                    'Die importierte Fortschrittsdatei wurde für eine andere Version dieses Kurses erstellt. ' +
                                    'Die Fragen könnten sich geändert haben.\n\n' +
                                    'Möchtest du den Fortschritt trotzdem importieren?\n' +
                                    '(Der Fortschritt wird automatisch angepasst, aber es können Unstimmigkeiten auftreten)'
                                );

                                if (!proceed) {
                                    return;
                                }

                                // Update hash to current version
                                progress.courseDataHash = currentHash;
                            }
                        } else {
                            // Old progress file without hash, add it
                            progress.courseDataHash = generateCourseHash(currentCourse);
                        }
                    }

                    // Convert date strings back to Date objects
                    if (progress.createdAt) progress.createdAt = new Date(progress.createdAt);
                    if (progress.lastActivityAt) progress.lastActivityAt = new Date(progress.lastActivityAt);

                    progress.groupsProgress?.forEach((group: any) => {
                        if (group.startedAt) group.startedAt = new Date(group.startedAt);
                        if (group.lastActivityAt) group.lastActivityAt = new Date(group.lastActivityAt);

                        group.questionsProgress?.forEach((question: any) => {
                            if (question.lastAttemptedAt) question.lastAttemptedAt = new Date(question.lastAttemptedAt);
                            if (question.firstCorrectAt) question.firstCorrectAt = new Date(question.firstCorrectAt);
                            if (question.masteredAt) question.masteredAt = new Date(question.masteredAt);
                        });
                    });

                    // Update progress in store (this will also save to localStorage)
                    this.courseStore.updateProgress(progress);

                    alert('Fortschritt erfolgreich importiert!');
                } catch (error) {
                    console.error('Failed to parse progress file:', error);
                    alert('Fehler beim Laden der Fortschrittsdatei. Bitte überprüfe, ob die Datei gültig ist.');
                }
            };

            reader.readAsText(file);
        };

        // Trigger file selection
        input.click();
    }
}






