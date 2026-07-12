export type QuestionType = 'MC' | 'SATA' | 'TF' | 'FIB' | 'MATCH' | 'SA' | 'LA';

export interface BaseQuestion {
    id: string; // Hash of the question text for stability
    type: QuestionType;
    questionText: string; // Markdown supported
    explanation?: string; // Optional text shown AFTER exam submission
    errors?: string[]; // Validation error messages
    order?: number; // Sequence number from source
}

export interface MultipleChoiceQuestion extends BaseQuestion {
    type: 'MC';
    options: string[]; // a, b, c... mapped by index 0, 1, 2...
    optionLabels?: string[]; // original labels from source (e.g. 'a', 'b', 'c')
    correctOptionIndex: number;
}

export interface SelectAllQuestion extends BaseQuestion {
    type: 'SATA';
    options: string[];
    optionLabels?: string[];
    correctOptionIndices: number[];
}

export interface TrueFalseQuestion extends BaseQuestion {
    type: 'TF';
    isTrue: boolean;
}

export interface FillInBlankQuestion extends BaseQuestion {
    type: 'FIB';
    segments: string[]; // "The capital of " ... " is " ...
    correctAnswers: string[]; // [ "France", "Paris" ] - aligned with gaps
}

export interface MatchingQuestion extends BaseQuestion {
    type: 'MATCH';
    leftItems: string[];
    rightItems: string[];
    pairs: Array<{ left: number, right: number }>; // Index mapping
}

export interface TextAnswerQuestion extends BaseQuestion {
    type: 'SA' | 'LA';
    correctAnswerText?: string; // For reference/self-grading
    keywords?: string[]; // Optional for auto-grading heuristic
}

export type Question =
    | MultipleChoiceQuestion
    | SelectAllQuestion
    | TrueFalseQuestion
    | FillInBlankQuestion
    | MatchingQuestion
    | TextAnswerQuestion;

export interface ExamDefinition {
    title: string;
    sourceFile: string; // Path to .md file
    questions: Question[];
    fullQuestions?: Question[]; // Original unfiltered list
    metadata: {
        timeLimitMinutes?: number; // 0 = unlimited
        passThreshold?: number; // 0.0 - 1.0 (default 0.70)
        shuffleQuestions?: boolean;
        showAnswer?: boolean;
        questionRange?: string; // e.g. "1-50", "100-", "-20"
        questionCount?: number;  // max questions to use (applied after range), e.g. 20
        rangeErrors?: string[];
    };
}

export type AnswerStatus = 'UNANSWERED' | 'ANSWERED' | 'FLAGGED';

export interface UserAnswerState {
    questionId: string;
    status: AnswerStatus;

    // Payload depends on question type
    selectedOptionIndex?: number;          // MC
    selectedOptionIndices?: number[];      // SATA
    booleanSelection?: boolean;            // TF
    textInputs?: string[];                 // FIB, SA, LA
    matchedPairs?: Array<{ l: number, r: number }>; // MATCH
    isMarked?: boolean;                    // Question marked by user
}

export interface ExamSession {
    definition: ExamDefinition;
    status: 'IDLE' | 'IN_PROGRESS' | 'PAUSED' | 'SUBMITTED' | 'REVIEW';
    startTime: number; // Unix timestamp
    endTime?: number;

    // Runtime overrides
    timeLimitSeconds: number;

    currentQuestionIndex: number;
    answers: Record<string, UserAnswerState>; // Keyed by Question ID

    // Adaptive Study mode
    isAdaptive?: boolean;
}

export interface QuestionResult {
    questionId: string;
    isCorrect: boolean;
    score: number; // 0.0 to 1.0
    userAnswer: UserAnswerState;
    feedback?: string;
}

export interface ExamResult {
    sessionId: string;
    timestamp: number;
    totalScore: number; // Raw points
    maxScore: number;   // Total possible points
    percentage: number; // 0.0 - 100.0
    isPass: boolean;
    durationSeconds: number;

    questionResults: QuestionResult[];
}

// --- Adaptive Study Types ---

export type QuestionCategory = 'MASTERED' | 'IMPROVING' | 'STRUGGLING' | 'FAILED' | 'UNSEEN';

export interface QuestionPerformance {
    questionId: string;
    questionOrder: number;       // Original sequence # in the source file
    totalAttempts: number;
    correctCount: number;
    incorrectCount: number;
    unansweredCount: number;
    successRate: number;         // correctCount / totalAttempts (0.0–1.0), -1 for never attempted
    lastAttemptCorrect: boolean;
    lastAttemptTimestamp: number;
    streak: number;              // Consecutive correct answers (resets on wrong/unanswered)
    category: QuestionCategory;
}

export interface FrontmatterResult {
    title?: string;
    timeLimit?: number;
    passThreshold?: number;
    shuffle?: boolean;
    showAnswer?: boolean;
    examRange?: string;
    examCount?: number;
    rangeErrors?: string[];
}

