import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CourseStore } from '../../store/course-store';
import { Course, Question, Answer, MasteryLevel, QuestionProgress, QuestionGroupProgress, CourseProgress, CourseMetadata } from '../../model/questions';
import { getCourseName } from '../../utils/course-name.util';
// Constants for mastery level calculation
const MASTERY_THRESHOLD = 3; // Consecutive correct answers needed for mastery

// Priority score ranges for question sorting
const PRIORITY_RANGES = {
    NOT_STARTED: { min: 0, max: 10 },
    LEARNING: { min: 10, max: 20 },
    REVIEWING: { min: 20, max: 30 },
    MASTERED: { min: 30, max: 40 },
    FALLBACK: 40
} as const;

interface QuestionWithContext {
    question: Question;
    groupName: string;
    groupIndex: number;
    progress: QuestionProgress;
}

interface SessionStats {
    totalAnswered: number;
    correctAnswers: number;
    incorrectAnswers: number;
    sessionStartTime: Date;
}

@Component({
    selector: 'app-question-view',
    imports: [],
    templateUrl: './question-view.html',
    styleUrl: './question-view.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionView implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly courseStore = inject(CourseStore);

    // Store route parameters for use in effect
    private routeParams: { groupName: string | null; questionLimit?: number } | null = null;

    // State signals
    protected readonly questionsQueue = signal<QuestionWithContext[]>([]);
    protected readonly currentQuestionIndex = signal<number>(0);
    protected readonly selectedAnswers = signal<number[]>([]);
    protected readonly showResult = signal<boolean>(false);
    protected readonly sessionStats = signal<SessionStats>({
        totalAnswered: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        sessionStartTime: new Date(),
    });

    // Template-facing store signals
    protected readonly isLoading = this.courseStore.isLoading;
    protected readonly courseError = this.courseStore.error;
    protected readonly courseName = computed(() => this.courseStore.currentCourseMetadata()?.name);

    constructor() {
        // Watch for course data to become available
        effect(() => {
            const course = this.courseStore.course();
            const progress = this.courseStore.progress();

            // Initialize questions when both course and progress are available
            if (course && progress && this.routeParams && this.questionsQueue().length === 0) {
                this.initializeQuestionQueue(this.routeParams.groupName, this.routeParams.questionLimit);
            }
        });
    }

    // Computed values
    protected readonly currentQuestion = computed(() => {
        const queue = this.questionsQueue();
        const index = this.currentQuestionIndex();
        return queue[index] || null;
    });

    protected readonly hasMoreQuestions = computed(() => {
        return this.currentQuestionIndex() < this.questionsQueue().length - 1;
    });

    protected readonly isAnswerCorrect = computed(() => {
        const selected = this.selectedAnswers();
        const current = this.currentQuestion();
        if (selected.length === 0 || !current) return false;

        // Get all correct answer indices
        const correctIndices = current.question.answers
            .map((answer, index) => answer.correct ? index : -1)
            .filter(index => index !== -1);

        // Check if selected answers match correct answers exactly
        if (selected.length !== correctIndices.length) return false;

        const sortedSelected = [...selected].sort((a, b) => a - b);
        const sortedCorrect = [...correctIndices].sort((a, b) => a - b);

        return sortedSelected.every((val, idx) => val === sortedCorrect[idx]);
    });

    protected readonly sessionAccuracy = computed(() => {
        const stats = this.sessionStats();
        if (stats.totalAnswered === 0) return 0;
        return Math.round((stats.correctAnswers / stats.totalAnswered) * 100);
    });

    ngOnInit(): void {
        const { courseId, groupName, questionLimit } = this.parseRouteParameters();

        if (!courseId) {
            this.router.navigate(['/']);
            return;
        }

        // Store route params for effect to use
        this.routeParams = { groupName, questionLimit };

        // Load course if not already loaded or if it's a different course
        const currentCourse = this.courseStore.currentCourseMetadata();
        if (!currentCourse || currentCourse.id !== courseId) {
            // Create course metadata from the route parameter
            const courseMetadata: CourseMetadata = {
                id: courseId,
                name: this.getCourseName(courseId)
            };

            // Load the course data - effect will initialize questions when ready
            this.courseStore.loadCourse(courseMetadata);
        } else if (this.courseStore.course() && this.courseStore.progress()) {
            // Data already loaded, initialize immediately
            this.initializeQuestionQueue(groupName, questionLimit);
        }
    }

    private getCourseName(courseId: string): string {
        return getCourseName(courseId);
    }

    private parseRouteParameters(): { courseId: string | null; groupName: string | null; questionLimit?: number } {
        const courseId = this.route.snapshot.paramMap.get('courseId');
        const groupName = this.route.snapshot.paramMap.get('groupName');
        const limitParam = this.route.snapshot.queryParamMap.get('limit');
        const questionLimit = limitParam ? parseInt(limitParam, 10) : undefined;

        return { courseId, groupName, questionLimit };
    }

    private initializeQuestionQueue(groupName: string | null, questionLimit?: number): void {
        const course = this.courseStore.course();
        const progress = this.courseStore.progress();

        if (!course || !progress) return;

        // Collect all questions with their context
        const allQuestions = this.collectQuestions(course, progress, groupName);

        // Smart sorting algorithm: prioritize by learning need
        const sortedQuestions = this.sortQuestionsByLearningPriority(allQuestions);

        // Apply question limit if specified
        const limitedQuestions = this.applyQuestionLimit(sortedQuestions, questionLimit);

        this.questionsQueue.set(limitedQuestions);
    }

    private collectQuestions(course: Course, progress: CourseProgress, groupName: string | null): QuestionWithContext[] {
        const allQuestions: QuestionWithContext[] = [];

        course.questionGroups.forEach((group, groupIndex) => {
            if (groupName && group.name !== groupName) return;

            const groupProgress = progress.groupsProgress[groupIndex];

            group.question.forEach((question) => {
                const questionProgress = this.findQuestionProgress(groupProgress, question.id);

                if (questionProgress) {
                    allQuestions.push({
                        question,
                        groupName: group.name,
                        groupIndex,
                        progress: questionProgress
                    });
                }
            });
        });

        return allQuestions;
    }

    private findQuestionProgress(groupProgress: QuestionGroupProgress, questionId: string): QuestionProgress | null {
        const questionProgress = groupProgress.questionsProgress.find(qp => qp.questionId === questionId);

        if (!questionProgress) {
            console.warn(`No progress found for question ${questionId}`);
            return null;
        }

        return questionProgress;
    }

    private applyQuestionLimit(questions: QuestionWithContext[], limit?: number): QuestionWithContext[] {
        return limit && limit > 0 ? questions.slice(0, limit) : questions;
    }

    private sortQuestionsByLearningPriority(questions: QuestionWithContext[]): QuestionWithContext[] {
        // Priority scoring: lower score = higher priority
        return questions.sort((a, b) => {
            const scoreA = this.calculatePriorityScore(a.progress);
            const scoreB = this.calculatePriorityScore(b.progress);

            // If same priority, add some randomness but keep similar priorities together
            if (scoreA === scoreB) {
                return Math.random() - 0.5;
            }

            return scoreA - scoreB;
        });
    }

    private calculatePriorityScore(progress: QuestionProgress): number {
        // Lower score = higher priority (should be shown sooner)

        switch (progress.masteryLevel) {
            case MasteryLevel.NOT_STARTED:
                // Random within priority band
                return PRIORITY_RANGES.NOT_STARTED.min +
                       Math.random() * (PRIORITY_RANGES.NOT_STARTED.max - PRIORITY_RANGES.NOT_STARTED.min);

            case MasteryLevel.LEARNING:
                // More incorrect attempts = higher priority
                const incorrectRatio = progress.incorrectAttempts / Math.max(progress.totalAttempts, 1);
                return PRIORITY_RANGES.LEARNING.min + (1 - incorrectRatio) *
                       (PRIORITY_RANGES.LEARNING.max - PRIORITY_RANGES.LEARNING.min);

            case MasteryLevel.REVIEWING:
                // Fewer consecutive correct = higher priority within this band
                return PRIORITY_RANGES.REVIEWING.min + progress.consecutiveCorrect * 3;

            case MasteryLevel.MASTERED:
                // Still show occasionally for retention
                return PRIORITY_RANGES.MASTERED.min +
                       Math.random() * (PRIORITY_RANGES.MASTERED.max - PRIORITY_RANGES.MASTERED.min);

            default:
                return PRIORITY_RANGES.FALLBACK;
        }
    }

    protected selectAnswer(index: number): void {
        if (this.showResult()) return; // Already answered

        const selected = this.selectedAnswers();
        const indexPos = selected.indexOf(index);

        if (indexPos === -1) {
            // Add to selection
            this.selectedAnswers.set([...selected, index]);
        } else {
            // Remove from selection
            this.selectedAnswers.set(selected.filter(i => i !== index));
        }
    }

    protected isAnswerSelected(index: number): boolean {
        return this.selectedAnswers().includes(index);
    }

    protected getMissedCorrectAnswers(): Answer[] {
        const current = this.currentQuestion();
        if (!current) return [];

        const selected = this.selectedAnswers();
        return current.question.answers.filter((answer, index) =>
            answer.correct && !selected.includes(index)
        );
    }

    protected submitAnswer(): void {
        if (this.selectedAnswers().length === 0 || this.showResult()) return;

        const isCorrect = this.isAnswerCorrect();
        this.showResult.set(true);

        this.updateSessionStats(isCorrect);
        this.updateQuestionProgress(isCorrect);
    }

    private updateSessionStats(isCorrect: boolean): void {
        const stats = this.sessionStats();
        this.sessionStats.set({
            ...stats,
            totalAnswered: stats.totalAnswered + 1,
            correctAnswers: stats.correctAnswers + (isCorrect ? 1 : 0),
            incorrectAnswers: stats.incorrectAnswers + (isCorrect ? 0 : 1)
        });
    }

    private updateQuestionProgress(isCorrect: boolean): void {
        const current = this.currentQuestion();
        const progress = this.courseStore.progress();

        if (!current || !progress) return;

        const groupProgress = progress.groupsProgress[current.groupIndex];
        const questionProgressIndex = this.findQuestionProgressIndex(groupProgress, current.question.id);

        if (questionProgressIndex === -1) {
            console.error(`Question progress not found for ID: ${current.question.id}`);
            return;
        }

        const questionProgress = groupProgress.questionsProgress[questionProgressIndex];
        const updatedQuestionProgress = this.buildUpdatedQuestionProgress(questionProgress, isCorrect);
        const updatedGroupProgress = this.buildUpdatedGroupProgress(
            groupProgress,
            questionProgressIndex,
            updatedQuestionProgress
        );
        const updatedProgress = this.buildUpdatedCourseProgress(
            progress,
            current.groupIndex,
            updatedGroupProgress,
            isCorrect
        );

        this.courseStore.updateProgress(updatedProgress);
    }

    private findQuestionProgressIndex(groupProgress: QuestionGroupProgress, questionId: string): number {
        return groupProgress.questionsProgress.findIndex(qp => qp.questionId === questionId);
    }

    private buildUpdatedQuestionProgress(
        questionProgress: QuestionProgress,
        isCorrect: boolean
    ): QuestionProgress {
        const consecutiveCorrect = isCorrect ? questionProgress.consecutiveCorrect + 1 : 0;
        const consecutiveIncorrect = isCorrect ? 0 : questionProgress.consecutiveIncorrect + 1;
        const totalAttempts = questionProgress.totalAttempts + 1;
        const correctAttempts = questionProgress.correctAttempts + (isCorrect ? 1 : 0);

        const updatedProgress: QuestionProgress = {
            ...questionProgress,
            totalAttempts,
            correctAttempts,
            incorrectAttempts: questionProgress.incorrectAttempts + (isCorrect ? 0 : 1),
            consecutiveCorrect,
            consecutiveIncorrect,
            lastAttemptedAt: new Date(),
            firstCorrectAt: isCorrect && !questionProgress.firstCorrectAt ? new Date() : questionProgress.firstCorrectAt,
            masteredAt: undefined,
            masteryLevel: this.calculateMasteryLevel(consecutiveCorrect, consecutiveIncorrect, totalAttempts, correctAttempts)
        };

        // Set mastered timestamp if just reached mastered level
        if (updatedProgress.masteryLevel === MasteryLevel.MASTERED &&
            questionProgress.masteryLevel !== MasteryLevel.MASTERED) {
            updatedProgress.masteredAt = new Date();
        }

        return updatedProgress;
    }

    private buildUpdatedGroupProgress(
        groupProgress: QuestionGroupProgress,
        questionProgressIndex: number,
        updatedQuestionProgress: QuestionProgress
    ): QuestionGroupProgress {
        const updatedGroupProgress: QuestionGroupProgress = {
            ...groupProgress,
            questionsProgress: groupProgress.questionsProgress.map((qp, idx) =>
                idx === questionProgressIndex ? updatedQuestionProgress : qp
            ),
            lastActivityAt: new Date(),
        };

        if (!groupProgress.startedAt) {
            updatedGroupProgress.startedAt = new Date();
        }

        return updatedGroupProgress;
    }

    private buildUpdatedCourseProgress(
        progress: CourseProgress,
        groupIndex: number,
        updatedGroupProgress: QuestionGroupProgress,
        isCorrect: boolean
    ): CourseProgress {
        const newStreak = isCorrect ? progress.currentStreak + 1 : 0;

        return {
            ...progress,
            groupsProgress: progress.groupsProgress.map((gp, idx) =>
                idx === groupIndex ? updatedGroupProgress : gp
            ),
            lastActivityAt: new Date(),
            currentStreak: newStreak,
            longestStreak: Math.max(progress.longestStreak, newStreak)
        };
    }

    private calculateMasteryLevel(
        consecutiveCorrect: number,
        _consecutiveIncorrect: number,
        totalAttempts: number,
        _totalCorrect: number
    ): MasteryLevel {
        if (totalAttempts === 0) {
            return MasteryLevel.NOT_STARTED;
        }

        if (consecutiveCorrect >= MASTERY_THRESHOLD) {
            return MasteryLevel.MASTERED;
        }

        if (consecutiveCorrect > 0) {
            return MasteryLevel.REVIEWING;
        }

        return MasteryLevel.LEARNING;
    }

    protected nextQuestion(): void {
        if (!this.hasMoreQuestions()) {
            this.finishSession();
            return;
        }

        this.currentQuestionIndex.set(this.currentQuestionIndex() + 1);
        this.selectedAnswers.set([]);
        this.showResult.set(false);
    }

    protected finishSession(): void {
        const courseId = this.courseStore.currentCourseMetadata()?.id;
        if (courseId) {
            this.router.navigate(['/course', courseId]);
        } else {
            this.router.navigate(['/']);
        }
    }

    protected exitSession(): void {
        if (confirm('Möchtest du die Lernsession wirklich beenden? Dein Fortschritt wird gespeichert.')) {
            this.finishSession();
        }
    }
}
