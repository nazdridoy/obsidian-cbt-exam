import * as React from "react";
import { AnswerStatus, ExamResult } from "../../types/types";

interface NavProps {
    total: number;
    current: number;
    answers: Record<string, { status: AnswerStatus, isMarked?: boolean }>;
    questionIds: string[];
    onNavigate: (index: number) => void;
    examResult?: ExamResult | null;
}

export const QuestionNav: React.FC<NavProps> = ({ total: _total, current, answers, questionIds, onNavigate, examResult }) => {
    return (
        <div className="exam-nav-grid">
            {questionIds.map((qid, idx) => {
                const status = answers[qid]?.status || 'UNANSWERED';

                // Check for review mode / result availability
                let isIncorrect = false;
                let isCorrect = false;
                let isUnanswered = false;
                if (examResult) {
                    const qr = examResult.questionResults.find(r => r.questionId === qid);
                    if (qr) {
                        if (qr.isCorrect) isCorrect = true;
                        else if (qr.userAnswer.status === 'UNANSWERED') isUnanswered = true;
                        else isIncorrect = true;
                    } else {
                        isUnanswered = true;
                    }
                }

                let statusClass = "unanswered";
                if (idx === current) statusClass = "current";
                else if (isIncorrect) statusClass = "incorrect";
                else if (isCorrect) statusClass = "correct";
                else if (isUnanswered) statusClass = "unanswered";
                else if (status === 'ANSWERED') statusClass = "answered";
                else if (status === 'FLAGGED') statusClass = "flagged";

                return (
                    <button
                        key={qid}
                        onClick={() => onNavigate(idx)}
                        className={`nav-button ${statusClass}`}
                    >
                        {idx + 1}
                        {answers[qid]?.isMarked && (
                            <div className="nav-button-mark-dot" />
                        )}
                    </button>
                );
            })}
        </div>
    );
};
