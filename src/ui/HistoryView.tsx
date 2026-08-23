import * as React from "react";
import { App, ButtonComponent, Modal, Notice, TFile } from "obsidian";
import { ExamDefinition, ExamResult, Question } from "../types/types";
import { HistoryManager } from "../exam/historyManager";
import { ConfirmModal } from "./ConfirmModal";

interface Props {
    app: App;
    sourcePath: string;
    definition: ExamDefinition;
    onViewResult: (result: ExamResult) => void;
    onClose: () => void;
}

interface ExpressionCandidate {
    sessionId: string;
    questionId: string;
    sourcePath: string;
    topic: string;
    label: string;
    question: string;
    reference: string;
    userAnswer: string;
}

class ExpressionCaptureModal extends Modal {
    private fields: Array<{
        candidate: ExpressionCandidate;
        checkbox: HTMLInputElement;
        expression: HTMLTextAreaElement;
        note: HTMLTextAreaElement;
    }> = [];

    constructor(app: App, private readonly candidates: ExpressionCandidate[]) {
        super(app);
    }

    public onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('cbt-expression-modal');
        contentEl.createEl('h3', { text: '加入表达待整理箱' });
        contentEl.createEl('p', { text: '先保存原题、你的答案和参考答案；之后由表达整理 skill 统一优化。', cls: 'u-text-muted' });

        this.candidates.forEach(candidate => {
            const block = contentEl.createDiv({ cls: 'cbt-expression-candidate' });
            const heading = block.createEl('label', { cls: 'cbt-expression-heading' });
            const checkbox = heading.createEl('input', { type: 'checkbox' });
            checkbox.checked = true;
            heading.createSpan({ text: ` ${candidate.label}` });
            block.createEl('div', { text: candidate.question, cls: 'cbt-expression-question' });
            block.createEl('label', { text: '要记住的表达 / 得分点' });
            const expression = block.createEl('textarea', { cls: 'cbt-expression-textarea' });
            expression.value = candidate.reference;
            expression.rows = 3;
            block.createEl('label', { text: '我的答案与问题（可选）' });
            const note = block.createEl('textarea', { cls: 'cbt-expression-textarea' });
            note.value = candidate.userAnswer;
            note.rows = 2;
            this.fields.push({ candidate, checkbox, expression, note });
        });

        const actions = contentEl.createDiv({ cls: 'u-flex u-gap-2 u-flex-justify-end u-mt-2' });
        new ButtonComponent(actions).setButtonText('取消').onClick(() => this.close());
        new ButtonComponent(actions).setButtonText('保存到待整理箱').setCta().onClick(() => void this.save());
    }

    private async save(): Promise<void> {
        const selected = this.fields
            .filter(field => field.checkbox.checked && field.expression.value.trim())
            .map(field => ({
                ...field.candidate,
                expression: field.expression.value.trim(),
                userAnswer: field.note.value.trim(),
            }));
        if (selected.length === 0) {
            new Notice('请至少选择一项并填写表达。');
            return;
        }

        const path = 'exam/past-paper-mistake-bank/expression-inbox.md';
        const file = this.app.vault.getAbstractFileByPath(path);
        let content = file instanceof TFile
            ? await this.app.vault.read(file)
            : `---\ntype: writing-expression-inbox\nschema_version: "1.0"\n---\n\n# 主观题表达待整理箱\n\n`;
        let added = 0;
        for (const item of selected) {
            const marker = `<!-- cbt-expression:${item.sessionId}:${item.questionId} -->`;
            if (content.includes(marker)) continue;
            content += `${marker}\n## ${item.label}\n\n- **主题**：${item.topic || '未分类'}\n- **原题**：${item.question}\n- **标准表达 / 得分点**：${item.expression}\n- **我的答案**：${item.userAnswer || '（未填写）'}\n- **来源**：${item.sourcePath}，${item.sessionId}\n\n`;
            added++;
        }

        if (file instanceof TFile) await this.app.vault.modify(file, content);
        else await this.app.vault.create(path, content);
        new Notice(added > 0 ? `已加入表达待整理箱 ${added} 条。` : '这些记录已经在待整理箱中。');
        this.close();
    }

    public onClose(): void {
        this.contentEl.empty();
        this.fields = [];
    }
}

export const HistoryView: React.FC<Props> = ({ app, sourcePath, definition, onViewResult, onClose }) => {
    const [history, setHistory] = React.useState<ExamResult[]>([]);
    const [loading, setLoading] = React.useState(true);
    const historyManager = React.useMemo(() => new HistoryManager(app), [app]);
    const questionByAnyId = React.useMemo(() => {
        const map = new Map<string, Question>();
        const allQuestions = definition.fullQuestions || definition.questions;
        allQuestions.forEach(q => {
            map.set(q.id, q);
            if (q.legacyId) map.set(q.legacyId, q);
        });
        return map;
    }, [definition]);

    const formatQuestions = (result: ExamResult): string => result.questionResults.map(qr => {
        const matchedQuestion = questionByAnyId.get(qr.questionId);
        const order = qr.questionOrder ?? matchedQuestion?.order;
        return order !== undefined ? `Q${order}` : qr.questionId;
    }).join(', ');

    const getTopics = (result: ExamResult): string => {
        const topics = result.questionResults
            .map(qr => questionByAnyId.get(qr.questionId)?.topic)
            .filter((topic): topic is string => !!topic);
        return [...new Set(topics)].join('、') || definition.title || '未标注主题';
    };

    const getExpressionCandidates = (result: ExamResult): ExpressionCandidate[] => result.questionResults.flatMap(qr => {
        const question = questionByAnyId.get(qr.questionId);
        if (!question || (question.type !== 'SA' && question.type !== 'LA') || qr.isCorrect) return [];
        return [{
            sessionId: result.sessionId,
            questionId: qr.questionId,
            sourcePath,
            topic: question.topic || definition.title || '未标注主题',
            label: `Q${qr.questionOrder || question.order || qr.questionId}`,
            question: question.questionText,
            reference: question.correctAnswerText || '',
            userAnswer: qr.userAnswer.textInputs?.[0] || '',
        }];
    });

    const handleCaptureExpressions = (result: ExamResult): void => {
        const candidates = getExpressionCandidates(result);
        if (candidates.length === 0) {
            new Notice('本次没有判为错误的主观题可整理。');
            return;
        }
        new ExpressionCaptureModal(app, candidates).open();
    };

    React.useEffect(() => {
        const loadHistory = async () => {
            try {
                const data = await historyManager.getHistory(sourcePath);
                setHistory(data);
            } catch (e) {
                console.error("Failed to load history:", e);
            } finally {
                setLoading(false);
            }
        };
        void loadHistory();
    }, [sourcePath, historyManager]);

    const handleDelete = (sessionId: string) => {
        new ConfirmModal(
            app,
            "Are you sure you want to delete this attempt? This action cannot be undone.",
            () => {
                void (async () => {
                    try {
                        await historyManager.deleteSession(sourcePath, sessionId);
                        setHistory(prev => prev.filter(res => res.sessionId !== sessionId));
                    } catch (e) {
                        console.error("Failed to delete history session:", e);
                    }
                })();
            },
            undefined,
            "Delete attempt",
            "Delete"
        ).open();
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}m ${secs}s`;
    };

    if (loading) {
        return <div className="history-container u-text-center">Loading history...</div>;
    }

    return (
        <div className="history-container">
            <div className="history-header u-flex u-flex-justify-between u-flex-center u-mb-2">
                <h2>Exam History</h2>
                <button onClick={onClose} className="btn-secondary">Close</button>
            </div>

            {history.length === 0 ? (
                <div className="u-text-center u-text-muted u-mt-2">
                    <p>No history found for this quiz.</p>
                </div>
            ) : (
                <div className="history-list">
                    <table className="history-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Topics</th>
                                <th>Questions</th>
                                <th>Score</th>
                                <th>Duration</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((res) => (
                                <tr key={res.sessionId}>
                                    <td>{new Date(res.timestamp).toLocaleString()}</td>
                                    <td>{getTopics(res)}</td>
                                    <td>{formatQuestions(res)}</td>
                                    <td>{res.percentage.toFixed(1)}% ({res.totalScore}/{res.maxScore})</td>
                                    <td>{formatDuration(res.durationSeconds)}</td>
                                    <td className={res.isPass ? "results-status-pass" : "results-status-fail"}>
                                        {res.isPass ? "PASS" : "FAIL"}
                                    </td>
                                    <td className="u-flex u-flex-center u-gap-2">
                                        <button
                                            className="btn-info btn-small"
                                            onClick={() => onViewResult(res)}
                                        >
                                            View
                                        </button>
                                        <button
                                            className="btn-secondary btn-small"
                                            onClick={() => handleCaptureExpressions(res)}
                                        >
                                            整理表达
                                        </button>
                                        <button
                                            className="btn-danger btn-small"
                                            onClick={() => void handleDelete(res.sessionId)}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
