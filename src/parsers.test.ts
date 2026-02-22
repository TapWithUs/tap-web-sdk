import { describe, it, expect } from 'vitest';
import { tapDataMsg, mouseDataMsg, airGestureDataMsg, rawDataMsg } from './parsers';

describe('parsers', () => {
    describe('tapDataMsg', () => {
        it('should parse tap code from first byte', () => {
            const buffer = new ArrayBuffer(1);
            const view = new DataView(buffer);
            view.setUint8(0, 5); // thumb + middle finger

            expect(tapDataMsg(view)).toBe(5);
        });

        it('should parse tap code 31 (all fingers)', () => {
            const buffer = new ArrayBuffer(1);
            const view = new DataView(buffer);
            view.setUint8(0, 31);

            expect(tapDataMsg(view)).toBe(31);
        });

        it('should parse tap code 1 (thumb only)', () => {
            const buffer = new ArrayBuffer(1);
            const view = new DataView(buffer);
            view.setUint8(0, 1);

            expect(tapDataMsg(view)).toBe(1);
        });
    });

    describe('mouseDataMsg', () => {
        it('should parse mouse velocity and proximity', () => {
            const buffer = new ArrayBuffer(10);
            const view = new DataView(buffer);
            view.setInt16(1, 100, true); // vx little-endian
            view.setInt16(3, -50, true); // vy little-endian
            view.setUint8(9, 1); // proximity = true

            const [vx, vy, prox, roll, pitch, yaw] = mouseDataMsg(view);
            expect(vx).toBe(100);
            expect(vy).toBe(-50);
            expect(prox).toBe(true);
            expect(roll).toBe(0);
            expect(pitch).toBe(0);
            expect(yaw).toBe(0);
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

        it('should handle negative velocities', () => {
            const buffer = new ArrayBuffer(10);
            const view = new DataView(buffer);
            view.setInt16(1, -200, true);
            view.setInt16(3, -300, true);
            view.setUint8(9, 0);

            const [vx, vy] = mouseDataMsg(view);
            expect(vx).toBe(-200);
            expect(vy).toBe(-300);
        });

        it('should parse orientation data (roll, pitch, yaw) when available', () => {
            const buffer = new ArrayBuffer(16);
            const view = new DataView(buffer);
            view.setInt16(1, 100, true); // vx
            view.setInt16(3, -50, true); // vy
            view.setUint8(9, 1); // proximity
            view.setInt16(10, 45, true); // roll in degrees
            view.setInt16(12, -30, true); // pitch in degrees
            view.setInt16(14, 90, true); // yaw in degrees

            const [vx, vy, prox, roll, pitch, yaw] = mouseDataMsg(view);
            expect(vx).toBe(100);
            expect(vy).toBe(-50);
            expect(prox).toBe(true);
            expect(roll).toBe(45);
            expect(pitch).toBe(-30);
            expect(yaw).toBe(90);
        });

        it('should handle negative orientation angles', () => {
            const buffer = new ArrayBuffer(16);
            const view = new DataView(buffer);
            view.setInt16(1, 0, true);
            view.setInt16(3, 0, true);
            view.setUint8(9, 0);
            view.setInt16(10, -180, true); // roll
            view.setInt16(12, -90, true); // pitch
            view.setInt16(14, -45, true); // yaw

            const [, , , roll, pitch, yaw] = mouseDataMsg(view);
            expect(roll).toBe(-180);
            expect(pitch).toBe(-90);
            expect(yaw).toBe(-45);
        });

        it('should return zero orientation when data is shorter than 16 bytes', () => {
            const buffer = new ArrayBuffer(10);
            const view = new DataView(buffer);
            view.setInt16(1, 100, true);
            view.setInt16(3, -50, true);
            view.setUint8(9, 1);

            const [, , , roll, pitch, yaw] = mouseDataMsg(view);
            expect(roll).toBe(0);
            expect(pitch).toBe(0);
            expect(yaw).toBe(0);
        });

        it('should handle full 360 degree range', () => {
            const buffer = new ArrayBuffer(16);
            const view = new DataView(buffer);
            view.setInt16(1, 0, true);
            view.setInt16(3, 0, true);
            view.setUint8(9, 0);
            view.setInt16(10, 180, true);
            view.setInt16(12, 90, true);
            view.setInt16(14, 270, true);

            const [, , , roll, pitch, yaw] = mouseDataMsg(view);
            expect(roll).toBe(180);
            expect(pitch).toBe(90);
            expect(yaw).toBe(270);
        });
    });

    describe('airGestureDataMsg', () => {
        it('should parse gesture from first byte', () => {
            const buffer = new ArrayBuffer(1);
            const view = new DataView(buffer);
            view.setUint8(0, 2); // UP_ONE_FINGER

            expect(airGestureDataMsg(view)).toBe(2);
        });

        it('should parse PINCH gesture', () => {
            const buffer = new ArrayBuffer(1);
            const view = new DataView(buffer);
            view.setUint8(0, 10);

            expect(airGestureDataMsg(view)).toBe(10);
        });
    });

    describe('rawDataMsg', () => {
        it('should parse IMU message (timestamp < 2^31)', () => {
            // IMU message: 4 bytes timestamp + 12 bytes payload (6 int16)
            const buffer = new ArrayBuffer(16);
            const view = new DataView(buffer);

            // Timestamp = 1000ms (IMU message)
            view.setUint32(0, 1000, true);

            // Payload: 6 int16 values [g_x, g_y, g_z, xl_x, xl_y, xl_z]
            view.setInt16(4, 100, true);
            view.setInt16(6, 200, true);
            view.setInt16(8, 300, true);
            view.setInt16(10, 400, true);
            view.setInt16(12, 500, true);
            view.setInt16(14, 600, true);

            const messages = rawDataMsg(view);
            expect(messages).toHaveLength(1);
            expect(messages[0].type).toBe('imu');
            expect(messages[0].ts).toBe(1000);
            expect(messages[0].payload).toEqual([100, 200, 300, 400, 500, 600]);
        });

        it('should parse ACCL message (timestamp >= 2^31)', () => {
            // ACCL message: 4 bytes timestamp + 30 bytes payload (15 int16)
            const buffer = new ArrayBuffer(34);
            const view = new DataView(buffer);

            // Timestamp with high bit set = 2^31 + 2000 (ACCL message)
            view.setUint32(0, 2147483648 + 2000, true);

            // Payload: 15 int16 values (5 fingers * 3 axes)
            for (let i = 0; i < 15; i++) {
                view.setInt16(4 + i * 2, (i + 1) * 10, true);
            }

            const messages = rawDataMsg(view);
            expect(messages).toHaveLength(1);
            expect(messages[0].type).toBe('accl');
            expect(messages[0].ts).toBe(2000);
            expect(messages[0].payload).toHaveLength(15);
            expect(messages[0].payload[0]).toBe(10);
            expect(messages[0].payload[14]).toBe(150);
        });

        it('should apply scale factors to ACCL message', () => {
            const buffer = new ArrayBuffer(34);
            const view = new DataView(buffer);

            view.setUint32(0, 2147483648 + 1000, true);
            for (let i = 0; i < 15; i++) {
                view.setInt16(4 + i * 2, 100, true);
            }

            const scaleFactors: [number | null, number | null, number | null] = [2.0, null, null];
            const messages = rawDataMsg(view, scaleFactors);

            expect(messages[0].payload.every((v) => v === 200)).toBe(true);
        });

        it('should apply scale factors to IMU message', () => {
            const buffer = new ArrayBuffer(16);
            const view = new DataView(buffer);

            view.setUint32(0, 500, true);
            // Gyro values (first 3)
            view.setInt16(4, 100, true);
            view.setInt16(6, 100, true);
            view.setInt16(8, 100, true);
            // Accel values (last 3)
            view.setInt16(10, 100, true);
            view.setInt16(12, 100, true);
            view.setInt16(14, 100, true);

            const scaleFactors: [number | null, number | null, number | null] = [null, 2.0, 3.0];
            const messages = rawDataMsg(view, scaleFactors);

            // First 3 should be scaled by gyro factor (2.0)
            expect(messages[0].payload[0]).toBe(200);
            expect(messages[0].payload[1]).toBe(200);
            expect(messages[0].payload[2]).toBe(200);
            // Last 3 should be scaled by accel factor (3.0)
            expect(messages[0].payload[3]).toBe(300);
            expect(messages[0].payload[4]).toBe(300);
            expect(messages[0].payload[5]).toBe(300);
        });

        it('should stop parsing when timestamp is 0', () => {
            const buffer = new ArrayBuffer(20);
            const view = new DataView(buffer);

            // First message
            view.setUint32(0, 1000, true);
            for (let i = 0; i < 6; i++) {
                view.setInt16(4 + i * 2, i, true);
            }
            // Second "message" with timestamp 0 (should stop)
            view.setUint32(16, 0, true);

            const messages = rawDataMsg(view);
            expect(messages).toHaveLength(1);
        });

        it('should handle empty data', () => {
            const buffer = new ArrayBuffer(4);
            const view = new DataView(buffer);
            view.setUint32(0, 0, true);

            const messages = rawDataMsg(view);
            expect(messages).toHaveLength(0);
        });

        it('should handle multiple messages', () => {
            // Two IMU messages
            const buffer = new ArrayBuffer(32);
            const view = new DataView(buffer);

            // First IMU message
            view.setUint32(0, 1000, true);
            for (let i = 0; i < 6; i++) {
                view.setInt16(4 + i * 2, 100, true);
            }

            // Second IMU message
            view.setUint32(16, 2000, true);
            for (let i = 0; i < 6; i++) {
                view.setInt16(20 + i * 2, 200, true);
            }

            const messages = rawDataMsg(view);
            expect(messages).toHaveLength(2);
            expect(messages[0].ts).toBe(1000);
            expect(messages[1].ts).toBe(2000);
        });
    });
});
