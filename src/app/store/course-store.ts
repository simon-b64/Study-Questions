import { computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Course, CourseMetadata, CourseProgress } from '../model/questions';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, from, of, pipe, switchMap, tap } from 'rxjs';
import { FirestoreProgressService } from '../services/firestore-progress.service';
import { AuthStore } from './auth-store';
import { ProgressResolutionService } from '../services/progress-resolution.service';
import { LocalStorageProgressService } from '../services/local-storage-progress.service';
import { calculateOverallMetrics } from '../utils/course-progress.utils';

type CourseStore = {
    currentCourseMetadata: CourseMetadata | undefined;
    course: Course | undefined;
    progress: CourseProgress | undefined;
    isLoading: boolean;
    error: string | undefined;
}

const initialState: CourseStore = {
    currentCourseMetadata: undefined,
    course: undefined,
    progress: undefined,
    isLoading: false,
    error: undefined
}

export const CourseStore = signalStore(
    {providedIn: 'root'},
    withState(initialState),
    withComputed((store) => ({
        hasProgress: computed(() => !!store.progress()),
        progressStats: computed(() => {
            const progress = store.progress();
            if (!progress) return null;

            return {
                completion: Math.round(progress.overallCompletionPercentage),
                accuracy: Math.round(progress.overallAccuracy),
                mastered: progress.masteredCount,
                reviewing: progress.reviewingCount,
                learning: progress.learningCount,
                notStarted: progress.notStartedCount,
                total: progress.totalQuestions,
            };
        }),
    })),
    withMethods((
        store,
        http = inject(HttpClient),
        firestoreService = inject(FirestoreProgressService),
        authStore = inject(AuthStore),
        progressResolution = inject(ProgressResolutionService),
        localStorageProgress = inject(LocalStorageProgressService),
    ) => ({
        loadCourse: rxMethod<CourseMetadata>(
            pipe(
                switchMap((metadata) => {
                    patchState(store, {isLoading: true, error: undefined});
                    return http.get<Course>(`/${ metadata.id }.json`).pipe(
                        switchMap((course) => from(progressResolution.resolve(
                            course,
                            metadata,
                            authStore.user(),
                        ))),
                        tap(([course, progress]) => patchState(store, {
                            course,
                            currentCourseMetadata: metadata,
                            progress,
                            isLoading: false,
                            error: undefined,
                        })),
                        catchError((error: unknown) => {
                            patchState(store, {
                                error: `Failed to load course: ${ error instanceof Error ? error.message : String(error) }`,
                                isLoading: false,
                                course: undefined,
                                currentCourseMetadata: undefined,
                                progress: undefined,
                            });
                            return of(null);
                        })
                    );
                })
            )
        ),
        updateProgress: async (updatedProgress: CourseProgress) => {
            const recalculated = calculateOverallMetrics(updatedProgress);
            patchState(store, {progress: recalculated});
            localStorageProgress.save(recalculated);
            const user = authStore.user();
            if (user && firestoreService.isAvailable) {
                firestoreService.saveProgress(user.uid, recalculated).catch(err =>
                    console.warn('Failed to sync progress to Firestore:', err)
                );
            }
        },
        clearProgress: async (courseId: string) => {
            localStorageProgress.clear(courseId);
            const user = authStore.user();
            if (user && firestoreService.isAvailable) {
                await firestoreService.clearProgress(user.uid, courseId);
            }
            const currentCourse = store.currentCourseMetadata();
            if (currentCourse?.id === courseId) {
                patchState(store, {progress: undefined});
            }
        },
        reset: async () => {
            const currentCourse = store.currentCourseMetadata();
            if (currentCourse?.id) {
                localStorageProgress.clear(currentCourse.id);
                const user = authStore.user();
                if (user && firestoreService.isAvailable) {
                    await firestoreService.clearProgress(user.uid, currentCourse.id);
                }
            }
            patchState(store, initialState);
        },
    }))
)
