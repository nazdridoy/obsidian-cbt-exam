import * as React from "react";
import { App } from "obsidian";
import { SelectAllQuestion, UserAnswerState } from "../../types/types";
import { MarkdownContent } from "../components/MarkdownContent";

interface Props {
    question: SelectAllQuestion;
    answer: UserAnswerState;
    onChange: (ans: Partial<UserAnswerState>) => void;
    readOnly?: boolean;
    showResult?: boolean;
    app: App;
}

export const SelectAll: React.FC<Props> = ({ question, answer, onChange, readOnly, showResult, app }) => {
    const safeAnswer = answer ?? { status: 'UNANSWERED', questionId: '' };
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
            <div className="question-text" style={{ marginBottom: '1rem' }}>
                <MarkdownContent app={app} content={question.questionText} />
                <div style={{ fontSize: '0.8em', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    (Select all that apply)
                </div>
            </div>
            <div className="options-list">
                {question.options.map((opt, idx) => {
                    const isSelected = selectedIndices.has(idx);
                    const isCorrect = question.correctOptionIndices.includes(idx);

                    let statusClass = "";

                    if (showResult) {
                        // Correct option: Green
                        if (isCorrect) {
                            statusClass = "correct";
                        }
                        // Selected but wrong: Red
                        else if (isSelected && !isCorrect) {
                            statusClass = "incorrect";
                        }
                    } else if (isSelected) {
                        statusClass = "selected";
                    }

                    return (
                        <div
                            key={idx}
                            className={`option-item ${statusClass}`}
                            onClick={() => toggle(idx)}
                        >
                            <input
                                type="checkbox"
                                checked={isSelected}
                                readOnly
                                style={{ marginRight: '0.5rem' }}
                            />
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

