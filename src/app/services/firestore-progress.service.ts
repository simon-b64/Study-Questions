import { Injectable, inject } from '@angular/core';
import {
    Firestore,
    doc,
    getDoc,
    setDoc,
    deleteDoc,
    Timestamp,
} from '@angular/fire/firestore';
import { CourseProgress, QuestionProgress } from '../model/questions';
import { calculateOverallMetrics } from '../utils/course-progress.utils';

// Only raw, user-generated data — no calculated/derived fields
type FirestoreQuestionProgress = Pick<QuestionProgress,
    | 'questionId'
    | 'totalAttempts'
    | 'correctAttempts'
    | 'incorrectAttempts'
    | 'consecutiveCorrect'
    | 'consecutiveIncorrect'
    | 'masteryLevel'
    | 'hintUsedCount'
> & {
    lastAttemptedAt?: Timestamp;
    firstCorrectAt?: Timestamp;
    masteredAt?: Timestamp;
};

type FirestoreGroupProgress = {
    groupName: string;
    questionsProgress: FirestoreQuestionProgress[];
    startedAt?: Timestamp;
    lastActivityAt?: Timestamp;
};

type FirestoreCourseProgress = {
    courseId: string;
    currentStreak: number;
    longestStreak: number;
    createdAt: Timestamp;
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
            questionId: q.questionId,
            totalAttempts: q.totalAttempts,
            correctAttempts: q.correctAttempts,
            incorrectAttempts: q.incorrectAttempts,
            consecutiveCorrect: q.consecutiveCorrect,
            consecutiveIncorrect: q.consecutiveIncorrect,
            masteryLevel: q.masteryLevel,
            hintUsedCount: q.hintUsedCount,
            lastAttemptedAt: q.lastAttemptedAt ? Timestamp.fromDate(q.lastAttemptedAt) : undefined,
            firstCorrectAt: q.firstCorrectAt ? Timestamp.fromDate(q.firstCorrectAt) : undefined,
            masteredAt: q.masteredAt ? Timestamp.fromDate(q.masteredAt) : undefined,
        }));
        return defined<FirestoreGroupProgress>({
            groupName: group.groupName,
            questionsProgress,
            startedAt: group.startedAt ? Timestamp.fromDate(group.startedAt) : undefined,
            lastActivityAt: group.lastActivityAt ? Timestamp.fromDate(group.lastActivityAt) : undefined,
        });
    });

    return defined<FirestoreCourseProgress>({
        courseId: progress.courseId,
        currentStreak: progress.currentStreak,
        longestStreak: progress.longestStreak,
        createdAt: Timestamp.fromDate(progress.createdAt),
        lastActivityAt: progress.lastActivityAt ? Timestamp.fromDate(progress.lastActivityAt) : undefined,
        groupsProgress,
    });
}

function deserializeProgress(data: FirestoreCourseProgress, existing: CourseProgress): CourseProgress {
    // Restore raw fields onto the existing (course-synchronized) skeleton, then recalculate
    const groupsProgress = existing.groupsProgress.map((existingGroup, i) => {
        const storedGroup = data.groupsProgress[i];
        if (!storedGroup) return existingGroup;

        const questionsProgress = existingGroup.questionsProgress.map(existingQ => {
            const storedQ = storedGroup.questionsProgress.find(q => q.questionId === existingQ.questionId);
            if (!storedQ) return existingQ;
            return {
                ...existingQ,
                totalAttempts: storedQ.totalAttempts,
                correctAttempts: storedQ.correctAttempts,
                incorrectAttempts: storedQ.incorrectAttempts,
                consecutiveCorrect: storedQ.consecutiveCorrect,
                consecutiveIncorrect: storedQ.consecutiveIncorrect,
                masteryLevel: storedQ.masteryLevel,
                hintUsedCount: storedQ.hintUsedCount,
                lastAttemptedAt: storedQ.lastAttemptedAt?.toDate(),
                firstCorrectAt: storedQ.firstCorrectAt?.toDate(),
                masteredAt: storedQ.masteredAt?.toDate(),
            };
        });

        return {
            ...existingGroup,
            questionsProgress,
            startedAt: storedGroup.startedAt?.toDate(),
            lastActivityAt: storedGroup.lastActivityAt?.toDate(),
        };
    });

    return calculateOverallMetrics({
        ...existing,
        courseId: data.courseId,
        currentStreak: data.currentStreak,
        longestStreak: data.longestStreak,
        createdAt: data.createdAt.toDate(),
        lastActivityAt: data.lastActivityAt?.toDate(),
        groupsProgress,
    });
}

@Injectable({ providedIn: 'root' })
export class FirestoreProgressService {
    private readonly _firestore = inject(Firestore, { optional: true });

    readonly isAvailable = this._firestore !== null;

    private get firestore(): Firestore {
        if (!this._firestore) throw new Error('Firestore is not configured.');
        return this._firestore;
    }

    async saveProgress(userId: string, progress: CourseProgress): Promise<void> {
        const ref = doc(this.firestore, `users/${userId}/progress/${progress.courseId}`);
        await setDoc(ref, serializeProgress(progress));
    }

    async loadProgress(userId: string, courseId: string, existing: CourseProgress): Promise<CourseProgress | null> {
        const ref = doc(this.firestore, `users/${userId}/progress/${courseId}`);
        const snapshot = await getDoc(ref);
        if (!snapshot.exists()) return null;
        return deserializeProgress(snapshot.data() as FirestoreCourseProgress, existing);
    }

    async clearProgress(userId: string, courseId: string): Promise<void> {
        const ref = doc(this.firestore, `users/${userId}/progress/${courseId}`);
        await deleteDoc(ref);
    }
}
