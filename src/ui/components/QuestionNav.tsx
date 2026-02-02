import * as React from "react";
import { AnswerStatus } from "../../types/types";

interface NavProps {
    total: number;
    current: number;
    answers: Record<string, { status: AnswerStatus }>;
    questionIds: string[];
    onNavigate: (index: number) => void;
}

export const QuestionNav: React.FC<NavProps> = ({ total, current, answers, questionIds, onNavigate }) => {
    return (
        <div className="exam-nav-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(30px, 1fr))', gap: '5px' }}>
            {questionIds.map((qid, idx) => {
                const status = answers[qid]?.status || 'UNANSWERED';
                let bg = 'var(--background-secondary)';
                if (idx === current) bg = 'var(--interactive-accent)';
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
