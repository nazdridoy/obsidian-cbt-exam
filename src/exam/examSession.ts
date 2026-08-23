import { ExamDefinition, ExamResult, ExamSession, QuestionResult, UserAnswerState } from "../types/types";

const CBT_DRAFT_PREFIX = 'cbt-exam:draft:v1:';

export interface SessionDraft {
    version: 1;
    sourcePath: string;
    questionRange: string;
    savedAt: number;
    status: ExamSession['status'];
    startTime: number;
    endTime?: number;
    timeLimitSeconds: number;
    currentQuestionIndex: number;
    answers: Record<string, UserAnswerState>;
    isAdaptive?: boolean;
    aiRequestId?: string;
}

function getSessionDraftKey(sourcePath: string): string {
    return `${CBT_DRAFT_PREFIX}${sourcePath}`;
}

export function loadSessionDraft(sourcePath: string | undefined, definition: ExamDefinition): SessionDraft | null {
    if (!sourcePath || typeof globalThis.localStorage === 'undefined') return null;
    try {
        const raw = globalThis.localStorage.getItem(getSessionDraftKey(sourcePath));
        if (!raw) return null;
        const draft = JSON.parse(raw) as SessionDraft;
        const activeRange = definition.metadata.questionRange || '-';
        if (draft.version !== 1 || draft.sourcePath !== sourcePath || (draft.questionRange || '-') !== activeRange) return null;
        const validQids = new Set(definition.questions.map(q => q.id));
        if (Object.keys(draft.answers || {}).some(qid => !validQids.has(qid))) return null;
        return draft;
    } catch (e) {
        console.error('Failed to load CBT draft:', e);
        return null;
    }
}

export function saveSessionDraft(sourcePath: string | undefined, session: ExamSession): void {
    if (!sourcePath || typeof globalThis.localStorage === 'undefined') return;
    try {
        const draft: SessionDraft = {
            version: 1,
            sourcePath,
            questionRange: session.definition.metadata.questionRange || '-',
            savedAt: Date.now(),
            status: session.status,
            startTime: session.startTime,
            endTime: session.endTime,
            timeLimitSeconds: session.timeLimitSeconds,
            currentQuestionIndex: session.currentQuestionIndex,
            answers: session.answers,
            isAdaptive: session.isAdaptive,
            aiRequestId: session.aiRequestId,
        };
        globalThis.localStorage.setItem(getSessionDraftKey(sourcePath), JSON.stringify(draft));
    } catch (e) {
        console.error('Failed to save CBT draft:', e);
    }
}

export function clearSessionDraft(sourcePath: string | undefined): void {
    if (!sourcePath || typeof globalThis.localStorage === 'undefined') return;
    try {
        globalThis.localStorage.removeItem(getSessionDraftKey(sourcePath));
    } catch (e) {
        console.error('Failed to clear CBT draft:', e);
    }
}

export class ExamSessionManager {
    private session: ExamSession;

    constructor(definition: ExamDefinition, isAdaptive: boolean = false) {
        this.session = {
            definition: definition,
            status: 'IDLE',
            startTime: 0,
            timeLimitSeconds: (definition.metadata.timeLimitMinutes || 0) * 60,
            currentQuestionIndex: 0,
            answers: {},
            isAdaptive,
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

    private shuffleArray<T>(array: T[]): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    public answerQuestion(questionId: string, answer: Partial<UserAnswerState>): ExamSession {
        if (this.session.status !== 'IN_PROGRESS' && this.session.status !== 'REVIEW' && this.session.status !== 'AI_PENDING') return this.session;

        const currentAns = this.session.answers[questionId];
        this.session.answers[questionId] = {
            ...currentAns,
            ...answer,
            status: 'ANSWERED' // simplified
        };
        return { ...this.session };
    }

    public toggleMark(questionId: string): ExamSession {
        if (this.session.status === 'REVIEW' || this.session.status === 'SUBMITTED') return this.session;

        const current = this.session.answers[questionId];
        if (!current) return this.session;

        this.session.answers[questionId] = {
            ...current,
            isMarked: !current.isMarked
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

    public restoreDraft(draft: SessionDraft): ExamSession {
        this.session.status = draft.status || 'IN_PROGRESS';
        this.session.startTime = draft.startTime || Date.now();
        this.session.endTime = draft.endTime;
        this.session.timeLimitSeconds = draft.timeLimitSeconds || this.session.timeLimitSeconds;
        this.session.currentQuestionIndex = Math.min(
            Math.max(draft.currentQuestionIndex || 0, 0),
            Math.max(this.session.definition.questions.length - 1, 0)
        );
        this.session.answers = { ...(draft.answers || {}) };
        this.session.isAdaptive = !!draft.isAdaptive;
        this.session.aiRequestId = draft.aiRequestId;
        this.session.definition.questions.forEach(q => {
            if (!this.session.answers[q.id]) {
                this.session.answers[q.id] = { questionId: q.id, status: 'UNANSWERED' };
            }
        });
        return { ...this.session };
    }

    public setAiRequest(requestId: string): ExamSession {
        this.session.aiRequestId = requestId;
        this.session.status = 'AI_PENDING';
        return { ...this.session };
    }

    public applyAiDecisions(decisions: Array<{ qid: string; verdict: string; confidence: 'high' | 'medium' | 'low'; rationale: string }>): ExamSession {
        const byQid = new Map(decisions.map(item => [item.qid, item]));
        this.session.definition.questions.forEach(q => {
            const decision = byQid.get(q.id);
            if (!decision || (decision.verdict !== 'correct' && decision.verdict !== 'incorrect')) return;
            const current = this.session.answers[q.id];
            if (!current) return;
            this.session.answers[q.id] = {
                ...current,
                manualCorrect: decision.verdict === 'correct',
                gradingSource: 'ai',
                aiConfidence: decision.confidence,
                aiRationale: decision.rationale,
            };
        });
        this.session.status = 'REVIEW';
        return { ...this.session };
    }

    public loadFromResult(result: ExamResult): ExamSession {
        this.session.status = 'SUBMITTED';
        this.session.startTime = result.timestamp - (result.durationSeconds * 1000);
        this.session.endTime = result.timestamp;

        // Reconstruct answers
        this.session.answers = {};
        result.questionResults.forEach((qr: QuestionResult) => {
            this.session.answers[qr.questionId] = qr.userAnswer;
        });

        return { ...this.session };
    }
}
