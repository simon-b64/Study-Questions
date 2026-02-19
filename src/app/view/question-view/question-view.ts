import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CourseStore } from '../../store/course-store';
import { Question, MasteryLevel, QuestionProgress, CourseProgress } from '../../model/questions';

interface QuestionWithContext {
    question: Question;
    groupName: string;
    groupIndex: number;
    progress: QuestionProgress;
}

@Component({
    selector: 'app-question-view',
    imports: [CommonModule],
    templateUrl: './question-view.html',
    styleUrl: './question-view.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionView implements OnInit {
    private readonly route = inject(ActivatedRoute);
    protected readonly router = inject(Router);
    protected readonly courseStore = inject(CourseStore);

    // State
    protected readonly questionsQueue = signal<QuestionWithContext[]>([]);
    protected readonly currentQuestionIndex = signal<number>(0);
    protected readonly selectedAnswer = signal<number | null>(null);
    protected readonly showResult = signal<boolean>(false);
    protected readonly sessionStats = signal({
        totalAnswered: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        sessionStartTime: new Date()
    });

    // Computed
    protected readonly currentQuestion = computed(() => {
        const queue = this.questionsQueue();
        const index = this.currentQuestionIndex();
        return queue[index] || null;
    });

    protected readonly hasMoreQuestions = computed(() => {
        return this.currentQuestionIndex() < this.questionsQueue().length - 1;
    });

    protected readonly isAnswerCorrect = computed(() => {
        const selected = this.selectedAnswer();
        const current = this.currentQuestion();
        if (selected === null || !current) return false;
        return current.question.answers[selected].correct;
    });

    protected readonly sessionAccuracy = computed(() => {
        const stats = this.sessionStats();
        if (stats.totalAnswered === 0) return 0;
        return Math.round((stats.correctAnswers / stats.totalAnswered) * 100);
    });

    ngOnInit(): void {
        const courseId = this.route.snapshot.paramMap.get('courseId');
        const groupName = this.route.snapshot.paramMap.get('groupName');
        const limitParam = this.route.snapshot.queryParamMap.get('limit');
        const questionLimit = limitParam ? parseInt(limitParam, 10) : undefined;

        if (!courseId || !this.courseStore.course() || !this.courseStore.progress()) {
            this.router.navigate(['/']);
            return;
        }

        this.initializeQuestionQueue(groupName, questionLimit);
    }

    private initializeQuestionQueue(groupName: string | null, questionLimit?: number): void {
        const course = this.courseStore.course();
        const progress = this.courseStore.progress();

        if (!course || !progress) return;

        const allQuestions: QuestionWithContext[] = [];

        // Collect all questions with their context
        course.questionGroups.forEach((group, groupIndex) => {
            // If groupName is specified, only include that group
            if (groupName && group.name !== groupName) return;

            const groupProgress = progress.groupsProgress[groupIndex];

            group.question.forEach((question) => {
                // Find progress by question ID
                const questionProgress = groupProgress.questionsProgress.find(
                    qp => qp.questionId === question.id
                );

                // If no progress found (shouldn't happen but handle gracefully)
                if (!questionProgress) {
                    console.warn(`No progress found for question ${question.id}`);
                    return;
                }

                allQuestions.push({
                    question,
                    groupName: group.name,
                    groupIndex,
                    progress: questionProgress
                });
            });
        });

        // Smart sorting algorithm: prioritize by learning need
        const sortedQuestions = this.sortQuestionsByLearningPriority(allQuestions);

        // Apply question limit if specified
        const limitedQuestions = questionLimit && questionLimit > 0
            ? sortedQuestions.slice(0, questionLimit)
            : sortedQuestions;

        this.questionsQueue.set(limitedQuestions);
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

        // Priority 1: Never attempted (score: 0-10)
        if (progress.masteryLevel === MasteryLevel.NOT_STARTED) {
            return Math.random() * 10; // Random within priority band
        }

        // Priority 2: Learning (attempted but struggling) (score: 10-20)
        if (progress.masteryLevel === MasteryLevel.LEARNING) {
            // More incorrect attempts = higher priority
            const incorrectRatio = progress.incorrectAttempts / Math.max(progress.totalAttempts, 1);
            return 10 + (1 - incorrectRatio) * 10;
        }

        // Priority 3: Reviewing (getting right but needs reinforcement) (score: 20-30)
        if (progress.masteryLevel === MasteryLevel.REVIEWING) {
            // Fewer consecutive correct = higher priority within this band
            return 20 + progress.consecutiveCorrect * 3;
        }

        // Priority 4: Mastered (score: 30-40)
        if (progress.masteryLevel === MasteryLevel.MASTERED) {
            // Still show occasionally for retention
            return 30 + Math.random() * 10;
        }

        return 40; // Fallback
    }

    protected selectAnswer(index: number): void {
        if (this.showResult()) return; // Already answered
        this.selectedAnswer.set(index);
    }

    protected submitAnswer(): void {
        if (this.selectedAnswer() === null || this.showResult()) return;

        const isCorrect = this.isAnswerCorrect();
        this.showResult.set(true);

        // Update session stats
        const stats = this.sessionStats();
        this.sessionStats.set({
            ...stats,
            totalAnswered: stats.totalAnswered + 1,
            correctAnswers: stats.correctAnswers + (isCorrect ? 1 : 0),
            incorrectAnswers: stats.incorrectAnswers + (isCorrect ? 0 : 1)
        });

        // Update progress in store
        this.updateQuestionProgress(isCorrect);
    }

    private updateQuestionProgress(isCorrect: boolean): void {
        const current = this.currentQuestion();
        const progress = this.courseStore.progress();

        if (!current || !progress) return;

        const groupProgress = progress.groupsProgress[current.groupIndex];

        // Find the question progress by ID
        const questionProgressIndex = groupProgress.questionsProgress.findIndex(
            qp => qp.questionId === current.question.id
        );

        if (questionProgressIndex === -1) {
            console.error(`Question progress not found for ID: ${current.question.id}`);
            return;
        }

        const questionProgress = groupProgress.questionsProgress[questionProgressIndex];

        // Update question progress
        const updatedQuestionProgress: QuestionProgress = {
            ...questionProgress,
            totalAttempts: questionProgress.totalAttempts + 1,
            correctAttempts: questionProgress.correctAttempts + (isCorrect ? 1 : 0),
            incorrectAttempts: questionProgress.incorrectAttempts + (isCorrect ? 0 : 1),
            consecutiveCorrect: isCorrect ? questionProgress.consecutiveCorrect + 1 : 0,
            consecutiveIncorrect: isCorrect ? 0 : questionProgress.consecutiveIncorrect + 1,
            lastAttemptedAt: new Date(),
            firstCorrectAt: isCorrect && !questionProgress.firstCorrectAt ? new Date() : questionProgress.firstCorrectAt,
            masteredAt: undefined, // Will be set below if mastered
            masteryLevel: this.calculateMasteryLevel(
                questionProgress.consecutiveCorrect + (isCorrect ? 1 : 0),
                questionProgress.consecutiveIncorrect + (isCorrect ? 0 : 1),
                questionProgress.totalAttempts + 1,
                questionProgress.correctAttempts + (isCorrect ? 1 : 0)
            )
        };

        // Set mastered timestamp if just reached mastered level
        if (updatedQuestionProgress.masteryLevel === MasteryLevel.MASTERED &&
            questionProgress.masteryLevel !== MasteryLevel.MASTERED) {
            updatedQuestionProgress.masteredAt = new Date();
        }

        // Update the progress object
        const updatedGroupProgress = {
            ...groupProgress,
            questionsProgress: groupProgress.questionsProgress.map((qp, idx) =>
                idx === questionProgressIndex ? updatedQuestionProgress : qp
            ),
            lastActivityAt: new Date()
        };

        if (!groupProgress.startedAt) {
            updatedGroupProgress.startedAt = new Date();
        }

        const updatedProgress: CourseProgress = {
            ...progress,
            groupsProgress: progress.groupsProgress.map((gp, idx) =>
                idx === current.groupIndex ? updatedGroupProgress : gp
            ),
            lastActivityAt: new Date(),
            currentStreak: isCorrect ? progress.currentStreak + 1 : 0,
            longestStreak: isCorrect && progress.currentStreak + 1 > progress.longestStreak
                ? progress.currentStreak + 1
                : progress.longestStreak
        };

        this.courseStore.updateProgress(updatedProgress);
    }

    private calculateMasteryLevel(
        consecutiveCorrect: number,
        _consecutiveIncorrect: number,
        totalAttempts: number,
        _totalCorrect: number
    ): MasteryLevel {
        // Never attempted
        if (totalAttempts === 0) {
            return MasteryLevel.NOT_STARTED;
        }

        // Mastered: 3 or more consecutive correct answers
        if (consecutiveCorrect >= 3) {
            return MasteryLevel.MASTERED;
        }

        // Reviewing: 1-2 consecutive correct answers
        if (consecutiveCorrect > 0) {
            return MasteryLevel.REVIEWING;
        }

        // Learning: attempted but not getting it right consistently
        return MasteryLevel.LEARNING;
    }

    protected nextQuestion(): void {
        if (!this.hasMoreQuestions()) {
            this.finishSession();
            return;
        }

        this.currentQuestionIndex.set(this.currentQuestionIndex() + 1);
        this.selectedAnswer.set(null);
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
