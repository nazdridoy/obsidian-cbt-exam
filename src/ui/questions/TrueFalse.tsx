import * as React from "react";
import { TrueFalseQuestion, UserAnswerState } from "../../types/types";

interface Props {
    question: TrueFalseQuestion;
    answer: UserAnswerState;
    onChange: (ans: Partial<UserAnswerState>) => void;
    readOnly?: boolean;
    showResult?: boolean;
}

export const TrueFalse: React.FC<Props> = ({ question, answer, onChange, readOnly, showResult }) => {
    return (
        <div className="question-tf">
            <div className="question-text" style={{ marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>
                {question.questionText}
            </div>
            <div className="options-list" style={{ display: 'flex', gap: '1rem' }}>
                {[true, false].map((val) => {
                    const isSelected = answer.booleanSelection === val;
                    const isCorrect = question.isTrue === val;

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
                            key={val.toString()}
                            className={`option-item ${isSelected ? 'selected' : ''}`}
                            onClick={() => !readOnly && !showResult && onChange({ booleanSelection: val })}
                            style={{
                                flex: 1,
                                padding: '1rem',
                                textAlign: 'center',
                                border: `1px solid ${borderColor}`,
                                borderRadius: '6px',
                                cursor: (readOnly || showResult) ? 'default' : 'pointer',
                                backgroundColor: bgColor
                            }}
                        >
                            {val ? "True" : "False"}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
