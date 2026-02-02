import * as React from "react";
import { SelectAllQuestion, UserAnswerState } from "../../types/types";

interface Props {
    question: SelectAllQuestion;
    answer: UserAnswerState;
    onChange: (ans: Partial<UserAnswerState>) => void;
    readOnly?: boolean;
    showResult?: boolean;
}

export const SelectAll: React.FC<Props> = ({ question, answer, onChange, readOnly, showResult }) => {
    const safeAnswer = answer || { status: 'UNANSWERED' } as UserAnswerState;
    const selectedIndices = new Set(safeAnswer.selectedOptionIndices || []);

    const toggle = (idx: number) => {
        if (readOnly || showResult) return;
        const newSet = new Set(selectedIndices);
        if (newSet.has(idx)) newSet.delete(idx);
        else newSet.add(idx);
        onChange({ selectedOptionIndices: Array.from(newSet).sort() });
    };

    return (
        <div className="question-sata">
            <div className="question-text" style={{ marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>
                {question.questionText}
                <div style={{ fontSize: '0.8em', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    (Select all that apply)
                </div>
            </div>
            <div className="options-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {question.options.map((opt, idx) => {
                    const isSelected = selectedIndices.has(idx);
                    const isCorrect = question.correctOptionIndices.includes(idx);

                    let borderColor = 'var(--background-modifier-border)';
                    let bgColor = 'transparent';

                    if (showResult) {
                        // Correct option: Green
                        if (isCorrect) {
                            borderColor = 'var(--color-green)';
                            bgColor = 'rgba(var(--color-green-rgb), 0.1)';
                        }
                        // Selected but wrong: Red
                        else if (isSelected && !isCorrect) {
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
                            onClick={() => toggle(idx)}
                            style={{
                                padding: '1rem',
                                border: `1px solid ${borderColor}`,
                                borderRadius: '6px',
                                cursor: (readOnly || showResult) ? 'default' : 'pointer',
                                backgroundColor: bgColor
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={isSelected}
                                readOnly
                                style={{ marginRight: '0.5rem' }}
                            />
                            {opt}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
