import { Course } from '../model/questions';

/**
 * Generates a simple hash of the course structure for validation.
 * This hash is used to detect when course data has changed (questions added/removed/modified).
 *
 * @param course The course object to hash
 * @returns A base-36 string representing the course structure hash
 */
export function generateCourseHash(course: Course): string {
    // Create a stable string representation of the course structure
    const str = JSON.stringify({
        groupCount: course.questionGroups.length,
        groups: course.questionGroups.map(g => ({
            name: g.name,
            questionCount: g.question.length
        }))
    });

    // Generate simple hash using bit manipulation
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    return hash.toString(36);
}

/**
 * Generates a SHA-256 hash of the course structure (async version).
 * More secure but slower than the simple hash.
 *
 * @param course The course object to hash
 * @returns A promise that resolves to a 64-character hex string
 */
export async function generateCourseHashAsync(course: Course): Promise<string> {
    // Create a stable string representation of the course structure
    const courseString = JSON.stringify({
        groupCount: course.questionGroups.length,
        groups: course.questionGroups.map(g => ({
            name: g.name,
            questionCount: g.question.length,
            questions: g.question.map(q => ({
                question: q.question,
                answerCount: q.answers.length
            }))
        }))
    });

    // Generate hash using SubtleCrypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(courseString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

