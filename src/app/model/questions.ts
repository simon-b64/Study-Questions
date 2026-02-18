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
    question: Question[];
}

export interface Question {
    question: string;
    hint: string; // Ein hilfreicher Hinweis zur Lösung
    answers: Answer[];
    reason: string; // Eine kurze Erklärung, warum die Antwort richtig ist
}

export interface Answer {
    text: string; // Muss "Ja" oder "Nein" sein
    correct: boolean;
}
