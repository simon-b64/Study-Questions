import {
    Course,
    CourseMetadata,
    CourseProgress,
    MasteryLevel,
    QuestionGroupProgress,
    QuestionProgress
} from '../model/questions';


export function initializeCourseProgress(course: Course, metadata: CourseMetadata): CourseProgress {
    const groupsProgress: QuestionGroupProgress[] = course.questionGroups.map(group => {
        const questionsProgress: QuestionProgress[] = group.questions.map((question) => ({
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
            totalQuestions: group.questions.length,
            questionsProgress,
            notStartedCount: group.questions.length,
            learningCount: 0,
            reviewingCount: 0,
            masteredCount: 0,
            completionPercentage: 0,
            averageAccuracy: 0,
        };
    });

    const totalQuestions = course.questionGroups.reduce((sum, group) => sum + group.questions.length, 0);

    return {
        courseId: metadata.id,
        courseName: metadata.name,
        totalQuestions,
        totalQuestionGroups: course.questionGroups.length,
        groupsProgress,
        createdAt: new Date(),
        overallCompletionPercentage: 0,
        overallAccuracy: 0,
        notStartedCount: totalQuestions,
        learningCount: 0,
        reviewingCount: 0,
        masteredCount: 0,
        currentStreak: 0,
        longestStreak: 0,
    };
}

export function calculateGroupMetrics(groupProgress: QuestionGroupProgress): QuestionGroupProgress {
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

export function calculateOverallMetrics(progress: CourseProgress): CourseProgress {
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

// Synchronize progress with current course data - adds missing questions and cleans up orphaned ones
export function synchronizeProgressWithCourse(progress: CourseProgress, course: Course): CourseProgress {
    let hasChanges = false;
    let orphanedCount = 0;

    const synchronizedGroupsProgress = course.questionGroups.map((courseGroup, groupIndex) => {
        const groupProgress = progress.groupsProgress[groupIndex];

        if (!groupProgress) {
            // Entire group is missing - initialize it
            console.log(`Adding missing group: ${ courseGroup.name }`);
            hasChanges = true;
            return {
                groupName: courseGroup.name,
                totalQuestions: courseGroup.questions.length,
                questionsProgress: courseGroup.questions.map((question) => ({
                    questionId: question.id,
                    totalAttempts: 0,
                    correctAttempts: 0,
                    incorrectAttempts: 0,
                    consecutiveCorrect: 0,
                    consecutiveIncorrect: 0,
                    masteryLevel: MasteryLevel.NOT_STARTED,
                    hintUsedCount: 0,
                })),
                notStartedCount: courseGroup.questions.length,
                learningCount: 0,
                reviewingCount: 0,
                masteredCount: 0,
                completionPercentage: 0,
                averageAccuracy: 0,
            };
        }

        // Build set of valid question IDs from current course
        const currentQuestionIds = new Set(courseGroup.questions.map(q => q.id));

        // Filter out orphaned progress entries (questions that no longer exist or were altered)
        const validQuestionsProgress = groupProgress.questionsProgress.filter(qp => {
            const isValid = currentQuestionIds.has(qp.questionId);
            if (!isValid) {
                orphanedCount++;
                console.log(`Removing orphaned progress for question ID: ${ qp.questionId } in group: ${ courseGroup.name }`);
                hasChanges = true;
            }
            return isValid;
        });

        // Check for missing questions in this group
        const existingQuestionIds = new Set(validQuestionsProgress.map(qp => qp.questionId));
        const missingQuestions = courseGroup.questions.filter(q => !existingQuestionIds.has(q.id));

        if (missingQuestions.length > 0) {
            console.log(`Adding ${ missingQuestions.length } new question(s) to group: ${ courseGroup.name }`);
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
                totalQuestions: courseGroup.questions.length,
                notStartedCount: groupProgress.notStartedCount + missingQuestions.length,
            };
        }

        // Update total questions count if it's different or we removed orphaned entries
        if (groupProgress.totalQuestions !== courseGroup.questions.length || validQuestionsProgress.length !== groupProgress.questionsProgress.length) {
            hasChanges = true;
            return {
                ...groupProgress,
                questionsProgress: validQuestionsProgress,
                totalQuestions: courseGroup.questions.length,
            };
        }

        return groupProgress;
    });

    if (hasChanges) {
        if (orphanedCount > 0) {
            console.log(`Progress synchronized: Removed ${ orphanedCount } orphaned progress entry(ies) from altered/removed questions`);
        } else {
            console.log('Progress synchronized with current course data');
        }

        const totalQuestions = course.questionGroups.reduce((sum, group) => sum + group.questions.length, 0);

        return {
            ...progress,
            groupsProgress: synchronizedGroupsProgress,
            totalQuestions,
            totalQuestionGroups: course.questionGroups.length,
        };
    }

    return progress;
}

