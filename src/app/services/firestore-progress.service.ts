import { Injectable, inject } from '@angular/core';
import {
    Firestore,
    doc,
    getDoc,
    setDoc,
    deleteDoc,
    Timestamp,
} from '@angular/fire/firestore';
import { CourseProgress, QuestionGroupProgress, QuestionProgress } from '../model/questions';

// Firestore-safe representation: Date fields replaced with Timestamp
type FirestoreQuestionProgress = Omit<QuestionProgress, 'lastAttemptedAt' | 'firstCorrectAt' | 'masteredAt'> & {
    lastAttemptedAt?: Timestamp;
    firstCorrectAt?: Timestamp;
    masteredAt?: Timestamp;
};

type FirestoreGroupProgress = Omit<QuestionGroupProgress, 'startedAt' | 'lastActivityAt' | 'questionsProgress'> & {
    startedAt?: Timestamp;
    lastActivityAt?: Timestamp;
    questionsProgress: FirestoreQuestionProgress[];
};

type FirestoreCourseProgress = Omit<CourseProgress, 'createdAt' | 'lastActivityAt' | 'groupsProgress'> & {    createdAt: Timestamp;
    lastActivityAt?: Timestamp;
    groupsProgress: FirestoreGroupProgress[];
};

// Firestore rejects undefined values — omit keys whose value is undefined
function defined<T extends object>(obj: T): T {
    return Object.fromEntries(
        Object.entries(obj).filter(([, v]) => v !== undefined)
    ) as T;
}

function serializeProgress(progress: CourseProgress): FirestoreCourseProgress {
    const groupsProgress: FirestoreGroupProgress[] = progress.groupsProgress.map(group => {
        const questionsProgress: FirestoreQuestionProgress[] = group.questionsProgress.map(q => defined({
            ...q,
            lastAttemptedAt: q.lastAttemptedAt ? Timestamp.fromDate(q.lastAttemptedAt) : undefined,
            firstCorrectAt: q.firstCorrectAt ? Timestamp.fromDate(q.firstCorrectAt) : undefined,
            masteredAt: q.masteredAt ? Timestamp.fromDate(q.masteredAt) : undefined,
        }));
        return defined<FirestoreGroupProgress>({
            groupName: group.groupName,
            totalQuestions: group.totalQuestions,
            notStartedCount: group.notStartedCount,
            learningCount: group.learningCount,
            reviewingCount: group.reviewingCount,
            masteredCount: group.masteredCount,
            completionPercentage: group.completionPercentage,
            averageAccuracy: group.averageAccuracy,
            questionsProgress,
            startedAt: group.startedAt ? Timestamp.fromDate(group.startedAt) : undefined,
            lastActivityAt: group.lastActivityAt ? Timestamp.fromDate(group.lastActivityAt) : undefined,
        });
    });

    return defined<FirestoreCourseProgress>({
        courseId: progress.courseId,
        courseName: progress.courseName,
        totalQuestions: progress.totalQuestions,
        totalQuestionGroups: progress.totalQuestionGroups,
        overallCompletionPercentage: progress.overallCompletionPercentage,
        overallAccuracy: progress.overallAccuracy,
        totalStudyTime: progress.totalStudyTime,
        notStartedCount: progress.notStartedCount,
        learningCount: progress.learningCount,
        reviewingCount: progress.reviewingCount,
        masteredCount: progress.masteredCount,
        currentStreak: progress.currentStreak,
        longestStreak: progress.longestStreak,
        groupsProgress,
        createdAt: Timestamp.fromDate(progress.createdAt),
        lastActivityAt: progress.lastActivityAt ? Timestamp.fromDate(progress.lastActivityAt) : undefined,
    });
}

function deserializeProgress(data: FirestoreCourseProgress): CourseProgress {
    return {
        ...data,
        createdAt: data.createdAt.toDate(),
        lastActivityAt: data.lastActivityAt?.toDate(),
        groupsProgress: data.groupsProgress.map(group => ({
            ...group,
            startedAt: group.startedAt?.toDate(),
            lastActivityAt: group.lastActivityAt?.toDate(),
            questionsProgress: group.questionsProgress.map(q => ({
                ...q,
                lastAttemptedAt: q.lastAttemptedAt?.toDate(),
                firstCorrectAt: q.firstCorrectAt?.toDate(),
                masteredAt: q.masteredAt?.toDate(),
            })),
        })),
    };
}

@Injectable({ providedIn: 'root' })
export class FirestoreProgressService {
    private readonly firestore = inject(Firestore, { optional: true });

    async saveProgress(userId: string, progress: CourseProgress): Promise<void> {
        if (!this.firestore) return;
        try {
            const ref = doc(this.firestore, `users/${userId}/progress/${progress.courseId}`);
            await setDoc(ref, serializeProgress(progress));
        } catch (error) {
            console.error('Failed to save progress to Firestore:', error);
        }
    }

    async loadProgress(userId: string, courseId: string): Promise<CourseProgress | null> {
        if (!this.firestore) return null;
        try {
            const ref = doc(this.firestore, `users/${userId}/progress/${courseId}`);
            const snapshot = await getDoc(ref);
            if (!snapshot.exists()) return null;
            return deserializeProgress(snapshot.data() as FirestoreCourseProgress);
        } catch (error) {
            console.error('Failed to load progress from Firestore:', error);
            return null;
        }
    }

    async clearProgress(userId: string, courseId: string): Promise<void> {
        if (!this.firestore) return;
        try {
            const ref = doc(this.firestore, `users/${userId}/progress/${courseId}`);
            await deleteDoc(ref);
        } catch (error) {
            console.error('Failed to clear progress from Firestore:', error);
        }
    }
}

