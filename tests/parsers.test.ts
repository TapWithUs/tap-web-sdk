import { describe, it, expect } from 'vitest';
import { tapDataMsg, mouseDataMsg, airGestureDataMsg, rawDataMsg } from '../src/parsers';

describe('parsers', () => {
    describe('tapDataMsg', () => {
        it('should parse tap code from first byte', () => {
            const buffer = new ArrayBuffer(1);
            const view = new DataView(buffer);
            view.setUint8(0, 5);
            expect(tapDataMsg(view)).toBe(5);
        });
    });

    describe('mouseDataMsg', () => {
        it('should parse mouse velocity and proximity without euler by default', () => {
            const buffer = new ArrayBuffer(10);
            const view = new DataView(buffer);
            view.setInt16(1, 100, true);
            view.setInt16(3, -50, true);
            view.setUint8(9, 1);

            const result = mouseDataMsg(view);
            expect(result).toEqual([100, -50, true]);
            expect(result).toHaveLength(3);
        });

        it('should handle proximity = false', () => {
            const buffer = new ArrayBuffer(10);
            const view = new DataView(buffer);
            view.setInt16(1, 0, true);
            view.setInt16(3, 0, true);
            view.setUint8(9, 0);

            const [, , prox] = mouseDataMsg(view);
            expect(prox).toBe(false);
        });

        it('should parse euler angles when parseEulerAngles is true', () => {
            const buffer = new ArrayBuffer(16);
            const view = new DataView(buffer);
            view.setInt16(1, 100, true);
            view.setInt16(3, -50, true);
            view.setUint8(9, 1);
            view.setInt16(10, 45, true);
            view.setInt16(12, -30, true);
            view.setInt16(14, 90, true);

            const [vx, vy, prox, euler] = mouseDataMsg(view, true);
            expect(vx).toBe(100);
            expect(vy).toBe(-50);
            expect(prox).toBe(true);
            expect(euler).toEqual([45, -30, 90]);
        });

        it('should return zero euler when data shorter than 16 bytes', () => {
            const buffer = new ArrayBuffer(10);
            const view = new DataView(buffer);
            view.setInt16(1, 100, true);
            view.setInt16(3, -50, true);
            view.setUint8(9, 1);

            const [, , , euler] = mouseDataMsg(view, true);
            expect(euler).toEqual([0, 0, 0]);
        });

        it('should ignore euler bytes when flag is false', () => {
            const buffer = new ArrayBuffer(16);
            const view = new DataView(buffer);
            view.setInt16(1, 1, true);
            view.setInt16(3, 2, true);
            view.setUint8(9, 1);
            view.setInt16(10, 45, true);
            view.setInt16(12, -30, true);
            view.setInt16(14, 90, true);

            expect(mouseDataMsg(view, false)).toEqual([1, 2, true]);
        });
    });

    describe('airGestureDataMsg', () => {
        it('should parse gesture as single-element list', () => {
            const buffer = new ArrayBuffer(1);
            const view = new DataView(buffer);
            view.setUint8(0, 2);
            expect(airGestureDataMsg(view)).toEqual([2]);
        });

        it('should parse PINCH gesture', () => {
            const buffer = new ArrayBuffer(4);
            const view = new DataView(buffer);
            view.setUint8(0, 10);
            view.setUint8(3, 4); // leftover byte must not become swipe
            expect(airGestureDataMsg(view)).toEqual([10]);
        });
    });

    describe('rawDataMsg', () => {
        it('should parse IMU message (timestamp < 2^31)', () => {
            const buffer = new ArrayBuffer(16);
            const view = new DataView(buffer);
            view.setUint32(0, 1000, true);
            for (let i = 0; i < 6; i++) {
                view.setInt16(4 + i * 2, (i + 1) * 10, true);
            }

            const messages = rawDataMsg(view);
            expect(messages).toHaveLength(1);
            expect(messages[0].type).toBe('imu');
            expect(messages[0].ts).toBe(1000);
            expect(messages[0].payload).toEqual([10, 20, 30, 40, 50, 60]);
        });
    });
});
