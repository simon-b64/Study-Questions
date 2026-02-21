import { Injectable } from '@angular/core';
import { CourseProgress, QuestionGroupProgress, QuestionProgress } from '../model/questions';

const STORAGE_KEY_PREFIX = 'study-questions-progress-';

@Injectable({ providedIn: 'root' })
export class LocalStorageProgressService {

    save(progress: CourseProgress): void {
        try {
            localStorage.setItem(
                `${ STORAGE_KEY_PREFIX }${ progress.courseId }`,
                JSON.stringify(progress),
            );
        } catch (error) {
            console.error('Failed to save progress to localStorage:', error);
        }
    }

    load(courseId: string): CourseProgress | null {
        try {
            const serialized = localStorage.getItem(`${ STORAGE_KEY_PREFIX }${ courseId }`);
            if (!serialized) return null;

            const progress = JSON.parse(serialized);

            if (progress.createdAt) progress.createdAt = new Date(progress.createdAt);
            if (progress.lastActivityAt) progress.lastActivityAt = new Date(progress.lastActivityAt);

            progress.groupsProgress?.forEach((group: QuestionGroupProgress) => {
                if (group.startedAt) group.startedAt = new Date(group.startedAt as unknown as string);
                if (group.lastActivityAt) group.lastActivityAt = new Date(group.lastActivityAt as unknown as string);

                group.questionsProgress?.forEach((question: QuestionProgress) => {
                    if (question.lastAttemptedAt) question.lastAttemptedAt = new Date(question.lastAttemptedAt as unknown as string);
                    if (question.firstCorrectAt) question.firstCorrectAt = new Date(question.firstCorrectAt as unknown as string);
                    if (question.masteredAt) question.masteredAt = new Date(question.masteredAt as unknown as string);
                });
            });

            return progress as CourseProgress;
        } catch (error) {
            console.error('Failed to load progress from localStorage:', error);
            return null;
        }
    }

    clear(courseId: string): void {
        try {
            localStorage.removeItem(`${ STORAGE_KEY_PREFIX }${ courseId }`);
        } catch (error) {
            console.error('Failed to clear progress from localStorage:', error);
        }
    }
}

