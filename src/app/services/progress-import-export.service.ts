import { Injectable, inject } from '@angular/core';
import { CourseProgress, QuestionGroupProgress, QuestionProgress } from '../model/questions';
import { ConfirmService } from './confirm.service';

@Injectable({ providedIn: 'root' })
export class ProgressImportExportService {
    private readonly confirmService = inject(ConfirmService);

    download(progress: CourseProgress): void {
        const json = JSON.stringify(progress, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${progress.courseId}-progress-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    async upload(currentCourseId: string): Promise<CourseProgress | null> {
        const raw = await this.readFileAsText();
        if (!raw) return null;

        let progress: unknown;
        try {
            progress = JSON.parse(raw);
        } catch {
            await this.confirmService.confirm({
                title: 'Fehler',
                message: 'Fehler beim Laden der Fortschrittsdatei. Bitte überprüfe, ob die Datei gültig ist.',
                confirmLabel: 'OK',
                cancelLabel: 'OK',
            });
            return null;
        }

        if (!this.isValidProgress(progress)) {
            await this.confirmService.confirm({
                title: 'Ungültige Datei',
                message: 'Ungültige Fortschrittsdatei. Bitte wähle eine gültige JSON-Datei aus.',
                confirmLabel: 'OK',
                cancelLabel: 'OK',
            });
            return null;
        }

        if (progress.courseId !== currentCourseId) {
            const proceed = await this.confirmService.confirm({
                title: 'Anderer Kurs',
                message: `Diese Fortschrittsdatei ist für einen anderen Kurs (${progress.courseId}). Trotzdem laden?`,
                confirmLabel: 'Trotzdem laden',
            });
            if (!proceed) return null;
        }

        return this.deserializeDates(progress);
    }

    private readFileAsText(): Promise<string | null> {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (event: Event) => {
                const file = (event.target as HTMLInputElement).files?.[0];
                if (!file) { resolve(null); return; }
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string ?? null);
                reader.onerror = () => resolve(null);
                reader.readAsText(file);
            };
            input.oncancel = () => resolve(null);
            input.click();
        });
    }

    private isValidProgress(value: unknown): value is CourseProgress {
        if (typeof value !== 'object' || value === null) return false;
        const obj = value as Record<string, unknown>;
        return typeof obj['courseId'] === 'string' && Array.isArray(obj['groupsProgress']);
    }

    private deserializeDates(progress: CourseProgress): CourseProgress {
        return {
            ...progress,
            createdAt: new Date(progress.createdAt),
            lastActivityAt: progress.lastActivityAt ? new Date(progress.lastActivityAt) : undefined,
            groupsProgress: progress.groupsProgress.map((group: QuestionGroupProgress) => ({
                ...group,
                startedAt: group.startedAt ? new Date(group.startedAt) : undefined,
                lastActivityAt: group.lastActivityAt ? new Date(group.lastActivityAt) : undefined,
                questionsProgress: group.questionsProgress.map((q: QuestionProgress) => ({
                    ...q,
                    lastAttemptedAt: q.lastAttemptedAt ? new Date(q.lastAttemptedAt) : undefined,
                    firstCorrectAt: q.firstCorrectAt ? new Date(q.firstCorrectAt) : undefined,
                    masteredAt: q.masteredAt ? new Date(q.masteredAt) : undefined,
                })),
            })),
        };
    }
}


