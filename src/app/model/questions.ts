interface Course {
    questionGroups: QuestionGroup[];
}
interface QuestionGroup {
    name: string; // Hier kannst du das Thema der Folien eintragen
    question: Question[];
}
interface Question {
    question: string;
    hint: string; // Ein hilfreicher Hinweis zur Lösung
    answers: Answer[];
    reason: string; // Eine kurze Erklärung, warum die Antwort richtig ist
}
interface Answer {
    text: string; // Muss "Ja" oder "Nein" sein
    correct: boolean;
}
