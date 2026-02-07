import { Question, QuestionType, ExamDefinition, MultipleChoiceQuestion, SelectAllQuestion, MatchingQuestion, TrueFalseQuestion, FillInBlankQuestion, TextAnswerQuestion, FrontmatterResult } from "../types/types";

// Regex patterns
const HEADER_REGEX = /^@(\w+)\s+(.*)/;
const Q_NUMBER_REGEX = /^(\d+)[).]\s*/;
const OPTION_REGEX = /^(\S+)([).])\s+(.*)/;
const MATCH_PAIR_REGEX = /^(.+?)\s*\|\s*(.+)$/; // Left | Right

// Extended type for matching question during parsing
interface MatchingQuestionWithRawPairs extends MatchingQuestion {
    _rawPairs?: Array<{ left: string; right: string }>;
}

export class FlashQuizParser {

    public static parse(content: string, filePath: string): ExamDefinition {
        const lines = content.split('\n');
        const questions: Question[] = [];
        const usedNumbers = new Set<number>();
        let currentQ: Partial<Question> & { _rawPairs?: Array<{ left: string; right: string }>, _labels?: string[], _answerKeys?: string[] } | null = null;

        // Metadata extraction (simple frontmatter regex)
        // Note: Obsidian usually handles frontmatter, but for raw text parsing we might need this.
        // For now, we assume we receive the full text.
        const metadata = this.parseFrontmatter(content);

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Ignore separator lines or headers not part of questions
            if (line.match(/^---/) || line.match(/^#/)) continue;

            // 1. Detect New Question
            const headerMatch = line.match(HEADER_REGEX);
            if (headerMatch) {
                if (currentQ) {
                    this.finalizeQuestion(questions, currentQ);
                }

                const typeMarker = headerMatch[1].toLowerCase();
                let remainingText = headerMatch[2];
                const type = this.mapType(typeMarker);

                if (type) {
                    currentQ = {
                        id: this.generateId(remainingText), // Stable ID based on question text
                        type: type,
                        questionText: "",
                        errors: [],
                        // Initialize type-specific arrays
                        options: (type === 'MC' || type === 'SATA') ? [] : undefined,
                        pairs: (type === 'MATCH') ? [] : undefined,
                        leftItems: (type === 'MATCH') ? [] : undefined,
                        rightItems: (type === 'MATCH') ? [] : undefined,
                        _rawPairs: (type === 'MATCH') ? [] : undefined,
                        _labels: (type === 'MC' || type === 'SATA') ? [] : undefined,
                        _answerKeys: (type === 'MC' || type === 'SATA') ? [] : undefined
                    } as Partial<Question> & { _rawPairs?: Array<{ left: string; right: string }>, _labels?: string[], _answerKeys?: string[] };

                    // 1.1 Detect and validate question number
                    const numberMatch = remainingText.match(Q_NUMBER_REGEX);
                    if (numberMatch) {
                        const numStr = numberMatch[1];
                        const num = parseInt(numStr);
                        currentQ.order = num;
                        remainingText = remainingText.substring(numberMatch[0].length);

                        if (usedNumbers.has(num)) {
                            currentQ.errors?.push(`Duplicate question number '${num}' found.`);
                        }
                        usedNumbers.add(num);
                    } else {
                        // Check if there is SOMETHING that looks like a number but failed the strict regex
                        const looseMatch = remainingText.match(/^(\S+)[).]\s*/);
                        if (looseMatch) {
                            currentQ.errors?.push(`Invalid question number format '${looseMatch[1]}'. Only [0-9] digits are allowed.`);
                            remainingText = remainingText.substring(looseMatch[0].length);
                        } else {
                            currentQ.errors?.push("Question is missing a sequence number.");
                        }
                    }
                    currentQ.questionText = remainingText;
                }
                continue;
            }

            // 2. Detect Answer Key
            if (line.startsWith('=')) {
                if (currentQ) {
                    const answerText = line.substring(1).trim();
                    this.parseAnswer(currentQ, answerText);
                }
                continue;
            }

            // 3. Parse Content based on Type
            if (currentQ) {
                if (currentQ.type === 'MC' || currentQ.type === 'SATA') {
                    const optionMatch = line.match(OPTION_REGEX);
                    if (optionMatch) {
                        // It's an option: "a) Content"
                        // ensure options array exists
                        if (!(currentQ as MultipleChoiceQuestion).options) (currentQ as MultipleChoiceQuestion).options = [];
                        (currentQ as MultipleChoiceQuestion).options.push(optionMatch[3]);
                        if (currentQ._labels) currentQ._labels.push(optionMatch[1] + optionMatch[2]);
                    } else {
                        // It's continuation of question text? Or continuation of previous option?
                        // For simplicity, assume multiline question text if no option start
                        if ((currentQ as MultipleChoiceQuestion).options.length === 0) {
                            currentQ.questionText += '\n' + line;
                        }
                    }
                } else if (currentQ.type === 'MATCH') {
                    const pairMatch = line.match(MATCH_PAIR_REGEX);
                    if (pairMatch) {
                        const left = pairMatch[1].trim();
                        const right = pairMatch[2].trim();
                        // We temporarily store raw pairs, finalize will convert to indices
                        if (!currentQ._rawPairs) currentQ._rawPairs = [];
                        currentQ._rawPairs.push({ left, right });
                    } else {
                        currentQ.questionText += '\n' + line;
                    }
                } else {
                    // TF, FIB, SA, LA - usually just text until the answer key
                    currentQ.questionText += '\n' + line;
                }
            }
        }

        if (currentQ) {
            this.finalizeQuestion(questions, currentQ);
        }

        // 4. Sort questions by order if present
        questions.sort((a, b) => {
            const orderA = a.order ?? Infinity;
            const orderB = b.order ?? Infinity;
            return orderA - orderB;
        });

        // 5. Apply range filter if present
        let finalQuestions = questions;
        const rangeErrors: string[] = [];

        if (metadata.examRange && metadata.examRange !== "-") {
            const result = this.applyRangeFilter(questions, metadata.examRange);
            finalQuestions = result.filtered;
            rangeErrors.push(...result.errors);
        }

        return {
            title: metadata.title || 'Untitled Exam',
            sourceFile: filePath,
            questions: finalQuestions,
            fullQuestions: questions,
            metadata: {
                timeLimitMinutes: metadata.timeLimit,
                passThreshold: metadata.passThreshold,
                shuffleQuestions: metadata.shuffle,
                showAnswer: metadata.showAnswer,
                questionRange: metadata.examRange,
                rangeErrors: rangeErrors.length > 0 ? rangeErrors : undefined
            }
        };
    }

    private static applyRangeFilter(questions: Question[], rangeStr: string): { filtered: Question[], errors: string[] } {
        const errors: string[] = [];
        const segments = rangeStr.split(',').map(s => s.trim()).filter(s => s.length > 0);

        const includedIndices = new Set<number>();
        let hasValidSegment = false;
        let openStartValue: number | null = null;
        let openEndValue: number | null = null;

        for (const segment of segments) {
            // Check for invalid characters (only digits and - allowed)
            if (/[^0-9-]/.test(segment)) {
                errors.push(`Invalid range segment '${segment}'. Only numbers and '-' are allowed.`);
                continue;
            }

            const parts = segment.split('-');

            if (parts.length === 1) {
                // Single value: "10"
                const val = parseInt(parts[0]);
                if (isNaN(val)) {
                    errors.push(`Invalid number '${parts[0]}' in segment '${segment}'.`);
                    continue;
                }
                includedIndices.add(val);
                hasValidSegment = true;
            } else if (parts.length === 2) {
                const sStr = parts[0].trim();
                const eStr = parts[1].trim();

                if (sStr === "" && eStr === "") {
                    errors.push(`Invalid range format '${segment}'.`);
                    continue;
                }

                if (sStr === "") {
                    // Open start: "-10"
                    if (openStartValue !== null) {
                        errors.push(`Multiple open-start ranges found ('-${openStartValue}' and '${segment}').`);
                    }
                    openStartValue = parseInt(eStr);
                    if (isNaN(openStartValue)) {
                        errors.push(`Invalid number '${eStr}' in segment '${segment}'.`);
                        openStartValue = null;
                    } else {
                        hasValidSegment = true;
                    }
                } else if (eStr === "") {
                    // Open end: "10-"
                    if (openEndValue !== null) {
                        errors.push(`Multiple open-end ranges found ('${openEndValue}-' and '${segment}').`);
                    }
                    openEndValue = parseInt(sStr);
                    if (isNaN(openEndValue)) {
                        errors.push(`Invalid number '${sStr}' in segment '${segment}'.`);
                        openEndValue = null;
                    } else {
                        hasValidSegment = true;
                    }
                } else {
                    // Closed range: "10-20"
                    const start = parseInt(sStr);
                    const end = parseInt(eStr);

                    if (isNaN(start) || isNaN(end)) {
                        errors.push(`Invalid numbers in range '${segment}'.`);
                        continue;
                    }

                    if (start > end) {
                        errors.push(`Invalid range '${segment}' (start > end).`);
                        continue;
                    }

                    for (let i = start; i <= end; i++) {
                        includedIndices.add(i);
                    }
                    hasValidSegment = true;
                }
            } else {
                // More than one dash: "1-5-10"
                errors.push(`Invalid range format '${segment}'.`);
            }
        }

        if (!hasValidSegment && segments.length > 0) {
            errors.push(`No valid range segments found in '${rangeStr}'. Using full exam.`);
            return { filtered: questions, errors };
        }

        const filtered = questions.filter(q => {
            if (q.order === undefined) return true;
            if (includedIndices.has(q.order)) return true;
            if (openStartValue !== null && q.order <= openStartValue) return true;
            if (openEndValue !== null && q.order >= openEndValue) return true;
            return false;
        });

        return { filtered, errors };
    }

    private static mapType(marker: string): QuestionType | null {
        switch (marker) {
            case 'mc': return 'MC';
            case 'sata': return 'SATA';
            case 'tf': return 'TF';
            case 'fib': return 'FIB';
            case 'match': return 'MATCH';
            case 'sa': return 'SA';
            case 'la': return 'LA';
            default: return null;
        }
    }

    private static generateId(text: string): string {
        // Simple hash for ID
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(36);
    }

    private static parseFrontmatter(content: string): FrontmatterResult {
        // Very basic frontmatter parser
        const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
        const match = content.match(frontmatterRegex);
        if (!match) return {};

        const yaml = match[1];
        const result: FrontmatterResult = {};

        const titleMatch = yaml.match(/quiz-title:\s*(.*)/);
        if (titleMatch) result.title = titleMatch[1].replace(/['"]/g, '').trim();

        const timeMatch = yaml.match(/time-limit:\s*(\d+)/);
        if (timeMatch) result.timeLimit = parseInt(timeMatch[1]);

        const passMatch = yaml.match(/pass-score:\s*(\d+)/); // e.g. 75
        if (passMatch) result.passThreshold = parseInt(passMatch[1]) / 100;

        const shuffleMatch = yaml.match(/shuffle:\s*(true|false)/);
        if (shuffleMatch) result.shuffle = shuffleMatch[1] === 'true';

        const showAnswerMatch = yaml.match(/show-answer:\s*(true|false)/);
        if (showAnswerMatch) result.showAnswer = showAnswerMatch[1] === 'true';

        const rangeMatch = yaml.match(/exam-range:\s*(.*)/);
        if (rangeMatch) result.examRange = rangeMatch[1].replace(/['"]/g, '').trim();

        return result;
    }

    private static parseAnswer(q: Partial<Question> & { _answerKeys?: string[] }, answerText: string): void {
        switch (q.type) {
            case 'MC': {
                // Store the raw answer key, will be resolved in finalize
                if (q._answerKeys) {
                    q._answerKeys.push(answerText.trim().toLowerCase());
                } else {
                    // For safety if _answerKeys isn't there
                    const mcIdx = answerText.toLowerCase().charCodeAt(0) - 97;
                    (q as MultipleChoiceQuestion).correctOptionIndex = mcIdx;
                }
                break;
            }
            case 'SATA': {
                // = a, c, e
                const keys = answerText.split(',').map(s => s.trim().toLowerCase());
                if (q._answerKeys) {
                    q._answerKeys.push(...keys);
                } else {
                    const indices = keys.map(k => k.charCodeAt(0) - 97);
                    (q as SelectAllQuestion).correctOptionIndices = indices;
                }
                break;
            }
            case 'TF': {
                // = true
                (q as TrueFalseQuestion).isTrue = (answerText.toLowerCase() === 'true');
                break;
            }
            case 'FIB': {
                // = Answer1, Answer2
                // Also need to parse the blanks in the text "The `____` is..."
                const answers = answerText.split(',').map(s => s.trim());
                (q as FillInBlankQuestion).correctAnswers = answers;

                // Construct segments from question text
                const parts = q.questionText?.split(/`_+`/) || [];
                (q as FillInBlankQuestion).segments = parts;
                break;
            }
            case 'MATCH': {
                break;
            }
            case 'SA':
            case 'LA': {
                (q as TextAnswerQuestion).correctAnswerText = answerText;
                break;
            }
        }
    }

    private static finalizeQuestion(list: Question[], q: Partial<Question> & { _rawPairs?: Array<{ left: string; right: string }>, _labels?: string[], _answerKeys?: string[] }): void {
        // Post-processing
        if (q.type === 'MATCH') {
            const mq = q as MatchingQuestionWithRawPairs;
            if (!mq._rawPairs) return; // Invalid?

            mq.leftItems = [];
            mq.rightItems = [];
            mq.pairs = [];

            mq._rawPairs.forEach((pair, idx) => {
                mq.leftItems.push(pair.left);
                mq.rightItems.push(pair.right);
                mq.pairs.push({ left: idx, right: idx }); // Initially 0-0, 1-1 because input is aligned
            });
            delete mq._rawPairs;
        }

        // Handle MC/SATA labeling and validations
        if ((q.type === 'MC' || q.type === 'SATA') && q._labels) {
            const labels = q._labels;
            const seenLabels = new Set<string>();

            if (labels.length > 26) {
                q.errors?.push("Question has more than 26 options. Maximum allowed is 26 (a-z).");
            }

            for (const labelWithSep of labels) {
                const rawLabel = labelWithSep.replace(/[).]$/, '');
                if (!/^[a-z]$/.test(rawLabel)) {
                    q.errors?.push(`Invalid option label '${rawLabel}'. Labels must be lowercase 'a' through 'z'.`);
                }
                const label = rawLabel.toLowerCase();
                if (seenLabels.has(label)) {
                    q.errors?.push(`Duplicate option label '${label}' found. Each option must have a unique label.`);
                }
                seenLabels.add(label);
            }

            // --- Option Sequencing (Alphabetical) ---
            // Combine labels and options to sort them together
            const optionItems = labels.map((l, idx) => ({
                label: l,
                content: (q as MultipleChoiceQuestion).options[idx]
            }));

            // Sort by the label (lowercase, stripped of separator)
            optionItems.sort((a, b) => {
                const labelA = a.label.replace(/[).]$/, '').toLowerCase();
                const labelB = b.label.replace(/[).]$/, '').toLowerCase();
                return labelA.localeCompare(labelB);
            });

            // Re-assign sorted values
            labels.length = 0;
            (q as MultipleChoiceQuestion).options.length = 0;
            optionItems.forEach(item => {
                labels.push(item.label);
                (q as MultipleChoiceQuestion).options.push(item.content);
            });
            // ----------------------------------------

            // Resolve answer keys to indices
            if (q._answerKeys) {
                const labelToIndex = new Map<string, number>();
                labels.forEach((l, idx) => {
                    // Strip the separator for mapping logic (e.g., 'a)' -> 'a')
                    const key = l.replace(/[).]$/, '').toLowerCase();
                    labelToIndex.set(key, idx);
                });

                if (q.type === 'MC') {
                    const key = q._answerKeys[0];
                    const idx = labelToIndex.get(key);
                    (q as MultipleChoiceQuestion).correctOptionIndex = idx !== undefined ? idx : -1;
                    (q as MultipleChoiceQuestion).optionLabels = labels;
                    if (idx === undefined) {
                        q.errors?.push(`Correct answer label '${key}' does not match any existing options.`);
                    }
                } else if (q.type === 'SATA') {
                    const indices: number[] = [];
                    q._answerKeys.forEach(k => {
                        const idx = labelToIndex.get(k);
                        if (idx !== undefined) indices.push(idx);
                        else {
                            q.errors?.push(`Correct answer label '${k}' does not match any existing options.`);
                        }
                    });
                    (q as SelectAllQuestion).correctOptionIndices = indices;
                    (q as SelectAllQuestion).optionLabels = labels;
                }
            } else {
                // If no answer key, still store labels
                (q as MultipleChoiceQuestion).optionLabels = labels;
            }

            delete q._labels;
            delete q._answerKeys;
        }

        // Basic Validation
        if (!q.id || !q.questionText) return;

        list.push(q as Question);
    }
}
