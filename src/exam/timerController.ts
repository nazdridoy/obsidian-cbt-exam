export class TimerController {
    private remainingSeconds: number;
    private onTick: (remaining: number) => void;
    private onExpire: () => void;
    private intervalId: number | null = null;
    private endTime: number;

    constructor(durationSeconds: number, onTick: (t: number) => void, onExpire: () => void) {
        this.remainingSeconds = durationSeconds;
        this.onTick = onTick;
        this.onExpire = onExpire;
        this.endTime = Date.now() + (durationSeconds * 1000);
    }

    public start() {
        if (this.intervalId) return;
        this.endTime = Date.now() + (this.remainingSeconds * 1000);

        this.intervalId = window.setInterval(() => {
            const now = Date.now();
            const left = Math.ceil((this.endTime - now) / 1000);

            this.remainingSeconds = left;
            this.onTick(left);

            if (left <= 0) {
                this.stop();
                this.onExpire();
            }
        }, 1000);
    }

    public stop() {
        if (this.intervalId) {
            window.clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    public getRemaining(): number {
        return this.remainingSeconds;
    }
}
