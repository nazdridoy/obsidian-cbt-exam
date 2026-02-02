import * as React from "react";
import { TextAnswerQuestion, UserAnswerState } from "../../types/types";

interface Props {
    question: TextAnswerQuestion;
    answer: UserAnswerState;
    onChange: (ans: Partial<UserAnswerState>) => void;
    readOnly?: boolean;
    showResult?: boolean;
}

export const ShortLongAnswer: React.FC<Props> = ({ question, answer, onChange, readOnly, showResult }) => {
    const val = (answer.textInputs && answer.textInputs[0]) || "";

    const handleChange = (txt: string) => {
        onChange({ textInputs: [txt] });
    };

    const isLong = question.type === 'LA';

    return (
        <div className="question-text-answer">
            <div className="question-text" style={{ marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>
                {question.questionText}
            </div>

            {isLong ? (
                <textarea
                    rows={6}
                    value={val}
                    disabled={readOnly || showResult}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder="Type your answer here..."
                    style={{ width: '100%', padding: '0.8rem', resize: 'vertical' }}
                />
            ) : (
                <input
                    type="text"
                    value={val}
                    disabled={readOnly || showResult}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder="Type your answer here..."
                    style={{ width: '100%', padding: '0.8rem' }}
                />
            )}

            {showResult && question.correctAnswerText && (
                <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid var(--color-green)', borderRadius: '6px', backgroundColor: 'rgba(var(--color-green-rgb), 0.1)' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--color-green)' }}>Correct Answer / Reference:</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{question.correctAnswerText}</div>
                </div>
            )}
        </div>
    );
};
