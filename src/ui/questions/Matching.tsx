import * as React from "react";
import { MatchingQuestion, UserAnswerState } from "../../types/types";

interface Props {
    question: MatchingQuestion;
    answer: UserAnswerState;
    onChange: (ans: Partial<UserAnswerState>) => void;
    readOnly?: boolean;
    showResult?: boolean;
}

export const Matching: React.FC<Props> = ({ question, answer, onChange, readOnly, showResult }) => {
    // State for shuffled indices of the right column
    const [rightIndices, setRightIndices] = React.useState<number[]>([]);

    React.useEffect(() => {
        // Initialize or re-shuffle when question changes
        const indices = question.rightItems.map((_, i) => i);
        // Fisher-Yates shuffle
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        setRightIndices(indices);
    }, [question.id]);

    const [selectedLeft, setSelectedLeft] = React.useState<number | null>(null);

    // Current pairs: from answer state
    const pairs = answer.matchedPairs || [];

    // Randomized indices for Right Side (should ideally be consistent per session, 
    // but for now we'll just map them 1:1 visually and let the randomization happen at exam initialization if needed.
    // Wait, the specification says "Group B is automatically shuffled". 
    // But the question object has `rightItems` in original order. 
    // We need to map visual buttons to actual data indices.
    // For V1 simplicity: Assume backend randomization or just display as is. 
    // Let's assume `question.rightItems` are ALREADY shuffled by the parser/session init if desired.
    // (Our parser currently keeps them aligned 0-0, 1-1). 
    // We should probably shuffle the DISPLAY order here if we want runtime shuffling.
    // To keep it simple: We won't shuffle in the Component for this step, just render.

    // Helpers to find connection
    const getRightForLeft = (lIdx: number) => pairs.find(p => p.l === lIdx)?.r;
    const getLeftForRight = (rIdx: number) => pairs.find(p => p.r === rIdx)?.l;

    const handleLeftClick = (idx: number) => {
        if (readOnly || showResult) return;
        // If already paired, unpair
        const existingRight = getRightForLeft(idx);
        if (existingRight !== undefined) {
            onChange({ matchedPairs: pairs.filter(p => p.l !== idx) });
            return;
        }
        setSelectedLeft(idx);
    };

    const handleRightClick = (dataIdx: number) => {
        if (readOnly || showResult) return;
        if (selectedLeft !== null) {
            // Pair them!
            // Remove any existing pairs for these items
            const newPairs = pairs.filter(p => p.l !== selectedLeft && p.r !== dataIdx);
            newPairs.push({ l: selectedLeft, r: dataIdx });
            onChange({ matchedPairs: newPairs });
            setSelectedLeft(null);
        } else {
            // If clicked right item is paired, unpair its left counterpart?
            const existingLeft = getLeftForRight(dataIdx);
            if (existingLeft !== undefined) {
                onChange({ matchedPairs: pairs.filter(p => p.l !== existingLeft) });
            }
        }
    };

    // Generate colors/badges for matched pairs
    // We use a simple number badge 1, 2, 3... based on the Left item index + 1

    // If we haven't initialized shuffling yet (first render), render nothing or loading
    if (rightIndices.length !== question.rightItems.length) return null;

    return (
        <div className="question-matching">
            <div className="question-text" style={{ marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>
                {question.questionText}
            </div>

            <div className="matching-columns" style={{ display: 'flex', gap: '2rem' }}>
                {/* Left Column */}
                <div className="column left" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Items</div>
                    {question.leftItems.map((item, idx) => {
                        const isSelected = selectedLeft === idx;
                        const isPaired = getRightForLeft(idx) !== undefined;

                        return (
                            <div
                                key={`l-${idx}`}
                                onClick={() => handleLeftClick(idx)}
                                style={{
                                    padding: '0.8rem',
                                    border: `1px solid ${isSelected ? 'var(--interactive-accent)' : 'var(--background-modifier-border)'}`,
                                    borderRadius: '6px',
                                    cursor: (readOnly || showResult) ? 'default' : 'pointer',
                                    backgroundColor: isSelected ? 'var(--interactive-accent-opacity)' : (isPaired ? 'var(--background-secondary)' : 'transparent'),
                                    position: 'relative'
                                }}
                            >
                                {item}
                                {isPaired && <span className="badge" style={{
                                    position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)',
                                    background: 'var(--interactive-accent)', color: 'white', borderRadius: '50%', width: '20px', height: '20px',
                                    display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.8em'
                                }}>{idx + 1}</span>}
                            </div>
                        );
                    })}
                </div>

                {/* Right Column */}
                <div className="column right" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Matches</div>
                    {rightIndices.map((dataIdx, visualIdx) => {
                        const item = question.rightItems[dataIdx];
                        const pairedLeft = getLeftForRight(dataIdx);
                        const isPaired = pairedLeft !== undefined;

                        // Correct logic: dataIdx should match Left[dataIdx]
                        const isCorrectPair = pairedLeft === dataIdx;

                        let borderColor = 'var(--background-modifier-border)';
                        let bgColor = 'transparent';

                        if (showResult) {
                            // In showResult, we don't necessarily highlight the box border unless user selected something
                            if (isPaired) {
                                borderColor = isCorrectPair ? 'var(--color-green)' : 'var(--color-red)';
                                bgColor = isCorrectPair ? 'rgba(var(--color-green-rgb), 0.1)' : 'rgba(var(--color-red-rgb), 0.1)';
                            }
                        } else if (isPaired) {
                            borderColor = 'var(--interactive-accent)';
                            bgColor = 'var(--background-secondary)';
                        }

                        return (
                            <div
                                key={`r-${visualIdx}-${dataIdx}`}
                                onClick={() => handleRightClick(dataIdx)}
                                style={{
                                    padding: '0.8rem',
                                    border: `1px solid ${borderColor}`,
                                    borderRadius: '6px',
                                    cursor: (readOnly || showResult) ? 'default' : 'pointer',
                                    backgroundColor: bgColor,
                                    position: 'relative',
                                    minHeight: '44px' // Ensure height for badges
                                }}
                            >
                                {item}

                                {/* User Badge */}
                                {isPaired && <span className="badge-user" style={{
                                    position: 'absolute', right: showResult && !isCorrectPair ? '30px' : '5px', top: '50%', transform: 'translateY(-50%)',
                                    background: showResult ? (isCorrectPair ? 'var(--color-green)' : 'var(--color-red)') : 'var(--interactive-accent)',
                                    color: 'white', borderRadius: '50%', width: '20px', height: '20px',
                                    display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.8em',
                                    zIndex: 2
                                }}>{pairedLeft! + 1}</span>}

                                {/* Correct Answer Badge (Only shown in showResult/Review if user was wrong or didn't answer) */}
                                {showResult && !isCorrectPair && (
                                    <span className="badge-correct" style={{
                                        position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)',
                                        background: 'var(--color-green)',
                                        color: 'white', borderRadius: '50%', width: '20px', height: '20px',
                                        display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.8em',
                                        zIndex: 1
                                    }}>
                                        {dataIdx + 1}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            <div style={{ marginTop: '1rem', fontSize: '0.8em', color: 'var(--text-muted)' }}>
                Select an item on the left, then click its match on the right.
            </div>
        </div>
    );
};
