import * as React from "react";
import { MultipleChoiceQuestion, UserAnswerState } from "../../types/types";

interface Props {
    question: MultipleChoiceQuestion;
    answer: UserAnswerState;
    onChange: (ans: Partial<UserAnswerState>) => void;
    readOnly?: boolean;
    showResult?: boolean;
}

export const MultipleChoice: React.FC<Props> = ({ question, answer, onChange, readOnly, showResult }) => {
    // Safety check with type casting to satisfy TS
    const safeAnswer = answer || { status: 'UNANSWERED' } as UserAnswerState;

    return (
        <div className="question-mc">
            <div className="question-text" style={{ marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>
                {question.questionText}
            </div>
            <div className="options-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {question.options.map((opt, idx) => {
                    const isSelected = safeAnswer.selectedOptionIndex === idx;
                    const isCorrect = question.correctOptionIndex === idx;

                    let borderColor = 'var(--background-modifier-border)';
                    let bgColor = 'transparent';

                    if (showResult) {
                        if (isCorrect) {
                            borderColor = 'var(--color-green)';
                            bgColor = 'rgba(var(--color-green-rgb), 0.1)';
                        } else if (isSelected && !isCorrect) {
                            borderColor = 'var(--color-red)';
                            bgColor = 'rgba(var(--color-red-rgb), 0.1)';
                        }
                    } else if (isSelected) {
                        borderColor = 'var(--interactive-accent)';
                        bgColor = 'var(--interactive-accent-opacity)';
                    }

                    return (
                        <div
                            key={idx}
                            className={`option-item ${isSelected ? 'selected' : ''}`}
                            onClick={() => !readOnly && !showResult && onChange({ selectedOptionIndex: idx })}
                            style={{
                                padding: '1rem',
                                border: `1px solid ${borderColor}`,
                                borderRadius: '6px',
                                cursor: (readOnly || showResult) ? 'default' : 'pointer',
                                backgroundColor: bgColor
                            }}
                        >
                            <span style={{ fontWeight: 'bold', marginRight: '0.5rem' }}>
                                {String.fromCharCode(97 + idx)})
                            </span>
                            {opt}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
