import { App, TFile, normalizePath } from "obsidian";
import { QuestionPerformance } from "../types/types";

/**
 * Manages reading/writing performance data within {quiz}-history.md files.
 * The performance block is stored as a collapsible callout with JSON data.
 */

const PERF_BLOCK_REGEX = /\n*> \[!example\]- Performance Data\n(?:>.*\n)*/g;

interface PerformanceDataBlock {
    version: 1;
    updatedAt: number;
    questions: Record<string, {
        o: number;   // questionOrder
        t: number;   // totalAttempts
        c: number;   // correctCount
        i: number;   // incorrectCount
        u: number;   // unansweredCount
        sr: number;  // successRate
        lc: boolean; // lastAttemptCorrect
        lt: number;  // lastAttemptTimestamp
        st: number;  // streak
        cat: string; // category
    }>;
}

export class PerformanceManager {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    private getHistoryFilePath(quizPath: string): string {
        const dir = quizPath.substring(0, quizPath.lastIndexOf('/') + 1);
        const basename = quizPath.substring(quizPath.lastIndexOf('/') + 1).replace(/\.md$/, '');
        return `${dir}${basename}-history.md`;
    }

    /**
     * Read performance data from the history file.
     * Returns null if no performance data block exists.
     */
    async readPerformanceData(quizPath: string): Promise<Map<string, QuestionPerformance> | null> {
        const historyPath = normalizePath(this.getHistoryFilePath(quizPath));
        const file = this.app.vault.getAbstractFileByPath(historyPath);

        if (!(file instanceof TFile)) return null;

        const content = await this.app.vault.read(file);

        // Find the performance data block
        const startMarker = '<!-- PERFORMANCE_DATA_START -->';
        const endMarker = '<!-- PERFORMANCE_DATA_END -->';

        const startIdx = content.lastIndexOf(startMarker);
        if (startIdx === -1) return null;

        const endIdx = content.indexOf(endMarker, startIdx);
        if (endIdx === -1) return null;

        // Extract JSON between the markers, stripping callout prefixes
        const blockContent = content.substring(startIdx + startMarker.length, endIdx);

        // Find the JSON inside the ```json ... ``` block
        const jsonMatch = blockContent.match(/```json\s*([\s\S]*?)\s*```/);
        if (!jsonMatch) return null;

        try {
            const jsonString = jsonMatch[1].split('\n').map(line => line.replace(/^(?:>\s*)+/, '')).join('\n');
            const data = JSON.parse(jsonString) as PerformanceDataBlock;
            return this.decompress(data);
        } catch (e) {
            console.error("Failed to parse performance data:", e);
            return null;
        }
    }

    /**
     * Write performance data to the history file.
     * Strips any existing performance block, then appends the new one.
     */
    async writePerformanceData(
        quizPath: string,
        performanceMap: Map<string, QuestionPerformance>
    ): Promise<void> {
        const historyPath = normalizePath(this.getHistoryFilePath(quizPath));
        const file = this.app.vault.getAbstractFileByPath(historyPath);

        if (!(file instanceof TFile)) return;

        const compressed = this.compress(performanceMap);
        const jsonStr = JSON.stringify(compressed);

        const perfBlock = `\n\n> [!example]- Performance Data\n> <!-- PERFORMANCE_DATA_START -->\n> \`\`\`json\n> ${jsonStr}\n> \`\`\`\n> <!-- PERFORMANCE_DATA_END -->\n`;

        await this.app.vault.process(file, (content) => {
            // Strip existing performance block
            const stripped = content.replace(PERF_BLOCK_REGEX, '');
            // Append new block
            return stripped.trimEnd() + perfBlock;
        });
    }

    private compress(perfMap: Map<string, QuestionPerformance>): PerformanceDataBlock {
        const questions: PerformanceDataBlock['questions'] = {};
        for (const [id, p] of perfMap) {
            questions[id] = {
                o: p.questionOrder,
                t: p.totalAttempts,
                c: p.correctCount,
                i: p.incorrectCount,
                u: p.unansweredCount,
                sr: p.successRate,
                lc: p.lastAttemptCorrect,
                lt: p.lastAttemptTimestamp,
                st: p.streak,
                cat: p.category,
            };
        }
        return { version: 1, updatedAt: Date.now(), questions };
    }

    private decompress(data: PerformanceDataBlock): Map<string, QuestionPerformance> {
        const map = new Map<string, QuestionPerformance>();
        for (const [id, q] of Object.entries(data.questions)) {
            map.set(id, {
                questionId: id,
                questionOrder: q.o,
                totalAttempts: q.t,
                correctCount: q.c,
                incorrectCount: q.i,
                unansweredCount: q.u,
                successRate: q.sr,
                lastAttemptCorrect: q.lc,
                lastAttemptTimestamp: q.lt,
                streak: q.st,
                category: q.cat as QuestionPerformance['category'],
            });
        }
        return map;
    }
}
