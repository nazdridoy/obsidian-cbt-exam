import * as React from "react";
import { App, Notice } from "obsidian";
import { ExamDefinition, ExamSession, UserAnswerState, ExamResult, Question, QuestionPerformance } from "../types/types";
import { CBTSettings } from "../settings/settingsTab";
import { ExamSessionManager, SessionDraft, clearSessionDraft, loadSessionDraft, saveSessionDraft } from "../exam/examSession";
import { ScoringEngine } from "../exam/scoringEngine";
import { HistoryManager } from "../exam/historyManager";
import { TimerDisplay } from "./components/Timer";
import { QuestionNav } from "./components/QuestionNav";
import { ResultsView } from "./ResultsView";
import { buildPerformanceIndex, selectAdaptiveQuestions } from "../exam/performanceAnalyzer";
import { PerformanceManager } from "../exam/performanceManager";
import { AIGradingManager } from "../exam/aiGradingManager";
import { Target, CheckCircle2 } from "lucide-react";

// Types
import { MultipleChoice } from "./questions/MultipleChoice";
import { SelectAll } from "./questions/SelectAll";
import { TrueFalse } from "./questions/TrueFalse";
import { Matching } from "./questions/Matching";
import { FillInBlank } from "./questions/FillInBlank";
import { ShortLongAnswer } from "./questions/ShortLongAnswer";
import { HistoryView } from "./HistoryView";
import { LandingView } from "./LandingView";
import { ConfirmModal } from "./ConfirmModal";

function findFirstUngradedWrittenIndex(session: ExamSession): number {
    return session.definition.questions.findIndex(q => {
        if (q.type !== 'SA' && q.type !== 'LA') return false;
        const answer = session.answers[q.id];
        const hasResponse = !!answer?.textInputs?.[0]?.trim();
        return hasResponse && typeof answer.manualCorrect !== 'boolean';
    });
}

export const ExamUI: React.FC<{ definition: ExamDefinition, onClose: () => void, app: App, sourcePath?: string, settings: CBTSettings }> = ({ definition, onClose, app, sourcePath, settings }) => {
    // We use a ref to hold the manager, but state to force re-renders
    const restoredDraftRef = React.useRef<SessionDraft | null>(null);
    const managerRef = React.useRef<ExamSessionManager | null>(null);
    if (!managerRef.current) {
        managerRef.current = new ExamSessionManager(definition);
        const draft = loadSessionDraft(sourcePath, definition);
        if (draft) {
            managerRef.current.restoreDraft(draft);
            restoredDraftRef.current = draft;
        }
    }
    const initialSession = managerRef.current.getSession();
    const initialReview = initialSession.status === 'REVIEW' || initialSession.status === 'AI_PENDING';
    const [session, setSession] = React.useState<ExamSession>(initialSession);
    const [result, setResult] = React.useState<ExamResult | null>(initialReview ? ScoringEngine.calculateScore(initialSession) : null);
    const [showCurrentAnswer, setShowCurrentAnswer] = React.useState(false); // New state for showing answer
    const [showHistory, setShowHistory] = React.useState(false);
    const [pendingSelfGrading, setPendingSelfGrading] = React.useState(initialReview);
    const [aiBusy, setAiBusy] = React.useState(false);
    const historyManager = React.useMemo(() => new HistoryManager(app), [app]);
    const aiGradingManager = React.useMemo(() => new AIGradingManager(app), [app]);
    const performanceManager = React.useMemo(() => new PerformanceManager(app), [app]);

    // Adaptive study state
    const [performanceData, setPerformanceData] = React.useState<Map<string, QuestionPerformance> | null>(null);
    const [hasHistory, setHasHistory] = React.useState(false);
    const [previousPerformance, setPreviousPerformance] = React.useState<Map<string, QuestionPerformance> | null>(null);

    // Load performance data
    const loadPerformanceData = React.useCallback(async () => {
        if (!sourcePath) return;
        try {
            const history = await historyManager.getHistory(sourcePath);
            if (history.length > 0) {
                setHasHistory(true);
                const allQuestions = definition.fullQuestions || definition.questions;
                const perfMap = buildPerformanceIndex(history, allQuestions);
                setPerformanceData(perfMap);
                await performanceManager.writePerformanceData(sourcePath, perfMap);
            } else {
                setHasHistory(false);
                setPerformanceData(null);
            }
        } catch (e) {
            console.error("Failed to load performance data:", e);
        }
    }, [sourcePath, historyManager, performanceManager, definition]);

    React.useEffect(() => {
        void loadPerformanceData();
    }, [loadPerformanceData]);

    React.useEffect(() => {
        if (!restoredDraftRef.current) return;
        const draft = restoredDraftRef.current;
        restoredDraftRef.current = null;
        if (draft.status === 'AI_PENDING') {
            new Notice('已恢复待 AI 批改的作答；可检查结果或改用手动批改。');
        } else {
            // eslint-disable-next-line obsidianmd/ui/sentence-case -- CBT is a product acronym.
            new Notice('已恢复上次未完成的 CBT 作答。');
        }
    }, []);

    React.useEffect(() => {
        if (session.status === 'IDLE' || session.status === 'SUBMITTED') return;
        saveSessionDraft(sourcePath, session);
    }, [sourcePath, session]);

    const handleSubmit = React.useCallback(async () => {
        const finalSession = managerRef.current.submit();
        setSession(finalSession);
        const res = ScoringEngine.calculateScore(finalSession);
        setResult(res);

        const firstUngradedIndex = findFirstUngradedWrittenIndex(finalSession);
        if (firstUngradedIndex !== -1) {
            setPendingSelfGrading(true);
            managerRef.current.setStatus('REVIEW');
            const reviewSession = managerRef.current.setIndex(firstUngradedIndex);
            setSession(reviewSession);
            saveSessionDraft(sourcePath, reviewSession);
            new Notice('请选择手动批改，或交给外部 AI agent 批改；作答已安全保存。');
            return;
        }

        if (sourcePath && settings.saveHistory) {
            try {
                await historyManager.saveSession(sourcePath, res);
                const history = await historyManager.getHistory(sourcePath);
                const allQuestions = definition.fullQuestions || definition.questions;
                const newPerfMap = buildPerformanceIndex(history, allQuestions);
                setPreviousPerformance(performanceData);
                setPerformanceData(newPerfMap);
                await performanceManager.writePerformanceData(sourcePath, newPerfMap);
                clearSessionDraft(sourcePath);
            } catch (e) {
                console.error("Failed to save exam history:", e);
            }
        } else {
            clearSessionDraft(sourcePath);
        }
    }, [sourcePath, historyManager, performanceManager, settings.saveHistory, definition, performanceData]);

    const handleQueueAiGrading = React.useCallback(async () => {
        if (aiBusy || !sourcePath) return;
        setAiBusy(true);
        try {
            const currentSession = managerRef.current.getSession();
            const currentResult = ScoringEngine.calculateScore(currentSession);
            const request = await aiGradingManager.createRequest(sourcePath, currentSession, currentResult);
            const pendingSession = managerRef.current.setAiRequest(request.requestId);
            setSession(pendingSession);
            saveSessionDraft(sourcePath, pendingSession);
            new Notice(`AI 批改请求已保存：${request.requestId}`);
            onClose();
        } catch (e) {
            console.error('Failed to queue AI grading:', e);
            new Notice('无法创建 AI 批改请求；作答草稿仍已保留。');
        } finally {
            setAiBusy(false);
        }
    }, [aiBusy, sourcePath, aiGradingManager, onClose]);

    const handleImportAiGrading = React.useCallback(async (silent = false) => {
        const currentSession = managerRef.current.getSession();
        if (!currentSession.aiRequestId) {
            if (!silent) new Notice('当前作答没有待导入的 AI 批改请求。');
            return;
        }
        if (aiBusy || !sourcePath) return;
        setAiBusy(true);
        try {
            const aiResult = await aiGradingManager.loadResult(currentSession.aiRequestId);
            if (!aiResult) {
                if (!silent) new Notice('AI 批改尚未完成；也可以继续手动批改。');
                return;
            }

            let reviewedSession = managerRef.current.applyAiDecisions(aiResult.decisions);
            const firstUngradedIndex = findFirstUngradedWrittenIndex(reviewedSession);
            if (firstUngradedIndex !== -1) {
                reviewedSession = managerRef.current.setIndex(firstUngradedIndex);
                setSession(reviewedSession);
                setResult(ScoringEngine.calculateScore(reviewedSession));
                setPendingSelfGrading(true);
                saveSessionDraft(sourcePath, reviewedSession);
                new Notice('AI 已完成可判定题目；低置信度题请手动确认。');
                return;
            }

            const finalResult = ScoringEngine.calculateScore(reviewedSession);
            managerRef.current.setStatus('SUBMITTED');
            setSession(managerRef.current.getSession());
            setResult(finalResult);
            setPendingSelfGrading(false);
            if (settings.saveHistory) {
                await historyManager.saveSession(sourcePath, finalResult);
                const history = await historyManager.getHistory(sourcePath);
                const allQuestions = definition.fullQuestions || definition.questions;
                const newPerfMap = buildPerformanceIndex(history, allQuestions);
                setPreviousPerformance(performanceData);
                setPerformanceData(newPerfMap);
                await performanceManager.writePerformanceData(sourcePath, newPerfMap);
            }
            clearSessionDraft(sourcePath);
            // eslint-disable-next-line obsidianmd/ui/sentence-case -- CBT is a product acronym.
            new Notice('AI 批改结果已导入并写入 CBT history。');
        } catch (e) {
            console.error('Failed to import AI grading:', e);
            if (!silent) new Notice('AI 批改结果无效或无法读取；请保留草稿并检查结果文件。');
        } finally {
            setAiBusy(false);
        }
    }, [aiBusy, sourcePath, aiGradingManager, settings.saveHistory, historyManager, performanceManager, definition, performanceData]);

    React.useEffect(() => {
        if (session.status === 'AI_PENDING' && session.aiRequestId) {
            void handleImportAiGrading(true);
        }
        // Import once when a pending draft is restored.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleExitReview = React.useCallback(async () => {
        const currentSession = managerRef.current.getSession();
        const firstUngradedIndex = findFirstUngradedWrittenIndex(currentSession);
        if (pendingSelfGrading && firstUngradedIndex !== -1) {
            setSession(managerRef.current.setIndex(firstUngradedIndex));
            new Notice('每道已作答的表述题都必须选择“正确”或“错误”。');
            return;
        }

        const reviewedResult = ScoringEngine.calculateScore(currentSession);
        setResult(reviewedResult);
        managerRef.current.setStatus('SUBMITTED');
        setSession(managerRef.current.getSession());
        if (pendingSelfGrading && sourcePath && settings.saveHistory) {
            try {
                await historyManager.saveSession(sourcePath, reviewedResult);
                const history = await historyManager.getHistory(sourcePath);
                const allQuestions = definition.fullQuestions || definition.questions;
                const newPerfMap = buildPerformanceIndex(history, allQuestions);
                setPreviousPerformance(performanceData);
                setPerformanceData(newPerfMap);
                await performanceManager.writePerformanceData(sourcePath, newPerfMap);
                clearSessionDraft(sourcePath);
            } catch (e) {
                console.error('Failed to save exam history:', e);
            }
        } else if (pendingSelfGrading) {
            clearSessionDraft(sourcePath);
        }
        setPendingSelfGrading(false);
    }, [pendingSelfGrading, sourcePath, settings.saveHistory, historyManager, performanceManager, definition, performanceData]);

    const handleStart = React.useCallback(() => {
        clearSessionDraft(sourcePath);
        const s = managerRef.current.start();
        setSession(s);
    }, [sourcePath]);

    const handleStartWithValidation = React.useCallback(() => {
        const errors = definition.metadata.rangeErrors;
        if (errors && errors.length > 0) {
            const message = "The specified exam-range is invalid:\n\n" +
                errors.map(e => "• " + e).join("\n") +
                "\n\nWould you like to launch the FULL exam instead?";

            const modal = new ConfirmModal(
                app,
                message,
                () => {
                    // Start with full questions
                    const fullDefinition = {
                        ...definition,
                        questions: definition.fullQuestions || definition.questions
                    };
                    managerRef.current = new ExamSessionManager(fullDefinition);
                    const s = managerRef.current.start();
                    setSession(s);
                },
                () => {
                    // Do nothing, stay on landing page
                },
                "Exam range error",
                "Launch exam"
            );
            modal.open();
        } else {
            handleStart();
        }
    }, [definition, app, handleStart]);

    const handleStartAdaptive = React.useCallback(() => {
        if (!performanceData) return;

        const allQuestions = definition.fullQuestions || definition.questions;
        const selection = selectAdaptiveQuestions(allQuestions, performanceData, settings.adaptiveMixRatio);

        if (selection.noHistory) {
            new Notice("Take the exam at least once before using adaptive study.");
            return;
        }

        if (selection.allMastered) {
            const modal = new ConfirmModal(
                app,
                "All questions mastered! Great job!\n\nWould you like to take the full exam for reinforcement?",
                () => {
                    managerRef.current = new ExamSessionManager(definition);
                    const s = managerRef.current.start();
                    setSession(s);
                },
                () => { /* stay on landing */ },
                "All Mastered!",
                "Full Exam"
            );
            modal.open();
            return;
        }

        // Build adaptive ExamDefinition
        const adaptiveDefinition: ExamDefinition = {
            ...definition,
            questions: selection.questions,
            fullQuestions: allQuestions, // Keep reference to full set
        };

        // Store previous performance for delta display
        setPreviousPerformance(performanceData);

        managerRef.current = new ExamSessionManager(adaptiveDefinition, true);

        // Reset state for new session
        setResult(null);
        setShowCurrentAnswer(false);

        const s = managerRef.current.start();
        setSession(s);
    }, [definition, performanceData, settings.adaptiveMixRatio, app]);

    React.useEffect(() => {
        console.debug("ExamUI Mounted. Definition:", definition);
        // We no longer auto-start on mount to show the landing page
    }, [definition]);

    if (!session) {
        return <div>Initializing session...</div>;
    }

    const handleAnswer = (ans: Partial<UserAnswerState>) => {
        const qId = session.definition.questions[session.currentQuestionIndex].id;
        const updatedSession = managerRef.current.answerQuestion(qId, ans);
        setSession(updatedSession);
        if (updatedSession.status === 'REVIEW') {
            setResult(ScoringEngine.calculateScore(updatedSession));
        }
    };

    const handleNavigate = (idx: number) => {
        setSession(managerRef.current.setIndex(idx));
        // Only reset "Show Answer" toggle if not in review mode
        if (session.status !== 'REVIEW') {
            setShowCurrentAnswer(false);
        }
    };



    const handleReview = (idx?: number) => {
        // Switch to review mode
        managerRef.current.setStatus('REVIEW');
        const targetIdx = typeof idx === 'number' ? idx : 0;
        setSession(managerRef.current.setIndex(targetIdx));
    };

    const handleRetake = () => {
        clearSessionDraft(sourcePath);
        // For adaptive mode, re-run the selection algorithm to get fresh questions
        if (session.isAdaptive && performanceData) {
            handleStartAdaptive();
        } else {
            // Reset manager and session
            managerRef.current = new ExamSessionManager(definition);
            setSession(managerRef.current.getSession());
            setResult(null);
            setShowCurrentAnswer(false);
        }
    };

    const handleDiscardDraft = () => {
        new ConfirmModal(
            app,
            'Discard the saved draft for this CBT session? This cannot be undone.',
            () => {
                clearSessionDraft(sourcePath);
                managerRef.current = new ExamSessionManager(definition);
                setSession(managerRef.current.getSession());
                setResult(null);
                setPendingSelfGrading(false);
                // eslint-disable-next-line obsidianmd/ui/sentence-case -- CBT is a product acronym.
                new Notice('CBT 草稿已丢弃。');
            },
            () => { /* keep draft */ },
            'Discard CBT draft',
            'Discard'
        ).open();
    };

    // View Switching
    if (showHistory && sourcePath) {
        return (
            <HistoryView
                app={app}
                sourcePath={sourcePath}
                definition={definition}
                onViewResult={(res) => {
                    const allQuestions = definition.fullQuestions || definition.questions;
                    const questionByAnyId = new Map<string, Question>();
                    allQuestions.forEach(q => {
                        questionByAnyId.set(q.id, q);
                        if (q.legacyId) questionByAnyId.set(q.legacyId, q);
                    });
                    const restoredPairs = res.questionResults
                        .map(qr => ({ result: qr, question: questionByAnyId.get(qr.questionId) }))
                        .filter((pair): pair is { result: typeof res.questionResults[number]; question: Question } => !!pair.question);
                    if (restoredPairs.length === 0) {
                        new Notice('The questions from this historical attempt are no longer present in the bank.');
                        return;
                    }
                    if (restoredPairs.length !== res.questionResults.length) {
                        new Notice('Some historical questions are missing from the current bank; available questions will be shown.');
                    }
                    const historicalDefinition: ExamDefinition = {
                        ...definition,
                        questions: restoredPairs.map(pair => pair.question),
                        metadata: { ...definition.metadata, questionRange: res.questionRange },
                    };
                    const normalizedResult: ExamResult = {
                        ...res,
                        questionResults: restoredPairs.map(pair => {
                            const isWritten = pair.question.type === 'SA' || pair.question.type === 'LA';
                            const manualCorrect = pair.result.userAnswer.manualCorrect;
                            return {
                                ...pair.result,
                                questionId: pair.question.id,
                                questionOrder: pair.question.order,
                                questionType: pair.question.type,
                                userAnswer: {
                                    ...pair.result.userAnswer,
                                    questionId: pair.question.id,
                                    manualCorrect: isWritten && typeof manualCorrect !== 'boolean' ? pair.result.isCorrect : manualCorrect,
                                },
                            };
                        }),
                    };
                    managerRef.current = new ExamSessionManager(historicalDefinition);
                    managerRef.current.loadFromResult(normalizedResult);
                    setSession(managerRef.current.getSession());
                    setResult(normalizedResult);
                    setPendingSelfGrading(false);
                    setShowHistory(false);
                }}
                onClose={() => {
                    setShowHistory(false);
                    void loadPerformanceData();
                }}
            />
        );
    }

    if (session.status === 'IDLE') {
        return (
            <LandingView
                definition={definition}
                onStart={handleStartWithValidation}
                onStartAdaptive={handleStartAdaptive}
                onViewHistory={() => setShowHistory(true)}
                onClose={onClose}
                performanceData={performanceData}
                hasHistory={hasHistory}
            />
        );
    }

    if (result && session.status !== 'REVIEW' && session.status !== 'AI_PENDING') {
        return (
            <ResultsView
                result={result}
                onClose={onClose}
                onReview={handleReview}
                onRetake={handleRetake}
                onShowHistory={() => setShowHistory(true)}
                showHistoryButton={settings.showHistoryAfterExam}
                isAdaptive={session.isAdaptive}
                previousPerformance={previousPerformance}
                currentPerformance={performanceData}
            />
        );
    }

    const currentQ = session.definition.questions[session.currentQuestionIndex];
    if (!currentQ) return <div>Loading...</div>; // Safety

    const currentAns = session.answers[currentQ.id];

    // Determine if we should show the result/answer for this question
    // in REVIEW mode, OR if the user clicked "Show Answer" (only allowed if not in review and enabled in metadata)
    const isReviewMode = session.status === 'REVIEW' || session.status === 'AI_PENDING';
    const canShowAnswer = !isReviewMode && session.definition.metadata.showAnswer;
    const shouldShowResult = isReviewMode || showCurrentAnswer;

    const currentDefinition = session.definition;

    return (
        <div className="exam-ui-layout">
            <div className="exam-progress-bar-container">
                <div className="exam-progress-bar-fill" style={{ width: `${((session.currentQuestionIndex + 1) / currentDefinition.questions.length) * 100}%` }} />
            </div>
            {/* Header */}
            <div className="exam-header">
                <div className="u-flex u-flex-center u-flex-gap-1">
                    {session.status === 'AI_PENDING' && <span className="adaptive-badge">AI grading pending</span>}
                    <button onClick={handleDiscardDraft} className="btn-secondary">Discard draft</button>
                    <div className="exam-title">{currentDefinition.title}</div>
                    {session.isAdaptive && (
                        <span className="adaptive-badge u-flex u-flex-center u-gap-1">
                            <Target size={16} /> Adaptive
                        </span>
                    )}
                </div>

                <div className="u-flex u-flex-center u-flex-gap-1">
                    {/* Show Answer Toggle - Only if enabled and not in review */}
                    {canShowAnswer && (
                        <button onClick={() => setShowCurrentAnswer(!showCurrentAnswer)}>
                            {showCurrentAnswer ? "Hide answer" : "Show answer"}
                        </button>
                    )}
                    {isReviewMode && result ? (
                        <span className="exam-timer u-bold">
                            Time Taken: {Math.floor(result.durationSeconds / 60)}:{(Math.floor(result.durationSeconds % 60)).toString().padStart(2, '0')}
                        </span>
                    ) : (
                        <TimerDisplay seconds={session.timeLimitSeconds} onExpire={() => { void handleSubmit(); }} />
                    )}
                    <button
                        aria-label="Quit Exam"
                        onClick={onClose}
                        className="btn-danger"
                    >
                        Quit
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="exam-body">
                <ValidationSummary questions={currentDefinition.questions} />

                <div className="question-count-container u-flex u-flex-center u-flex-justify-between">
                    <div className="question-count">
                        Question {session.currentQuestionIndex + 1} of {currentDefinition.questions.length}
                    </div>
                    <div
                        className={`question-mark-toggle ${currentAns?.isMarked ? 'is-marked' : ''} ${isReviewMode ? 'u-cursor-default' : ''}`}
                        onClick={() => !isReviewMode && setSession(managerRef.current.toggleMark(currentQ.id))}
                        title={isReviewMode ? (currentAns?.isMarked ? "Marked" : "") : (currentAns?.isMarked ? "Unmark question" : "Mark question")}
                    >
                        <CheckCircle2 size={20} />
                    </div>
                </div>

                {currentQ.errors && currentQ.errors.length > 0 && (
                    <div className="question-error-notice">
                        <strong>Invalid Question:</strong>
                        <ul className="u-margin-0 u-padding-left-1">
                            {currentQ.errors.map((err, idx) => (
                                <li key={idx}>{err}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {renderQuestion(currentQ, currentAns, handleAnswer, app, shouldShowResult)}
            </div>

            {/* Footer */}
            <div className="exam-footer">

                {/* Show Answer Toggle - Only if enabled and not in review */}


                <div className="u-flex u-flex-justify-between">
                    <button
                        onClick={() => handleNavigate(session.currentQuestionIndex - 1)}
                        disabled={session.currentQuestionIndex === 0}
                    >
                        Previous
                    </button>

                    {isReviewMode ? (
                        <div className="u-flex u-gap-1">
                            <button className="mod-cta" onClick={() => { void handleExitReview(); }}>
                                完成手动批改
                            </button>
                            {pendingSelfGrading && session.status !== 'AI_PENDING' && !session.aiRequestId && (
                                <button className="btn-secondary" disabled={aiBusy} onClick={() => { void handleQueueAiGrading(); }}>
                                    {aiBusy ? '正在保存…' : '交给 AI Agent 批改'}
                                </button>
                            )}
                            {session.status === 'AI_PENDING' && (
                                <button className="btn-secondary" disabled={aiBusy} onClick={() => { void handleImportAiGrading(false); }}>
                                    {aiBusy ? '正在检查…' : '检查 AI 批改结果'}
                                </button>
                            )}
                        </div>
                    ) : (
                        <button
                            className="mod-cta"
                            onClick={() => { void handleSubmit(); }}
                        >
                            Submit exam
                        </button>
                    )}

                    <button
                        onClick={() => handleNavigate(session.currentQuestionIndex + 1)}
                        disabled={session.currentQuestionIndex === currentDefinition.questions.length - 1}
                    >
                        Next
                    </button>
                </div>

                <div className="exam-nav-container">
                    <QuestionNav
                        total={currentDefinition.questions.length}
                        current={session.currentQuestionIndex}
                        answers={session.answers}
                        questionIds={currentDefinition.questions.map(q => q.id)}
                        onNavigate={handleNavigate}
                        examResult={result}
                    />
                </div>
            </div>
        </div>
    );
};

const ValidationSummary: React.FC<{ questions: Question[] }> = ({ questions }) => {
    const questionsWithErrors = questions.filter(q => q.errors && q.errors.length > 0);

    if (questionsWithErrors.length === 0) return null;

    return (
        <div className="exam-validation-summary">
            <div className="u-bold u-margin-bottom-0-5">Exam Source Warnings:</div>
            <ul className="u-margin-0 u-padding-left-1">
                {questionsWithErrors.map((q, idx) => (
                    <li key={idx}>
                        <span className="u-bold">Question {q.order ?? idx + 1}:</span>
                        <ul className="u-margin-0 u-padding-left-1">
                            {q.errors?.map((err, eIdx) => (
                                <li key={eIdx}>{err}</li>
                            ))}
                        </ul>
                    </li>
                ))}
            </ul>
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
