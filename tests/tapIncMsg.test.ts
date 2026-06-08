import { describe, it, expect } from 'vitest';
import { tapIncMsg, IncCommandType, IncSubCommandType1 } from '../src/parsers';

function buildBuffer(bytes: number[]): DataView {
    const buffer = new ArrayBuffer(bytes.length);
    const view = new DataView(buffer);
    bytes.forEach((value, index) => view.setUint8(index, value));
    return view;
}

describe('tapIncMsg', () => {
    it('should parse imu motion data with euler angles', () => {
        const payload = [
            0, 1, 0, 2, 0, 0, 0, 0, 0, 1,
            10, 0, 20, 0, 30, 0,
        ];
        const data = buildBuffer([
            IncCommandType.IMU_DATA,
            IncSubCommandType1.IMU_MOTION_DATA,
            0,
            0,
            ...payload,
        ]);

        const result = tapIncMsg(data);
        expect(result).toEqual({
            type: 'imu_motion',
            data: [1, 2, true, [10, 20, 30]],
        });
    });

    it('should parse imu raw data with scaling', () => {
        const gScale = 8.75;
        const aScale = 0.244;
        const ts = 50;
        const imuSamples = [10, 20, 30, 40, 50, 60];
        const payload: number[] = [];
        payload.push(ts & 0xff, (ts >> 8) & 0xff, (ts >> 16) & 0xff, (ts >> 24) & 0xff);
        for (const sample of imuSamples) {
            payload.push(sample & 0xff, (sample >> 8) & 0xff);
        }

        const data = buildBuffer([
            IncCommandType.IMU_DATA,
            IncSubCommandType1.IMU_RAW_DATA,
            0,
            0,
            ...payload,
        ]);

        const result = tapIncMsg(data, [0, gScale, aScale]);
        const expected = imuSamples.map((value, index) =>
            index < 3 ? value * gScale : value * aScale,
        );

        expect(result).toEqual({
            type: 'imu_raw',
            data: [{ type: 'imu', ts: 50, payload: expected }],
        });
    });

    it('should parse tap gesture data', () => {
        const data = buildBuffer([
            IncCommandType.MODEL_DETECTION,
            IncSubCommandType1.TAP_GESTURE,
            0,
            0,
            5,
        ]);

        expect(tapIncMsg(data)).toEqual({
            type: 'tap_gesture',
            data: [5],
        });
    });

    it('should parse air gesture data', () => {
        const data = buildBuffer([
            IncCommandType.MODEL_DETECTION,
            IncSubCommandType1.AIR_GESTURE,
            0,
            0,
            101,
        ]);

        expect(tapIncMsg(data)).toEqual({
            type: 'air_gesture',
            data: [101],
        });
    });

    it('should parse standby state data', () => {
        const data = buildBuffer([
            IncCommandType.STANDBY_STATE,
            0,
            0,
            0,
            1,
        ]);

        expect(tapIncMsg(data)).toEqual({
            type: 'standby_state',
            data: true,
        });
    });

    it('should return null for unsupported command', () => {
        const data = buildBuffer([99, 0, 0, 0]);
        expect(tapIncMsg(data)).toBeNull();
    });
});
