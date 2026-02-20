/** Maps course route IDs to their display names. */
export const COURSE_NAMES: Record<string, string> = {
    'daten-informatikrecht': 'Daten und Informatikrecht',
};

export function getCourseName(courseId: string): string {
    return COURSE_NAMES[courseId] ?? courseId;
}

