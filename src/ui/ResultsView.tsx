import * as React from "react";
import { ExamResult } from "../types/types";

interface Props {
    result: ExamResult;
    onClose: () => void;
    onReview: () => void;
}

export const ResultsView: React.FC<Props> = ({ result, onClose, onReview }) => {
    return (
        <div className="exam-results" style={{ padding: '2rem', height: '100%', overflowY: 'auto' }}>
            <div className="results-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2.5em', margin: '0' }}>{Math.round(result.percentage)}%</h1>
                <h2 style={{
                    color: result.isPass ? 'var(--color-green)' : 'var(--color-red)',
                    marginTop: '0.5rem'
                }}>
                    {result.isPass ? "PASSED" : "FAILED"}
                </h2>
                <div style={{ color: 'var(--text-muted)' }}>
                    Score: {result.totalScore} / {result.maxScore} points • Time: {Math.floor(result.durationSeconds / 60)}m {Math.floor(result.durationSeconds % 60)}s
                </div>
            </div>

            <div className="results-questions-list">
                <h3>Question Breakdown</h3>
                {result.questionResults.map((qr, idx) => {
                    return (
                        <div
                            key={idx}
                            style={{
                                border: '1px solid var(--background-modifier-border)',
                                padding: '1rem',
                                marginBottom: '1rem',
                                borderRadius: '6px',
                                borderLeft: `5px solid ${qr.isCorrect ? 'var(--color-green)' : 'var(--color-red)'}`
                            }}
                        >
                            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Question {idx + 1}</div>
                            <div>Status: <span style={{ color: qr.isCorrect ? 'var(--color-green)' : 'var(--color-red)' }}>{qr.isCorrect ? "Correct" : "Incorrect"}</span></div>
                        </div>
                    );
                })}
            </div>

            <div className="results-actions" style={{ marginTop: '2rem', textAlign: 'center', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button
                    onClick={onReview}
                    style={{ padding: '0.8rem 2rem', fontSize: '1.2em' }}
                >
                    Review Answers
                </button>
                <button
                    onClick={onClose}
                    className="mod-cta"
                    style={{ padding: '0.8rem 2rem', fontSize: '1.2em' }}
                >
                    Close Exam
                </button>
            </div>
        </div>
    );
};
