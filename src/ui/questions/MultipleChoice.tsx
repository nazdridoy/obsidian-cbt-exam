import * as React from "react";
import { App } from "obsidian";
import { MultipleChoiceQuestion, UserAnswerState } from "../../types/types";
import { MarkdownContent } from "../components/MarkdownContent";

interface Props {
    question: MultipleChoiceQuestion;
    answer: UserAnswerState;
    onChange: (ans: Partial<UserAnswerState>) => void;
    readOnly?: boolean;
    showResult?: boolean;
    app: App;
}

export const MultipleChoice: React.FC<Props> = ({ question, answer, onChange, readOnly, showResult, app }) => {
    // Safety check with default values
    const safeAnswer = answer ?? { status: 'UNANSWERED', questionId: '' };

    return (
        <div className="question-mc">
            <div className="question-text" style={{ marginBottom: '1rem' }}>
                <MarkdownContent app={app} content={question.questionText} />
            </div>
            <div className="options-list">
                {question.options.map((opt, idx) => {
                    const isSelected = safeAnswer.selectedOptionIndex === idx;
                    const isCorrect = question.correctOptionIndex === idx;

                    let statusClass = "";

                    if (showResult) {
                        if (isCorrect) {
                            statusClass = "correct";
                        } else if (isSelected && !isCorrect) {
                            statusClass = "incorrect";
                        }
                    } else if (isSelected) {
                        statusClass = "selected";
                    }

                    return (
                        <div
                            key={idx}
                            className={`option-item ${statusClass}`}
                            onClick={() => !readOnly && !showResult && onChange({ selectedOptionIndex: idx })}
                        >
                            <span style={{ fontWeight: 'bold', marginRight: '0.5rem' }}>
                                {String.fromCharCode(97 + idx)})
                            </span>
                            <div style={{ flex: 1 }}>
                                <MarkdownContent app={app} content={opt} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

