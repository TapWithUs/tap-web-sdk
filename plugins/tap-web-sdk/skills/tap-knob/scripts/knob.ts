/** Knob: hold a pinch and twist the hand to turn a value up or down (Tap v2). */

const HOLD_CODES: Record<number, number> = { 110: 0, 111: 1, 112: 2, 113: 3 };
const NONE_CODE = 100;

/** Shortest signed angle, so crossing +/-180 does not jump. */
export function wrapDegrees(delta: number): number {
    return ((((delta + 180) % 360) + 360) % 360) - 180;
}

export type KnobEvent = 'start' | 'release';

/**
 * Turns air-gesture codes plus IMU roll into knob steps.
 *
 * onGesture(code) -> "start" | "release" | null
 * onRoll(roll)    -> signed int steps (0 when idle)
 * active          -> knob index 0-3 while a pinch is held, else null
 */
export class KnobTracker {
    readonly stepDeg: number;
    readonly releaseAfter: number;
    active: number | null = null;
    private anchor: number | null = null;
    private noneCount = 0;

    constructor(stepDeg = 1, releaseAfter = 4) {
        this.stepDeg = stepDeg;
        this.releaseAfter = releaseAfter;
    }

    onGesture(code: number): KnobEvent | null {
        if (code === NONE_CODE) {
            if (this.active === null) {
                return null;
            }
            this.noneCount += 1;
            if (this.noneCount >= this.releaseAfter) {
                this.active = null;
                this.anchor = null;
                return 'release';
            }
            return null;
        }
        this.noneCount = 0;
        const knob = HOLD_CODES[code];
        if (knob === undefined || knob === this.active) {
            return null;
        }
        this.active = knob;
        this.anchor = null;
        return 'start';
    }

    onRoll(roll: number): number {
        if (this.active === null) {
            return 0;
        }
        if (this.anchor === null) {
            this.anchor = roll;
            return 0;
        }
        const steps = Math.trunc(wrapDegrees(roll - this.anchor) / this.stepDeg);
        if (steps) {
            this.anchor = wrapDegrees(this.anchor + steps * this.stepDeg);
        }
        return steps;
    }
}
