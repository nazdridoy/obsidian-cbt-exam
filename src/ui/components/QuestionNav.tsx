import * as React from "react";
import { AnswerStatus, ExamResult } from "../../types/types";

interface NavProps {
    total: number;
    current: number;
    answers: Record<string, { status: AnswerStatus }>;
    questionIds: string[];
    onNavigate: (index: number) => void;
    examResult?: ExamResult | null;
}

export const QuestionNav: React.FC<NavProps> = ({ total, current, answers, questionIds, onNavigate, examResult }) => {
    return (
        <div className="exam-nav-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(30px, 1fr))', gap: '5px' }}>
            {questionIds.map((qid, idx) => {
                const status = answers[qid]?.status || 'UNANSWERED';
                let bg = 'var(--background-secondary)';

                // Check for review mode / result availability
                let isIncorrect = false;
                let isCorrect = false;
                if (examResult) {
                    const qr = examResult.questionResults.find(r => r.questionId === qid);
                    if (qr) {
                        if (qr.isCorrect) isCorrect = true;
                        else isIncorrect = true;
                    } else {
                        // Fallback if result for question is missing
                        isIncorrect = true;
                    }
                }

                if (idx === current) bg = 'var(--interactive-accent)';
                else if (isIncorrect) bg = 'var(--color-red)';
                else if (isCorrect) bg = 'var(--color-green)';
                else if (status === 'ANSWERED') bg = 'var(--interactive-accent-hover)';
                else if (status === 'FLAGGED') bg = 'var(--text-warning)';

                return (
                    <button
                        key={qid}
                        onClick={() => onNavigate(idx)}
                        style={{ backgroundColor: bg, border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-normal)' }}
                    >
                        {idx + 1}
                    </button>
                );
            })}
        </div>
    );
};
