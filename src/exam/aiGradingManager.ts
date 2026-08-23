import { App, TFile } from 'obsidian';
import { ExamResult, ExamSession } from '../types/types';

const AI_GRADING_ROOT = 'exam/practice/cbt/ai-grading';

export type AiVerdict = 'correct' | 'incorrect' | 'manual-review';
export type AiConfidence = 'high' | 'medium' | 'low';

export interface AiGradingDecision {
    qid: string;
    verdict: AiVerdict;
    confidence: AiConfidence;
    rationale: string;
}

export interface AiGradingResult {
    type: 'cbt-ai-grading-result';
    schemaVersion: '1.0';
    requestId: string;
    decisions: AiGradingDecision[];
}

export interface AiGradingRequest {
    type: 'cbt-ai-grading-request';
    schemaVersion: '1.0';
    requestId: string;
    status: 'pending';
    sourcePath: string;
    questionRange: string;
    submittedAt: number;
    durationSeconds: number;
    resultPath: string;
    instructions: string;
    questions: Array<{
        qid: string;
        order?: number;
        type: 'SA' | 'LA';
        label: string;
        questionText: string;
        referenceAnswer: string;
        studentAnswer: string;
        existingManualCorrect: boolean | null;
    }>;
}

export class AIGradingManager {
    constructor(private readonly app: App) {}

    private makeRequestId(sourcePath: string): string {
        const fileName = sourcePath.split('/').pop() || 'cbt';
        const slug = fileName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'cbt';
        return `${slug}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }

    private getRequestPath(requestId: string): string {
        return `${AI_GRADING_ROOT}/requests/${requestId}.json`;
    }

    private getResultPath(requestId: string): string {
        return `${AI_GRADING_ROOT}/results/${requestId}.json`;
    }

    private async ensureFolder(folderPath: string): Promise<void> {
        const parts = folderPath.split('/').filter(Boolean);
        let current = '';
        for (const part of parts) {
            current = current ? `${current}/${part}` : part;
            if (!this.app.vault.getAbstractFileByPath(current)) {
                try {
                    await this.app.vault.createFolder(current);
                } catch (e) {
                    if (!this.app.vault.getAbstractFileByPath(current)) throw e;
                }
            }
        }
    }

    public async createRequest(sourcePath: string, session: ExamSession, result: ExamResult): Promise<AiGradingRequest> {
        const requestId = this.makeRequestId(sourcePath);
        await this.ensureFolder(`${AI_GRADING_ROOT}/requests`);
        await this.ensureFolder(`${AI_GRADING_ROOT}/results`);

        const questions = session.definition.questions
            .filter((q): q is Extract<typeof q, { type: 'SA' | 'LA' }> => {
                if (q.type !== 'SA' && q.type !== 'LA') return false;
                const answer = session.answers[q.id];
                return !!answer?.textInputs?.[0]?.trim();
            })
            .map(q => {
                const answer = session.answers[q.id];
                return {
                    qid: q.id,
                    order: q.order,
                    type: q.type,
                    label: q.label || '',
                    questionText: q.questionText || '',
                    referenceAnswer: q.correctAnswerText || '',
                    studentAnswer: answer.textInputs[0],
                    existingManualCorrect: typeof answer.manualCorrect === 'boolean' ? answer.manualCorrect : null,
                };
            });

        const payload: AiGradingRequest = {
            type: 'cbt-ai-grading-request',
            schemaVersion: '1.0',
            requestId,
            status: 'pending',
            sourcePath,
            questionRange: session.definition.metadata.questionRange || '-',
            submittedAt: result.timestamp,
            durationSeconds: result.durationSeconds,
            resultPath: this.getResultPath(requestId),
            instructions: 'Grade only the listed written responses. Return correct, incorrect, or manual-review with confidence and a concise evidence-based rationale. Do not edit CBT History.',
            questions,
        };

        await this.app.vault.create(this.getRequestPath(requestId), `${JSON.stringify(payload, null, 2)}\n`);
        return payload;
    }

    public async loadResult(requestId: string): Promise<AiGradingResult | null> {
        const file = this.app.vault.getAbstractFileByPath(this.getResultPath(requestId));
        if (!(file instanceof TFile)) return null;

        const result = JSON.parse(await this.app.vault.read(file)) as AiGradingResult;
        if (result.type !== 'cbt-ai-grading-result' || result.schemaVersion !== '1.0' || result.requestId !== requestId || !Array.isArray(result.decisions)) {
            throw new Error('Invalid AI grading result schema');
        }

        const allowedVerdicts = new Set<AiVerdict>(['correct', 'incorrect', 'manual-review']);
        const allowedConfidence = new Set<AiConfidence>(['high', 'medium', 'low']);
        for (const decision of result.decisions) {
            if (!decision.qid || !allowedVerdicts.has(decision.verdict) || !allowedConfidence.has(decision.confidence) || typeof decision.rationale !== 'string' || !decision.rationale.trim()) {
                throw new Error(`Invalid AI grading decision for ${decision.qid || 'unknown QID'}`);
            }
        }
        return result;
    }
}
