import { ExamDefinition, ExamSession, UserAnswerState } from "../types/types";

export class ExamSessionManager {
    private session: ExamSession;

    constructor(definition: ExamDefinition) {
        this.session = {
            definition: definition,
            status: 'IDLE',
            startTime: 0,
            timeLimitSeconds: (definition.metadata.timeLimitMinutes || 0) * 60,
            currentQuestionIndex: 0,
            answers: {}
        };
    }

    public start(): ExamSession {
        this.session.status = 'IN_PROGRESS';
        this.session.startTime = Date.now();

        // Shuffle questions if requested
        if (this.session.definition.metadata.shuffleQuestions) {
            this.shuffleArray(this.session.definition.questions);
        }

        // Initialize blank answers
        this.session.definition.questions.forEach(q => {
            this.session.answers[q.id] = {
                questionId: q.id,
                status: 'UNANSWERED'
            };
        });
        return { ...this.session };
    }

    private shuffleArray(array: any[]) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    public answerQuestion(questionId: string, answer: Partial<UserAnswerState>): ExamSession {
        if (this.session.status !== 'IN_PROGRESS') return this.session;

        const currentAns = this.session.answers[questionId];
        this.session.answers[questionId] = {
            ...currentAns,
            ...answer,
            status: 'ANSWERED' // simplified
        };
        return { ...this.session };
    }

    public toggleFlag(questionId: string): ExamSession {
        if (this.session.status !== 'IN_PROGRESS') return this.session;
        const current = this.session.answers[questionId];
        // Logic for flag usually separate but we can store it in status or separate field
        if (current.status === 'FLAGGED') current.status = 'ANSWERED'; // revert (simple toggle)
        else current.status = 'FLAGGED';

        return { ...this.session };
    }

    public setIndex(index: number): ExamSession {
        if (index >= 0 && index < this.session.definition.questions.length) {
            this.session.currentQuestionIndex = index;
        }
        return { ...this.session };
    }

    public submit(): ExamSession {
        this.session.status = 'SUBMITTED';
        this.session.endTime = Date.now();
        return { ...this.session };
    }

    public getSession(): ExamSession {
        return this.session;
    }

    public setStatus(status: ExamSession['status']): ExamSession {
        this.session.status = status;
        return { ...this.session };
    }
}
