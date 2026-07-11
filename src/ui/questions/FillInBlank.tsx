import * as React from "react";
import { App } from "obsidian";
import { FillInBlankQuestion, UserAnswerState } from "../../types/types";
import { MarkdownContent } from "../components/MarkdownContent";

interface Props {
    question: FillInBlankQuestion;
    answer: UserAnswerState;
    onChange: (ans: Partial<UserAnswerState>) => void;
    readOnly?: boolean;
    showResult?: boolean;
    app: App;
}

export const FillInBlank: React.FC<Props> = ({ question, answer, onChange, readOnly, showResult, app }) => {
    // Current answers, default to empty strings
    const values: string[] = answer.textInputs || new Array<string>(question.correctAnswers.length).fill("");

    const handleChange = (idx: number, val: string) => {
        const newValues: string[] = [...values];
        newValues[idx] = val;
        onChange({ textInputs: newValues });
    };

    return (
        <div className="question-fib">
            <div className="fib-container">
                {question.segments.map((seg, idx) => {
                    return (
                        <React.Fragment key={idx}>
                            <MarkdownContent
                                app={app}
                                content={seg}
                                tagName="span"
                                className="inline-markdown"
                            />
                            {idx < question.correctAnswers.length && (
                                <span className="fib-input-wrapper">
                                    <input
                                        type="text"
                                        value={values[idx] || ""}
                                        disabled={readOnly || showResult}
                                        onChange={(e) => handleChange(idx, e.target.value)}
                                        placeholder="?"
                                        className={`fib-input ${showResult ?
                                            (values[idx]?.toLowerCase().trim() === question.correctAnswers[idx]?.toLowerCase().trim() ? 'correct' : 'incorrect')
                                            : ''}`}
                                    />
                                    {showResult && values[idx]?.toLowerCase().trim() !== question.correctAnswers[idx]?.toLowerCase().trim() && (
                                        <div className="fib-answer-popover">
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

