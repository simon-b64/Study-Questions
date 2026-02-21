import { Injectable, inject } from '@angular/core';
import { User } from '@angular/fire/auth';
import { Course, CourseMetadata, CourseProgress } from '../model/questions';
import { FirestoreProgressService } from './firestore-progress.service';
import { SyncConflictService } from './sync-conflict.service';
import { LocalStorageProgressService } from './local-storage-progress.service';
import { initializeCourseProgress, synchronizeProgressWithCourse } from '../utils/course-progress.utils';

@Injectable({ providedIn: 'root' })
export class ProgressResolutionService {
    private readonly firestoreService = inject(FirestoreProgressService);
    private readonly syncConflictService = inject(SyncConflictService);
    private readonly localStorage = inject(LocalStorageProgressService);

    async resolve(
        course: Course,
        metadata: CourseMetadata,
        user: User | null | undefined,
    ): Promise<[Course, CourseProgress]> {
        let localProgress = this.localStorage.load(metadata.id);
        if (localProgress) {
            localProgress = synchronizeProgressWithCourse(localProgress, course);
        }

        if (!user) {
            if (!localProgress) {
                const fresh = initializeCourseProgress(course, metadata);
                this.localStorage.save(fresh);
                return [course, fresh];
            }
            return [course, localProgress];
        }

        let firestoreProgress: CourseProgress | null = null;
        let firestoreAvailable = this.firestoreService.isAvailable;

        if (firestoreAvailable) {
            try {
                // Pass a fresh skeleton so deserializeProgress can map raw Firestore
                // data onto the current course structure and recalculate derived fields.
                const skeleton = initializeCourseProgress(course, metadata);
                firestoreProgress = await this.firestoreService.loadProgress(user.uid, metadata.id, skeleton);
            } catch {
                firestoreAvailable = false;
                console.warn('Firestore unavailable — falling back to localStorage');
            }
        }

        if (!firestoreAvailable) {
            if (!localProgress) {
                const fresh = initializeCourseProgress(course, metadata);
                this.localStorage.save(fresh);
                return [course, fresh];
            }
            return [course, localProgress];
        }

        if (!firestoreProgress && !localProgress) {
            const fresh = initializeCourseProgress(course, metadata);
            this.localStorage.save(fresh);
            await this.firestoreService.saveProgress(user.uid, fresh);
            return [course, fresh];
        }

        if (!firestoreProgress) {
            await this.firestoreService.saveProgress(user.uid, localProgress!);
            return [course, localProgress!];
        }

        if (!localProgress) {
            // firestoreProgress already merged & recalculated by deserializeProgress
            this.localStorage.save(firestoreProgress);
            return [course, firestoreProgress];
        }

        const firestoreTime = firestoreProgress.lastActivityAt?.getTime() ?? 0;
        const localTime = localProgress.lastActivityAt?.getTime() ?? 0;

        if (localTime > firestoreTime) {
            await this.firestoreService.saveProgress(user.uid, localProgress);
            return [course, localProgress];
        }

        if (firestoreTime > localTime) {
            const choice = await this.syncConflictService.askUser();
            if (choice === 'cloud') {
                // firestoreProgress already merged & recalculated by deserializeProgress
                this.localStorage.save(firestoreProgress);
                return [course, firestoreProgress];
            } else {
                await this.firestoreService.saveProgress(user.uid, localProgress);
                return [course, localProgress];
            }
        }

        return [course, firestoreProgress];
    }
}
