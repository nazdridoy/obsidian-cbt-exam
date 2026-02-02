import * as React from "react";
import { FillInBlankQuestion, UserAnswerState } from "../../types/types";

interface Props {
    question: FillInBlankQuestion;
    answer: UserAnswerState;
    onChange: (ans: Partial<UserAnswerState>) => void;
    readOnly?: boolean;
    showResult?: boolean;
}

export const FillInBlank: React.FC<Props> = ({ question, answer, onChange, readOnly, showResult }) => {
    // Current answers, default to empty strings
    const values = answer.textInputs || new Array(question.correctAnswers.length).fill("");

    const handleChange = (idx: number, val: string) => {
        const newValues = [...values];
        newValues[idx] = val;
        onChange({ textInputs: newValues });
    };

    return (
        <div className="question-fib">
            <div className="question-content" style={{ fontSize: '1.1em', lineHeight: '2em' }}>
                {question.segments.map((seg, idx) => {
                    return (
                        <React.Fragment key={idx}>
                            <span>{seg}</span>
                            {idx < question.correctAnswers.length && (
                                <span style={{ position: 'relative', display: 'inline-block' }}>
                                    <input
                                        type="text"
                                        value={values[idx] || ""}
                                        disabled={readOnly || showResult}
                                        onChange={(e) => handleChange(idx, e.target.value)}
                                        placeholder="?"
                                        style={{
                                            border: 'none',
                                            borderBottom: `2px solid ${showResult ?
                                                (values[idx]?.toLowerCase().trim() === question.correctAnswers[idx]?.toLowerCase().trim() ? 'var(--color-green)' : 'var(--color-red)')
                                                : 'var(--interactive-accent)'}`,
                                            background: 'transparent',
                                            color: 'var(--text-normal)',
                                            width: '120px',
                                            textAlign: 'center',
                                            margin: '0 0.2rem',
                                            padding: '0 0.2rem'
                                        }}
                                    />
                                    {showResult && values[idx]?.toLowerCase().trim() !== question.correctAnswers[idx]?.toLowerCase().trim() && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            fontSize: '0.8em',
                                            color: 'var(--color-green)',
                                            whiteSpace: 'nowrap',
                                            background: 'var(--background-primary)',
                                            border: '1px solid var(--background-modifier-border)',
                                            padding: '2px 4px',
                                            borderRadius: '4px',
                                            zIndex: 10
                                        }}>
                                            {question.correctAnswers[idx]}
                                        </div>
                                    )}
                                </span>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};
