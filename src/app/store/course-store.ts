import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Course, CourseMetadata, CourseProgress, QuestionGroupProgress, QuestionProgress, MasteryLevel } from '../model/questions';
import { signalStore, withState, withMethods, patchState, withComputed } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, catchError, of } from 'rxjs';
import { computed } from '@angular/core';
import { generateCourseHash } from '../utils/course-hash.util';

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

// Local Storage Keys
const STORAGE_KEY_PREFIX = 'study-questions-progress-';


// Local Storage Utilities
function saveProgressToLocalStorage(progress: CourseProgress): void {
    try {
        const key = `${STORAGE_KEY_PREFIX}${progress.courseId}`;
        const serialized = JSON.stringify(progress);
        localStorage.setItem(key, serialized);
    } catch (error) {
        console.error('Failed to save progress to localStorage:', error);
    }
}

function loadProgressFromLocalStorage(courseId: string): CourseProgress | null {
    try {
        const key = `${STORAGE_KEY_PREFIX}${courseId}`;
        const serialized = localStorage.getItem(key);
        if (!serialized) return null;

        const progress = JSON.parse(serialized);

        // Convert date strings back to Date objects
        if (progress.createdAt) progress.createdAt = new Date(progress.createdAt);
        if (progress.lastActivityAt) progress.lastActivityAt = new Date(progress.lastActivityAt);

        progress.groupsProgress?.forEach((group: QuestionGroupProgress) => {
            if (group.startedAt) group.startedAt = new Date(group.startedAt);
            if (group.lastActivityAt) group.lastActivityAt = new Date(group.lastActivityAt);

            group.questionsProgress?.forEach((question: QuestionProgress) => {
                if (question.lastAttemptedAt) question.lastAttemptedAt = new Date(question.lastAttemptedAt);
                if (question.firstCorrectAt) question.firstCorrectAt = new Date(question.firstCorrectAt);
                if (question.masteredAt) question.masteredAt = new Date(question.masteredAt);
            });
        });

        return progress;
    } catch (error) {
        console.error('Failed to load progress from localStorage:', error);
        return null;
    }
}

function clearProgressFromLocalStorage(courseId: string): void {
    try {
        const key = `${STORAGE_KEY_PREFIX}${courseId}`;
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Failed to clear progress from localStorage:', error);
    }
}

function initializeCourseProgress(course: Course, metadata: CourseMetadata): CourseProgress {
    const groupsProgress: QuestionGroupProgress[] = course.questionGroups.map(group => {
        const questionsProgress: QuestionProgress[] = group.question.map((_, index) => ({
            questionIndex: index,
            totalAttempts: 0,
            correctAttempts: 0,
            incorrectAttempts: 0,
            consecutiveCorrect: 0,
            consecutiveIncorrect: 0,
            masteryLevel: MasteryLevel.NOT_STARTED,
            hintUsedCount: 0,
        }));

        return {
            groupName: group.name,
            totalQuestions: group.question.length,
            questionsProgress,
            notStartedCount: group.question.length,
            learningCount: 0,
            reviewingCount: 0,
            masteredCount: 0,
            completionPercentage: 0,
            averageAccuracy: 0,
        };
    });

    const totalQuestions = course.questionGroups.reduce((sum, group) => sum + group.question.length, 0);

    return {
        courseId: metadata.id,
        courseName: metadata.name,
        courseDataHash: generateCourseHash(course),
        totalQuestions,
        totalQuestionGroups: course.questionGroups.length,
        groupsProgress,
        createdAt: new Date(),
        overallCompletionPercentage: 0,
        overallAccuracy: 0,
        totalStudyTime: 0,
        notStartedCount: totalQuestions,
        learningCount: 0,
        reviewingCount: 0,
        masteredCount: 0,
        currentStreak: 0,
        longestStreak: 0,
    };
}

function calculateGroupMetrics(groupProgress: QuestionGroupProgress): QuestionGroupProgress {
    const notStarted = groupProgress.questionsProgress.filter(q => q.masteryLevel === MasteryLevel.NOT_STARTED).length;
    const learning = groupProgress.questionsProgress.filter(q => q.masteryLevel === MasteryLevel.LEARNING).length;
    const reviewing = groupProgress.questionsProgress.filter(q => q.masteryLevel === MasteryLevel.REVIEWING).length;
    const mastered = groupProgress.questionsProgress.filter(q => q.masteryLevel === MasteryLevel.MASTERED).length;

    const totalAttempts = groupProgress.questionsProgress.reduce((sum, q) => sum + q.totalAttempts, 0);
    const totalCorrect = groupProgress.questionsProgress.reduce((sum, q) => sum + q.correctAttempts, 0);
    const accuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;

    return {
        ...groupProgress,
        notStartedCount: notStarted,
        learningCount: learning,
        reviewingCount: reviewing,
        masteredCount: mastered,
        completionPercentage: (mastered / groupProgress.totalQuestions) * 100,
        averageAccuracy: accuracy,
    };
}

function calculateOverallMetrics(progress: CourseProgress): CourseProgress {
    // Recalculate all group metrics first
    const updatedGroups = progress.groupsProgress.map(calculateGroupMetrics);

    const notStarted = updatedGroups.reduce((sum, g) => sum + g.notStartedCount, 0);
    const learning = updatedGroups.reduce((sum, g) => sum + g.learningCount, 0);
    const reviewing = updatedGroups.reduce((sum, g) => sum + g.reviewingCount, 0);
    const mastered = updatedGroups.reduce((sum, g) => sum + g.masteredCount, 0);

    const allQuestions = updatedGroups.flatMap(g => g.questionsProgress);
    const totalAttempts = allQuestions.reduce((sum, q) => sum + q.totalAttempts, 0);
    const totalCorrect = allQuestions.reduce((sum, q) => sum + q.correctAttempts, 0);
    const overallAccuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;

    return {
        ...progress,
        groupsProgress: updatedGroups,
        notStartedCount: notStarted,
        learningCount: learning,
        reviewingCount: reviewing,
        masteredCount: mastered,
        overallCompletionPercentage: (mastered / progress.totalQuestions) * 100,
        overallAccuracy,
    };
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
    withMethods((store, http = inject(HttpClient)) => ({
        loadCourse: rxMethod<CourseMetadata>(
            pipe(
                tap(() => {
                    patchState(store, {
                        isLoading: true,
                        error: undefined,
                    });
                }),
                switchMap((metadata) =>
                    http.get<Course>(`/${metadata.id}.json`).pipe(
                        tap((course) => {
                            // Generate hash for current course data
                            const currentHash = generateCourseHash(course);

                            // Try to load progress from localStorage first
                            let progress = loadProgressFromLocalStorage(metadata.id);

                            // Validate hash if progress exists
                            if (progress) {
                                if (!progress.courseDataHash) {
                                    // Old progress without hash - update it
                                    console.warn('Progress loaded without hash, updating...');
                                    progress.courseDataHash = currentHash;
                                    saveProgressToLocalStorage(progress);
                                } else if (progress.courseDataHash !== currentHash) {
                                    // Hash mismatch - course has changed
                                    const proceed = confirm(
                                        '⚠️ Warnung: Die Kursdaten haben sich geändert!\n\n' +
                                        'Dein gespeicherter Fortschritt passt nicht zur aktuellen Version des Kurses. ' +
                                        'Dies kann passieren, wenn Fragen hinzugefügt, entfernt oder geändert wurden.\n\n' +
                                        'Möchtest du trotzdem deinen alten Fortschritt laden?\n' +
                                        '(Empfohlen: "Abbrechen" um mit leerem Fortschritt zu beginnen)'
                                    );

                                    if (!proceed) {
                                        // User chose to start fresh
                                        console.log('User chose to reset progress due to course changes');
                                        clearProgressFromLocalStorage(metadata.id);
                                        progress = null;
                                    } else {
                                        // User chose to keep old progress, update hash
                                        console.warn('User chose to keep outdated progress');
                                        progress.courseDataHash = currentHash;
                                        saveProgressToLocalStorage(progress);
                                    }
                                }
                            }

                            // If not in localStorage, check if we have it in the store
                            if (!progress) {
                                const existingProgress = store.progress();
                                const isSameCourse = existingProgress?.courseId === metadata.id;
                                if (isSameCourse && existingProgress) {
                                    // Validate hash for store progress too
                                    if (existingProgress.courseDataHash !== currentHash) {
                                        console.warn('Store progress hash mismatch, resetting');
                                        progress = null;
                                    } else {
                                        progress = existingProgress;
                                    }
                                }
                            }

                            // If still no progress, initialize new
                            if (!progress) {
                                progress = initializeCourseProgress(course, metadata);
                                // Save the newly initialized progress to localStorage
                                saveProgressToLocalStorage(progress);
                            }

                            patchState(store, {
                                course,
                                currentCourseMetadata: metadata,
                                progress,
                                isLoading: false,
                                error: undefined
                            });
                        }),
                        catchError((error) => {
                            patchState(store, {
                                error: `Failed to load course: ${error.message}`,
                                isLoading: false,
                                course: undefined,
                                currentCourseMetadata: undefined,
                                progress: undefined,
                            });
                            return of(null);
                        })
                    )
                )
            )
        ),
        updateProgress: (updatedProgress: CourseProgress) => {
            const recalculated = calculateOverallMetrics(updatedProgress);
            patchState(store, { progress: recalculated });
            // Save to localStorage
            saveProgressToLocalStorage(recalculated);
        },
        clearProgress: (courseId: string) => {
            // Clear progress from localStorage
            clearProgressFromLocalStorage(courseId);
            // If this is the current course, reset the store
            const currentCourse = store.currentCourseMetadata();
            if (currentCourse?.id === courseId) {
                patchState(store, { progress: undefined });
            }
        },
        reset: () => {
            // Clear localStorage for current course if any
            const currentCourse = store.currentCourseMetadata();
            if (currentCourse?.id) {
                clearProgressFromLocalStorage(currentCourse.id);
            }
            patchState(store, initialState);
        }
    }))
)
