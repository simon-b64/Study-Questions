import { computed, effect, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
    Course,
    CourseMetadata,
    CourseProgress,
    MasteryLevel,
    QuestionGroupProgress,
    QuestionProgress
} from '../model/questions';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, from, of, pipe, switchMap } from 'rxjs';
import { FirestoreProgressService } from '../services/firestore-progress.service';
import { AuthService } from '../services/auth.service';
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

// Migration utility function - exported for use in components
export function migrateOldProgress(progress: any, course: Course): CourseProgress {
    // Check if migration is needed (old progress has questionIndex instead of questionId)
    const needsMigration = progress.groupsProgress?.some((group: any) =>
        group.questionsProgress?.some((qp: any) => 'questionIndex' in qp && !('questionId' in qp))
    );

    if (!needsMigration) {
        return progress;
    }

    console.log('Migrating old progress data from index-based to ID-based...');

    // Migrate each group's progress
    const migratedGroupsProgress = progress.groupsProgress.map((groupProgress: any, groupIndex: number) => {
        const courseGroup = course.questionGroups[groupIndex];
        if (!courseGroup) {
            console.warn(`No course group found at index ${groupIndex}`);
            return groupProgress;
        }

        // Migrate question progress from index to ID
        const migratedQuestionsProgress = groupProgress.questionsProgress.map((qp: any) => {
            // If already has questionId, keep it
            if ('questionId' in qp) {
                return qp;
            }

            // Convert questionIndex to questionId
            const questionIndex = qp.questionIndex;
            const question = courseGroup.question[questionIndex];

            if (!question || !question.id) {
                console.warn(`Cannot migrate progress for question at index ${questionIndex} in group ${groupIndex}`);
                return null;
            }

            // Create new progress object with questionId
            const { questionIndex: _, ...rest } = qp; // Remove questionIndex
            return {
                ...rest,
                questionId: question.id
            };
        }).filter((qp: any) => qp !== null); // Remove any failed migrations

        return {
            ...groupProgress,
            questionsProgress: migratedQuestionsProgress
        };
    });

    return {
        ...progress,
        groupsProgress: migratedGroupsProgress
    };
}

// Synchronize progress with current course data - adds missing questions and cleans up orphaned ones
function synchronizeProgressWithCourse(progress: CourseProgress, course: Course): CourseProgress {
    let hasChanges = false;
    let orphanedCount = 0;

    const synchronizedGroupsProgress = course.questionGroups.map((courseGroup, groupIndex) => {
        const groupProgress = progress.groupsProgress[groupIndex];

        if (!groupProgress) {
            // Entire group is missing - initialize it
            console.log(`Adding missing group: ${courseGroup.name}`);
            hasChanges = true;
            return {
                groupName: courseGroup.name,
                totalQuestions: courseGroup.question.length,
                questionsProgress: courseGroup.question.map((question) => ({
                    questionId: question.id,
                    totalAttempts: 0,
                    correctAttempts: 0,
                    incorrectAttempts: 0,
                    consecutiveCorrect: 0,
                    consecutiveIncorrect: 0,
                    masteryLevel: MasteryLevel.NOT_STARTED,
                    hintUsedCount: 0,
                })),
                notStartedCount: courseGroup.question.length,
                learningCount: 0,
                reviewingCount: 0,
                masteredCount: 0,
                completionPercentage: 0,
                averageAccuracy: 0,
            };
        }

        // Build set of valid question IDs from current course
        const currentQuestionIds = new Set(courseGroup.question.map(q => q.id));

        // Filter out orphaned progress entries (questions that no longer exist or were altered)
        const validQuestionsProgress = groupProgress.questionsProgress.filter(qp => {
            const isValid = currentQuestionIds.has(qp.questionId);
            if (!isValid) {
                orphanedCount++;
                console.log(`Removing orphaned progress for question ID: ${qp.questionId} in group: ${courseGroup.name}`);
                hasChanges = true;
            }
            return isValid;
        });

        // Check for missing questions in this group
        const existingQuestionIds = new Set(validQuestionsProgress.map(qp => qp.questionId));
        const missingQuestions = courseGroup.question.filter(q => !existingQuestionIds.has(q.id));

        if (missingQuestions.length > 0) {
            console.log(`Adding ${missingQuestions.length} new question(s) to group: ${courseGroup.name}`);
            hasChanges = true;

            // Add progress entries for missing questions
            const newQuestionsProgress: QuestionProgress[] = missingQuestions.map(question => ({
                questionId: question.id,
                totalAttempts: 0,
                correctAttempts: 0,
                incorrectAttempts: 0,
                consecutiveCorrect: 0,
                consecutiveIncorrect: 0,
                masteryLevel: MasteryLevel.NOT_STARTED,
                hintUsedCount: 0,
            }));

            return {
                ...groupProgress,
                questionsProgress: [...validQuestionsProgress, ...newQuestionsProgress],
                totalQuestions: courseGroup.question.length,
                notStartedCount: groupProgress.notStartedCount + missingQuestions.length,
            };
        }

        // Update total questions count if it's different or we removed orphaned entries
        if (groupProgress.totalQuestions !== courseGroup.question.length || validQuestionsProgress.length !== groupProgress.questionsProgress.length) {
            hasChanges = true;
            return {
                ...groupProgress,
                questionsProgress: validQuestionsProgress,
                totalQuestions: courseGroup.question.length,
            };
        }

        return groupProgress;
    });

    if (hasChanges) {
        if (orphanedCount > 0) {
            console.log(`Progress synchronized: Removed ${orphanedCount} orphaned progress entry(ies) from altered/removed questions`);
        } else {
            console.log('Progress synchronized with current course data');
        }

        const totalQuestions = course.questionGroups.reduce((sum, group) => sum + group.question.length, 0);

        return {
            ...progress,
            groupsProgress: synchronizedGroupsProgress,
            totalQuestions,
            totalQuestionGroups: course.questionGroups.length,
        };
    }

    return progress;
}

function initializeCourseProgress(course: Course, metadata: CourseMetadata): CourseProgress {
    const groupsProgress: QuestionGroupProgress[] = course.questionGroups.map(group => {
        const questionsProgress: QuestionProgress[] = group.question.map((question) => ({
            questionId: question.id,
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
    withMethods((store, http = inject(HttpClient), firestoreService = inject(FirestoreProgressService), authService = inject(AuthService)) => ({
        loadCourse: rxMethod<CourseMetadata>(
            pipe(
                switchMap((metadata) => {
                    patchState(store, { isLoading: true, error: undefined });
                    return from(
                        http.get<Course>(`/${metadata.id}.json`).toPromise().then(async (course) => {
                            if (!course) throw new Error('Course not found');

                            const currentHash = generateCourseHash(course);
                            const user = authService.user();

                            // 1. Load from localStorage
                            let localProgress = loadProgressFromLocalStorage(metadata.id);
                            if (localProgress) {
                                localProgress = migrateOldProgress(localProgress, course);
                                localProgress = synchronizeProgressWithCourse(localProgress, course);
                            }

                            // 2. Load from Firestore (authoritative for logged-in users)
                            let progress: CourseProgress | null = null;
                            if (user) {
                                const firestoreProgress = await firestoreService.loadProgress(user.uid, metadata.id);
                                if (firestoreProgress) {
                                    // Prefer Firestore — pick whichever was active more recently
                                    const firestoreTime = firestoreProgress.lastActivityAt?.getTime() ?? 0;
                                    const localTime = localProgress?.lastActivityAt?.getTime() ?? 0;
                                    progress = firestoreTime >= localTime ? firestoreProgress : localProgress;
                                    progress = synchronizeProgressWithCourse(progress!, course);
                                } else if (localProgress) {
                                    // First login on this device — upload local progress to Firestore
                                    progress = localProgress;
                                    await firestoreService.saveProgress(user.uid, progress);
                                }
                            } else {
                                progress = localProgress;
                            }

                            // 3. Hash validation
                            if (progress) {
                                if (!progress.courseDataHash) {
                                    progress.courseDataHash = currentHash;
                                    saveProgressToLocalStorage(progress);
                                    if (user) await firestoreService.saveProgress(user.uid, progress);
                                } else if (progress.courseDataHash !== currentHash) {
                                    const proceed = confirm(
                                        '⚠️ Warnung: Die Kursdaten haben sich geändert!\n\n' +
                                        'Dein gespeicherter Fortschritt passt nicht zur aktuellen Version des Kurses. ' +
                                        'Dies kann passieren, wenn Fragen hinzugefügt, entfernt oder geändert wurden.\n\n' +
                                        'Möchtest du trotzdem deinen alten Fortschritt laden?\n' +
                                        '(Empfohlen: "Abbrechen" um mit leerem Fortschritt zu beginnen)'
                                    );
                                    if (!proceed) {
                                        clearProgressFromLocalStorage(metadata.id);
                                        if (user) await firestoreService.clearProgress(user.uid, metadata.id);
                                        progress = null;
                                    } else {
                                        progress.courseDataHash = currentHash;
                                        saveProgressToLocalStorage(progress);
                                        if (user) await firestoreService.saveProgress(user.uid, progress);
                                    }
                                }
                            }

                            // 4. Initialize fresh if still nothing
                            if (!progress) {
                                progress = initializeCourseProgress(course, metadata);
                                saveProgressToLocalStorage(progress);
                                if (user) await firestoreService.saveProgress(user.uid, progress);
                            }

                            patchState(store, {
                                course,
                                currentCourseMetadata: metadata,
                                progress,
                                isLoading: false,
                                error: undefined,
                            });
                        })
                    ).pipe(
                        catchError((error: unknown) => {
                            patchState(store, {
                                error: `Failed to load course: ${error instanceof Error ? error.message : String(error)}`,
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
            patchState(store, { progress: recalculated });
            saveProgressToLocalStorage(recalculated);
            const user = authService.user();
            if (user) {
                await firestoreService.saveProgress(user.uid, recalculated);
            }
        },
        clearProgress: async (courseId: string) => {
            clearProgressFromLocalStorage(courseId);
            const user = authService.user();
            if (user) {
                await firestoreService.clearProgress(user.uid, courseId);
            }
            const currentCourse = store.currentCourseMetadata();
            if (currentCourse?.id === courseId) {
                patchState(store, { progress: undefined });
            }
        },
        reset: async () => {
            const currentCourse = store.currentCourseMetadata();
            if (currentCourse?.id) {
                clearProgressFromLocalStorage(currentCourse.id);
                const user = authService.user();
                if (user) {
                    await firestoreService.clearProgress(user.uid, currentCourse.id);
                }
            }
            patchState(store, initialState);
        },
    })),
    withHooks((store, firestoreService = inject(FirestoreProgressService), authService = inject(AuthService)) => ({
        onInit() {
            let previousUserId: string | null | undefined = undefined;
            effect(() => {
                const user = authService.user();
                const wasLoggedOut = previousUserId === null;
                const nowLoggedIn = !!user;
                previousUserId = user?.uid ?? null;

                // User just logged in — push any in-memory progress to Firestore
                if (wasLoggedOut && nowLoggedIn && user) {
                    const progress = store.progress();
                    if (progress) {
                        firestoreService.saveProgress(user.uid, progress).catch(console.error);
                    }
                }
            });
        },
    }))
)
