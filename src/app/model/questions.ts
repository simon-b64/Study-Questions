export interface CourseMetadata {
    id: string;
    name: string;
    description?: string;
    url?: string;
}

export interface Course {
    questionGroups: QuestionGroup[];
}

export interface QuestionGroup {
    name: string; // Hier kannst du das Thema der Folien eintragen
    questions: Question[];
}

export interface Question {
    id: string;                        // Unique identifier for the question
    question: string;
    hint: string; // Ein hilfreicher Hinweis zur Lösung
    answers: Answer[];
    reason: string; // Eine kurze Erklärung, warum die Antwort richtig ist
}

export interface Answer {
    text: string; // Muss "Ja" oder "Nein" sein
    correct: boolean;
}

// Progress Tracking Models

export enum MasteryLevel {
    NOT_STARTED = 'NOT_STARTED',      // Never attempted
    LEARNING = 'LEARNING',             // Attempted but not mastered
    REVIEWING = 'REVIEWING',           // Correct once or twice, needs reinforcement
    MASTERED = 'MASTERED'              // Consistently correct, well understood
}

export interface QuestionProgress {
    questionId: string;                    // ID of the question
    totalAttempts: number;                 // Total number of times attempted
    correctAttempts: number;               // Number of correct answers
    incorrectAttempts: number;             // Number of incorrect answers
    consecutiveCorrect: number;            // Current streak of correct answers
    consecutiveIncorrect: number;          // Current streak of incorrect answers
    masteryLevel: MasteryLevel;            // Current mastery level
    lastAttemptedAt?: Date;                // Timestamp of last attempt
    firstCorrectAt?: Date;                 // Timestamp when first answered correctly
    masteredAt?: Date;                     // Timestamp when mastered (3+ consecutive correct)
    hintUsedCount: number;                 // How many times hint was viewed
}

export interface QuestionGroupProgress {
    groupName: string;                     // Name of the question group
    totalQuestions: number;                // Total questions in this group
    questionsProgress: QuestionProgress[]; // Progress for each question
    startedAt?: Date;                      // When first question was attempted
    lastActivityAt?: Date;                 // Last time any question was attempted

    // Derived metrics (calculated)
    notStartedCount: number;               // Questions never attempted
    learningCount: number;                 // Questions being learned
    reviewingCount: number;                // Questions in review phase
    masteredCount: number;                 // Questions fully mastered
    completionPercentage: number;          // % of questions mastered
    averageAccuracy: number;               // Overall accuracy rate for this group
}

export interface CourseProgress {
    courseId: string;                      // Course identifier
    courseName: string;                    // Course display name
    totalQuestions: number;                // Total questions across all groups
    totalQuestionGroups: number;           // Total number of question groups
    groupsProgress: QuestionGroupProgress[]; // Progress for each group
    createdAt: Date;                       // When progress tracking started
    lastActivityAt?: Date;                 // Last time any question was attempted

    // Overall course metrics (calculated)
    overallCompletionPercentage: number;   // % of all questions mastered
    overallAccuracy: number;               // Accuracy across all attempts
    notStartedCount: number;               // Total questions not started
    learningCount: number;                 // Total questions being learned
    reviewingCount: number;                // Total questions in review
    masteredCount: number;                 // Total questions mastered
    currentStreak: number;                 // Current streak of correct answers (across all questions)
    longestStreak: number;                 // Longest streak achieved
}

