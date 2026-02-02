import * as React from "react";
import { useEffect, useState } from "react";
import { TimerController } from "../../exam/timerController";

interface TimerProps {
    seconds: number;
    onExpire: () => void;
}

export const TimerDisplay: React.FC<TimerProps> = ({ seconds, onExpire }) => {
    const [timeLeft, setTimeLeft] = useState(seconds);

    useEffect(() => {
        if (seconds <= 0) return; // Unlimited time

        const timer = new TimerController(
            seconds,
            (remaining) => setTimeLeft(remaining),
            onExpire
        );
        timer.start();

        return () => timer.stop();
    }, [seconds]); // Restart if duration changes

    if (seconds <= 0) return <span>No Time Limit</span>;

    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;

    // Warning colors
    const style = timeLeft < 60 ? { color: 'var(--text-error)' } :
        timeLeft < 300 ? { color: 'var(--text-warning)' } : {};

    return (
        <span className="exam-timer" style={{ fontWeight: 'bold', ...style }}>
            {mins}:{secs.toString().padStart(2, '0')}
        </span>
    );
};
