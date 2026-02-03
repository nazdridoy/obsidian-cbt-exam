import * as React from "react";
import { App } from "obsidian";
import { TrueFalseQuestion, UserAnswerState } from "../../types/types";
import { MarkdownContent } from "../components/MarkdownContent";

interface Props {
    question: TrueFalseQuestion;
    answer: UserAnswerState;
    onChange: (ans: Partial<UserAnswerState>) => void;
    readOnly?: boolean;
    showResult?: boolean;
    app: App;
}

export const TrueFalse: React.FC<Props> = ({ question, answer, onChange, readOnly, showResult, app }) => {
    return (
        <div className="question-tf">
            <div className="question-text" style={{ marginBottom: '1rem' }}>
                <MarkdownContent app={app} content={question.questionText} />
            </div>
            <div className="options-list">
                {[true, false].map((val) => {
                    const isSelected = answer.booleanSelection === val;
                    const isCorrect = question.isTrue === val;

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
                            key={val.toString()}
                            className={`option-item ${statusClass}`}
                            onClick={() => !readOnly && !showResult && onChange({ booleanSelection: val })}
                            style={{
                                flex: 1,
                                textAlign: 'center',
                                display: 'block' // Since base option-item is flex
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

