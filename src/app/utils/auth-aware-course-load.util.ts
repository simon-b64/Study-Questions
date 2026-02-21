import { effect, signal } from '@angular/core';
import { CourseMetadata } from '../model/questions';
import { CourseStore } from '../store/course-store';
import { AuthStore } from '../store/auth-store';

/**
 * Sets up the auth-aware course loading pattern used in both
 * CourseOverviewView and QuestionView.
 *
 * Waits until the auth state is resolved (not loading), then calls
 * courseStore.loadCourse() with the provided metadata.
 *
 * Returns the `pendingMetadata` signal so the caller can set it in ngOnInit.
 *
 * Must be called in an injection context (constructor or field initializer).
 */
export function setupAuthAwareCourseLoad(
    courseStore: InstanceType<typeof CourseStore>,
    authStore: InstanceType<typeof AuthStore>,
): ReturnType<typeof signal<CourseMetadata | null>> {
    const pendingMetadata = signal<CourseMetadata | null>(null);

    effect(() => {
        const metadata = pendingMetadata();
        if (!metadata || authStore.isLoading()) return;
        courseStore.loadCourse(metadata);
    });

    return pendingMetadata;
}


