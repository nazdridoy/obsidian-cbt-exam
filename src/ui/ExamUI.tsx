import * as React from "react";
import { App } from "obsidian";
import { ExamDefinition, ExamSession, UserAnswerState, ExamResult, Question } from "../types/types";
import { ExamSessionManager } from "../exam/examSession";
import { ScoringEngine } from "../exam/scoringEngine";
import { TimerDisplay } from "./components/Timer";
import { QuestionNav } from "./components/QuestionNav";
import { ResultsView } from "./ResultsView";

// Types
import { MultipleChoice } from "./questions/MultipleChoice";
import { SelectAll } from "./questions/SelectAll";
import { TrueFalse } from "./questions/TrueFalse";
import { Matching } from "./questions/Matching";
import { FillInBlank } from "./questions/FillInBlank";
import { ShortLongAnswer } from "./questions/ShortLongAnswer";

export const ExamUI: React.FC<{ definition: ExamDefinition, onClose: () => void, app: App, sourcePath?: string }> = ({ definition, onClose, app, sourcePath }) => {
    // We use a ref to hold the manager, but state to force re-renders
    const managerRef = React.useRef(new ExamSessionManager(definition));
    const [session, setSession] = React.useState<ExamSession>(managerRef.current.getSession());
    const [result, setResult] = React.useState<ExamResult | null>(null);
    const [showCurrentAnswer, setShowCurrentAnswer] = React.useState(false); // New state for showing answer

    const handleSubmit = React.useCallback(() => {
        // Calculate score
        const finalSession = managerRef.current.submit();
        setSession(finalSession);
        const res = ScoringEngine.calculateScore(finalSession);
        setResult(res);
    }, []);

    React.useEffect(() => {
        console.debug("ExamUI Mounted. Definition:", definition);
        // Start exam on mount
        const s = managerRef.current.start();
        console.debug("Session started:", s);
        setSession(s);
    }, [definition]);

    if (!session) {
        return <div>Initializing session...</div>;
    }

    const handleAnswer = (ans: Partial<UserAnswerState>) => {
        const qId = session.definition.questions[session.currentQuestionIndex].id;
        setSession(managerRef.current.answerQuestion(qId, ans));
    };

    const handleNavigate = (idx: number) => {
        setSession(managerRef.current.setIndex(idx));
        // Only reset "Show Answer" toggle if not in review mode
        if (session.status !== 'REVIEW') {
            setShowCurrentAnswer(false);
        }
    };



    const handleReview = () => {
        // Switch to review mode
        // We can treat REVIEW as a status in session, or just navigate back to Q1 and hide result view
        // We might need to update the session status to REVIEW if we want specific logic
        // Update the manager's status so subsequent calls (like setIndex) preserve it
        managerRef.current.setStatus('REVIEW');
        managerRef.current.setIndex(0); // Reset index

        // We need to re-fetch session after setIndex, or just manually compose
        // But since we modified internal state of manager, setIndex(0) should return correct status now if we fixed manager?
        // Actually setIndex just copies this.session. So if we updated this.session.status, setIndex will return it correctly.
        setSession(managerRef.current.setIndex(0));

        setResult(null); // Clear result to show question view
    };

    // View Switching
    if (result) {
        return <ResultsView result={result} onClose={onClose} onReview={handleReview} />;
    }

    const currentQ = session.definition.questions[session.currentQuestionIndex];
    if (!currentQ) return <div>Loading...</div>; // Safety

    const currentAns = session.answers[currentQ.id];

    // Determine if we should show the result/answer for this question
    // in REVIEW mode, OR if the user clicked "Show Answer" (only allowed if not in review and enabled in metadata)
    const isReviewMode = session.status === 'REVIEW';
    const canShowAnswer = !isReviewMode && definition.metadata.showAnswer;
    const shouldShowResult = isReviewMode || showCurrentAnswer;

    return (
        <div className="exam-ui-layout">
            {/* Header */}
            <div className="exam-header">
                <div style={{ fontWeight: 'bold' }}>{definition.title}</div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {/* Show Answer Toggle - Only if enabled and not in review */}
                    {canShowAnswer && (
                        <button onClick={() => setShowCurrentAnswer(!showCurrentAnswer)}>
                            {showCurrentAnswer ? "Hide answer" : "Show answer"}
                        </button>
                    )}
                    <TimerDisplay seconds={session.timeLimitSeconds} onExpire={handleSubmit} />
                </div>
            </div>

            {/* Main Content */}
            <div className="exam-body">
                <div style={{ marginBottom: '0rem', color: 'var(--text-muted)' }}>
                    Question {session.currentQuestionIndex + 1} of {definition.questions.length}
                </div>

                {renderQuestion(currentQ, currentAns, handleAnswer, app, shouldShowResult)}
            </div>

            {/* Footer */}
            <div className="exam-footer">

                {/* Show Answer Toggle - Only if enabled and not in review */}


                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <button
                        onClick={() => handleNavigate(session.currentQuestionIndex - 1)}
                        disabled={session.currentQuestionIndex === 0}
                    >
                        Previous
                    </button>

                    {isReviewMode ? (
                        <button
                            className="mod-cta"
                            onClick={() => setResult(ScoringEngine.calculateScore(session))} // Go back to results
                        >
                            Exit review
                        </button>
                    ) : (
                        <button
                            className="mod-cta"
                            onClick={handleSubmit}
                        >
                            Submit exam
                        </button>
                    )}

                    <button
                        onClick={() => handleNavigate(session.currentQuestionIndex + 1)}
                        disabled={session.currentQuestionIndex === definition.questions.length - 1}
                    >
                        Next
                    </button>
                </div>

                <div style={{ maxHeight: '100px', overflowY: 'auto' }}>
                    <QuestionNav
                        total={definition.questions.length}
                        current={session.currentQuestionIndex}
                        answers={session.answers}
                        questionIds={definition.questions.map(q => q.id)}
                        onNavigate={handleNavigate}
                    />
                </div>
            </div>
        </div>
    );
};

function renderQuestion(
    q: Question,
    ans: UserAnswerState | undefined,
    onChange: (ans: Partial<UserAnswerState>) => void,
    app: App,
    showResult = false
): React.ReactNode {
    if (!q) return <div>Error: Question not found</div>;
    switch (q.type) {
        case 'MC': return <MultipleChoice question={q} answer={ans} onChange={onChange} showResult={showResult} app={app} />;
        case 'SATA': return <SelectAll question={q} answer={ans} onChange={onChange} showResult={showResult} app={app} />;
        case 'TF': return <TrueFalse question={q} answer={ans} onChange={onChange} showResult={showResult} app={app} />;
        case 'MATCH': return <Matching question={q} answer={ans} onChange={onChange} showResult={showResult} app={app} />;
        case 'FIB': return <FillInBlank question={q} answer={ans} onChange={onChange} showResult={showResult} app={app} />;
        case 'SA':
        case 'LA': return <ShortLongAnswer question={q} answer={ans} onChange={onChange} showResult={showResult} app={app} />;
        default: return <div>Unknown question type: {(q as Question).type}</div>;
    }
}
