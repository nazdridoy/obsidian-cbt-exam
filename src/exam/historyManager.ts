import { App, TFile, normalizePath } from "obsidian";
import { ExamResult, AnswerStatus, QuestionType } from "../types/types";

interface CompactExamResult {
    id: string;
    ts: number;
    sc: number;
    mSc: number;
    pct: number;
    p: boolean;
    dur: number;
    rng?: string;
    res: Array<{
        q: string;
        o?: number;
        ty?: QuestionType;
        ok: boolean;
        s: number;
        st: AnswerStatus;
        idx?: number;
        idxs?: number[];
        val?: boolean;
        txt?: string[];
        mc?: boolean;
        gs?: 'manual' | 'ai';
        gc?: 'high' | 'medium' | 'low';
        gr?: string;
        pts?: Array<{ l: number, r: number }>;
        m?: boolean;
    }>;
}

export class HistoryManager {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    private getHistoryFilePath(quizPath: string): string {
        const extensionIndex = quizPath.lastIndexOf(".");
        const basePath = extensionIndex !== -1 ? quizPath.substring(0, extensionIndex) : quizPath;
        return `${basePath}-history.md`;
    }

    public async saveSession(quizPath: string, result: ExamResult): Promise<void> {
        const historyPath = normalizePath(this.getHistoryFilePath(quizPath));
        const historyFile = this.app.vault.getAbstractFileByPath(historyPath);

        const timestamp = new Date(result.timestamp).toLocaleString();
        const scorePercent = result.percentage.toFixed(1);
        const duration = this.formatDuration(result.durationSeconds);
        const passStatus = result.isPass ? "PASS" : "FAIL";

        const tableRow = `| ${result.sessionId.substring(0, 8)} | ${timestamp} | ${scorePercent}% | ${duration} | ${passStatus} |`;

        const sessionDetail = `
## Attempt: ${timestamp}
> [!info] Summary
> Score: ${result.totalScore}/${result.maxScore} | Correct: ${scorePercent}% | Time: ${duration}

> [!abstract]- Raw Session Data
> <!-- SESSION_DATA_START -->
> \`\`\`json
${this.compressResult(result).split('\n').map(line => `> ${line}`).join('\n')}
> \`\`\`
> <!-- SESSION_DATA_END -->

---
`;

        if (historyFile instanceof TFile) {
            let content = await this.app.vault.read(historyFile);

            // 1. Update Frontmatter (simplified logic for now, could use processFrontMatter)
            content = this.updateFrontmatter(content, result);

            // 2. Append Table Row (find table or add it)
            content = this.appendToTable(content, tableRow);

            // 3. Append Detailed Block
            content += sessionDetail;

            await this.app.vault.modify(historyFile, content);
        } else {
            // Create new history file
            const initialContent = `---
source: "${quizPath}"
created: ${new Date().toISOString().split('T')[0]}
attempts: 1
last-score: ${result.percentage}
last-attempt-date: ${new Date().toISOString().split('T')[0]}
---

# Exam History: ${quizPath}

| ID | Date | Score | Duration | Status |
| :--- | :--- | :--- | :--- | :--- |
${tableRow}

${sessionDetail}`;
            await this.app.vault.create(historyPath, initialContent);
        }
    }

    private formatDuration(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}m ${secs}s`;
    }

    private updateFrontmatter(content: string, result: ExamResult): string {
        // Very basic regex-based frontmatter update for now
        // A more robust approach would use app.fileManager.processFrontMatter if possible
        const attemptsMatch = content.match(/attempts: (\d+)/);
        if (attemptsMatch) {
            const newAttempts = parseInt(attemptsMatch[1]) + 1;
            content = content.replace(/attempts: \d+/, `attempts: ${newAttempts}`);
        }

        content = content.replace(/last-score: [\d.]+/, `last-score: ${result.percentage}`);
        content = content.replace(/last-attempt-date: \d{4}-\d{2}-\d{2}/, `last-attempt-date: ${new Date().toISOString().split('T')[0]}`);

        return content;
    }

    private appendToTable(content: string, row: string): string {
        const tableEndIndex = content.indexOf("| Status |") + "| Status |".length;
        const secondLineIndex = content.indexOf("\n", tableEndIndex);
        const dividerEndIndex = content.indexOf("\n", secondLineIndex + 1);

        if (dividerEndIndex !== -1) {
            // Inserting after the divider line of the table
            return content.slice(0, dividerEndIndex + 1) + row + "\n" + content.slice(dividerEndIndex + 1);
        }
        return content + "\n" + row;
    }

    public async deleteSession(quizPath: string, sessionId: string): Promise<void> {
        const historyPath = normalizePath(this.getHistoryFilePath(quizPath));
        const historyFile = this.app.vault.getAbstractFileByPath(historyPath);

        if (!(historyFile instanceof TFile)) return;

        let content = await this.app.vault.read(historyFile);
        const shortId = sessionId.substring(0, 8);

        // 1. Remove table row
        // Looking for | shortId | ... | and the following newline(s)
        const tableRowRegex = new RegExp(`^\\|\\s*${shortId}\\s*\\|.*\\|\\s*$[\r\n]+`, 'm');
        content = content.replace(tableRowRegex, '');

        // 2. Remove detail block safely
        // Find the specific ID occurrence
        // We look for "id": "sessionId" or "id":"sessionId"
        const idPattern = `"id":\\s*"${sessionId}"`;
        const idRegex = new RegExp(idPattern);
        const match = content.match(idRegex);

        if (match && match.index !== undefined) {
            // Find start of this block (searching backwards for ## Attempt:)
            const blockStart = content.lastIndexOf("## Attempt:", match.index);

            // Find end of this block (searching forwards for ---)
            const blockEnd = content.indexOf("---", match.index);

            if (blockStart !== -1 && blockEnd !== -1) {
                // Include the --- in the deletion range (length is 3)
                // We also want to consume the newline after --- if possible
                const before = content.substring(0, blockStart);
                const after = content.substring(blockEnd + 3);
                content = before + after;
            }
        }

        // 3. Decrement attempts in frontmatter
        const attemptsMatch = content.match(/attempts: (\d+)/);
        if (attemptsMatch) {
            const newAttempts = Math.max(0, parseInt(attemptsMatch[1]) - 1);
            content = content.replace(/attempts: \d+/, `attempts: ${newAttempts}`);
        }

        // 4. Cleanup excessive newlines and whitespace
        // Ensure strictly one empty line between blocks
        content = content.replace(/\n{3,}/g, '\n\n').trim() + '\n';

        await this.app.vault.modify(historyFile, content);
    }

    public async getHistory(quizPath: string): Promise<ExamResult[]> {
        const historyPath = normalizePath(this.getHistoryFilePath(quizPath));
        const historyFile = this.app.vault.getAbstractFileByPath(historyPath);

        if (!(historyFile instanceof TFile)) {
            return [];
        }

        const content = await this.app.vault.read(historyFile);
        const results: ExamResult[] = [];
        // The regex needs to handle the leading "> " for the markers themselves when inside a callout
        const regex = /(?:>\s*)*<!-- SESSION_DATA_START -->\s*(?:>\s*)*```json\s*([\s\S]*?)\s*(?:>\s*)*```\s*(?:>\s*)*<!-- SESSION_DATA_END -->/g;

        let match;
        while ((match = regex.exec(content)) !== null) {
            try {
                // Remove the callout prefix '>' if it exists on each line of the captured JSON
                // We handle multiple levels of '>' and optional spaces, but ONLY at the start of the line
                const jsonString = match[1].split('\n').map(line => line.replace(/^(?:>\s*)+/, '')).join('\n');
                const rawData = JSON.parse(jsonString) as CompactExamResult;

                // Strictly using compact format
                results.push(this.decompressResult(rawData));
            } catch (e) {
                console.error("Failed to parse history session:", e);
            }
        }

        return results.sort((a, b) => b.timestamp - a.timestamp);
    }

    private compressResult(result: ExamResult): string {
        const compact = {
            id: result.sessionId,
            ts: result.timestamp,
            sc: result.totalScore,
            mSc: result.maxScore,
            pct: parseFloat(result.percentage.toFixed(1)),
            p: result.isPass,
            dur: parseFloat(result.durationSeconds.toFixed(1)),
            rng: result.questionRange,
            res: result.questionResults.map(qr => {
                const entry: Record<string, unknown> = {
                    q: qr.questionId,
                    o: qr.questionOrder,
                    ty: qr.questionType,
                    ok: qr.isCorrect,
                    s: qr.score,
                    st: qr.userAnswer.status,
                };
                if (qr.userAnswer.selectedOptionIndex !== undefined) entry.idx = qr.userAnswer.selectedOptionIndex;
                if (qr.userAnswer.selectedOptionIndices !== undefined) entry.idxs = qr.userAnswer.selectedOptionIndices;
                if (qr.userAnswer.booleanSelection !== undefined) entry.val = qr.userAnswer.booleanSelection;
                if (qr.userAnswer.textInputs !== undefined) entry.txt = qr.userAnswer.textInputs;
                if (typeof qr.userAnswer.manualCorrect === 'boolean') entry.mc = qr.userAnswer.manualCorrect;
                if (qr.userAnswer.gradingSource) entry.gs = qr.userAnswer.gradingSource;
                if (qr.userAnswer.aiConfidence) entry.gc = qr.userAnswer.aiConfidence;
                if (qr.userAnswer.aiRationale) entry.gr = qr.userAnswer.aiRationale;
                if (qr.userAnswer.matchedPairs !== undefined) entry.pts = qr.userAnswer.matchedPairs;
                if (qr.userAnswer.isMarked) entry.m = true;
                return entry;
            })
        };
        return JSON.stringify(compact);
    }

    private decompressResult(compact: CompactExamResult): ExamResult {
        return {
            sessionId: compact.id,
            timestamp: compact.ts,
            totalScore: compact.sc,
            maxScore: compact.mSc,
            percentage: compact.pct,
            isPass: compact.p,
            durationSeconds: compact.dur,
            questionRange: compact.rng,
            questionResults: compact.res.map((r) => ({
                questionId: r.q,
                questionOrder: r.o,
                questionType: r.ty,
                isCorrect: r.ok,
                score: r.s,
                userAnswer: {
                    questionId: r.q,
                    status: r.st,
                    selectedOptionIndex: r.idx,
                    selectedOptionIndices: r.idxs,
                    booleanSelection: r.val,
                    textInputs: r.txt,
                    manualCorrect: r.mc,
                    gradingSource: r.gs,
                    aiConfidence: r.gc,
                    aiRationale: r.gr,
                    matchedPairs: r.pts,
                    isMarked: r.m
                }
            }))
        };
    }
}
