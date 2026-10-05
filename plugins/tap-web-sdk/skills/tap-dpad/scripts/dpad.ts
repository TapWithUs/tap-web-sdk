/** D-Pad: swipe, pinch, or hold a pinch to rotate or drag (Tap v2). */

const NONE = 100;
const LEFT = 101;
const RIGHT = 102;
const UP = 103;
const DOWN = 104;
const FIST_HOLD = 114;

const SWIPES: Record<number, 'left' | 'right' | 'up' | 'down'> = {
    [LEFT]: 'left',
    [RIGHT]: 'right',
    [UP]: 'up',
    [DOWN]: 'down',
};
const PINCHES: Record<number, number> = { 105: 0, 106: 1, 107: 2, 108: 3 };
const HOLDS: Record<number, number> = { 110: 0, 111: 1, 112: 2, 113: 3 };

export type DpadMode = 'pending' | 'rotate' | 'drag';

export type DpadEvent =
    | ['direction', 'left' | 'right' | 'up' | 'down']
    | ['pinch', number]
    | ['hold', number]
    | ['mode', 'rotate' | 'drag']
    | ['rotate', number]
    | ['drag', number, number]
    | ['release', number]
    | ['hide']
    | ['show'];

/**
 * Turns air-gesture codes plus IMU motion into D-Pad events.
 * Pass `now` in seconds (performance.now() / 1000).
 */
export class DpadStateMachine {
    readonly rotateLockDeg: number;
    readonly lockWindowS: number;
    readonly releaseAfter: number;
    readonly showAfter: number;
    readonly debounceS: number;
    held: number | null = null;
    mode: DpadMode | null = null;
    hidden = false;
    private holdStart = 0;
    private refRoll: number | null = null;
    private lastRoll: number | null = null;
    private rollTravel = 0;
    private noneCount = 0;
    private lastCode: number | null = null;
    private lastCodeT = -1;

    constructor(
        rotateLockDeg = 25,
        lockWindowS = 1,
        releaseAfter = 4,
        showAfter = 2,
        debounceS = 0.04,
    ) {
        this.rotateLockDeg = rotateLockDeg;
        this.lockWindowS = lockWindowS;
        this.releaseAfter = releaseAfter;
        this.showAfter = showAfter;
        this.debounceS = debounceS;
    }

    private debounced(code: number, now: number): boolean {
        if (code === this.lastCode && now - this.lastCodeT < this.debounceS) {
            return true;
        }
        this.lastCode = code;
        this.lastCodeT = now;
        return false;
    }

    private release(): DpadEvent[] {
        const events: DpadEvent[] = this.held !== null ? [['release', this.held]] : [];
        this.held = null;
        this.mode = null;
        this.refRoll = null;
        this.lastRoll = null;
        this.noneCount = 0;
        return events;
    }

    private lock(mode: 'rotate' | 'drag'): DpadEvent[] {
        this.mode = mode;
        return [['mode', mode]];
    }

    /** Lock drag or rotate when the twist window ends without a new motion packet. */
    tick(now: number): DpadEvent[] {
        if (this.mode === 'pending' && now - this.holdStart >= this.lockWindowS) {
            return this.lock(this.rollTravel >= this.rotateLockDeg ? 'rotate' : 'drag');
        }
        return [];
    }

    onGesture(code: number, now: number): DpadEvent[] {
        const events = this.tick(now);
        if (code === NONE) {
            this.noneCount += 1;
            if (this.hidden && this.noneCount >= this.showAfter) {
                this.hidden = false;
                this.noneCount = 0;
                events.push(['show']);
            } else if (this.held !== null && this.noneCount >= this.releaseAfter) {
                events.push(...this.release());
            }
            return events;
        }
        if (this.hidden) {
            return events;
        }
        this.noneCount = 0;

        if (code === FIST_HOLD) {
            if (!this.debounced(code, now)) {
                events.push(...this.release());
                this.hidden = true;
                events.push(['hide']);
            }
        } else if (code in SWIPES) {
            if (!this.debounced(code, now)) {
                events.push(['direction', SWIPES[code]]);
            }
        } else if (code in HOLDS) {
            const index = HOLDS[code];
            if (index !== this.held && !this.debounced(code, now)) {
                events.push(...this.release());
                this.held = index;
                this.mode = 'pending';
                this.holdStart = now;
                this.rollTravel = 0;
                events.push(['hold', index]);
            }
        } else if (code in PINCHES) {
            if (this.held === null && !this.debounced(code, now)) {
                events.push(['pinch', PINCHES[code]]);
            }
        }
        return events;
    }

    onMotion(dx: number, dy: number, roll: number, now: number): DpadEvent[] {
        const events = this.tick(now);
        if (this.held === null) {
            return events;
        }
        if (this.mode === 'drag') {
            if (dx || dy) {
                events.push(['drag', dx, dy]);
            }
            return events;
        }
        if (this.lastRoll !== null) {
            this.rollTravel += Math.abs(roll - this.lastRoll);
        }
        this.lastRoll = roll;
        if (this.refRoll === null) {
            this.refRoll = roll;
        }
        if (this.mode === 'pending' && this.rollTravel >= this.rotateLockDeg) {
            events.push(...this.lock('rotate'));
        }
        events.push(['rotate', roll - this.refRoll]);
        return events;
    }
}
