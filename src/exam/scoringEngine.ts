import { ExamDefinition, ExamResult, ExamSession, Question, QuestionResult, UserAnswerState } from "../types/types";

export class ScoringEngine {

    public static calculateScore(session: ExamSession): ExamResult {
        const questions = session.definition.questions;
        let totalScore = 0;
        const maxScore = questions.length; // 1 point per question for now
        const results: QuestionResult[] = [];

        questions.forEach(q => {
            const userAnswer = session.answers[q.id];
            const result = this.gradeQuestion(q, userAnswer);

            results.push(result);
            totalScore += result.score;
        });

        const percentage = (totalScore / maxScore) * 100;
        const threshold = (session.definition.metadata.passThreshold ?? 0.70) * 100;
        const isPass = percentage >= threshold;

        return {
            sessionId: Math.random().toString(36), // placeholder
            timestamp: Date.now(),
            totalScore,
            maxScore,
            percentage,
            isPass,
            durationSeconds: (Date.now() - session.startTime) / 1000,
            questionResults: results
        };
    }

    private static gradeQuestion(q: Question, answer: UserAnswerState | undefined): QuestionResult {
        const baseResult: QuestionResult = {
            questionId: q.id,
            isCorrect: false,
            score: 0,
            userAnswer: answer || { questionId: q.id, status: 'UNANSWERED' }
        };

        if (!answer || answer.status === 'UNANSWERED') {
            return baseResult;
        }

        let isCorrect = false;

        switch (q.type) {
            case 'MC':
                if (answer.selectedOptionIndex === q.correctOptionIndex) isCorrect = true;
                break;

            case 'SATA':
                // Strict grading: match exact set
                if (answer.selectedOptionIndices && q.correctOptionIndices) {
                    const userSet = new Set(answer.selectedOptionIndices);
                    const correctSet = new Set(q.correctOptionIndices);
                    if (userSet.size === correctSet.size && [...userSet].every(x => correctSet.has(x))) {
                        isCorrect = true;
                    }
                }
                break;

            case 'TF':
                if (answer.booleanSelection === q.isTrue) isCorrect = true;
                break;

            case 'MATCH':
                // Check all pairs
                if (answer.matchedPairs && q.pairs) {
                    // map correct pairs for easy lookup: leftIndex -> rightIndex
                    const correctMap = new Map<number, number>();
                    q.pairs.forEach(p => correctMap.set(p.left, p.right));

                    // Check if every user pair matches the correct map
                    // And user matched ALL pairs
                    if (answer.matchedPairs.length === q.pairs.length) {
                        const allMatch = answer.matchedPairs.every(up => correctMap.get(up.l) === up.r);
                        if (allMatch) isCorrect = true;
                    }
                }
                break;

            case 'FIB':
                if (answer.textInputs && q.correctAnswers) {
                    // Case insensitive match for each blank
                    if (answer.textInputs.length === q.correctAnswers.length) {
                        const allMatch = answer.textInputs.every((val, idx) =>
                            val.trim().toLowerCase() === q.correctAnswers[idx].trim().toLowerCase()
                        );
                        if (allMatch) isCorrect = true;
                    }
                }
                break;

            case 'SA':
            case 'LA':
                // Simple grading: correct if any non-empty input is provided
                if (answer.textInputs && answer.textInputs[0] && answer.textInputs[0].trim().length > 0) {
                    isCorrect = true;
                }
                break;
        }

        baseResult.isCorrect = isCorrect;
        baseResult.score = isCorrect ? 1 : 0;
        return baseResult;
    }
}
