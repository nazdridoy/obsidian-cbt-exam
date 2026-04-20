import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { TimerController } from "../../exam/timerController";

interface TimerProps {
    seconds: number;
    onExpire: () => void;
}

export const TimerDisplay: React.FC<TimerProps> = ({ seconds, onExpire }) => {
    const [timeLeft, setTimeLeft] = useState(seconds);
    const onExpireRef = useRef(onExpire);
    onExpireRef.current = onExpire;

    useEffect(() => {
        if (seconds <= 0) return; // Unlimited time

        const timer = new TimerController(
            seconds,
            (remaining) => setTimeLeft(remaining),
            () => { onExpireRef.current(); }
        );
        timer.start();

        return () => timer.stop();
    }, [seconds]); // Only restart when exam duration changes (e.g. new exam), not on parent re-renders

    if (seconds <= 0) return <span>No Time Limit</span>;

    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;

    // Warning levels
    let statusClass = "";
    if (timeLeft < 60) statusClass = "error";
    else if (timeLeft < 300) statusClass = "warning";

    return (
        <span className={`exam-timer ${statusClass}`}>
            {mins}:{secs.toString().padStart(2, '0')}
        </span>
    );
};
