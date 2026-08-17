import { describe, it, expect } from 'vitest';
import {
    tapIncMsg,
    configStateMsg,
    IncCommandType,
    IncSubCommandType1,
    IncConfigStateSubCommandType1,
} from '../src/parsers';

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

    it('should parse config feature via CONFIG_STATE', () => {
        const data = buildBuffer([
            IncCommandType.CONFIG_STATE,
            IncConfigStateSubCommandType1.FEATURE,
            0,
            0,
            2,
            1,
        ]);

        expect(tapIncMsg(data)).toEqual({
            type: 'config_feature',
            data: { featureNumber: 2, featureValue: true },
        });
    });

    it('should parse config vision op mode', () => {
        const data = buildBuffer([
            IncCommandType.CONFIG_STATE,
            IncConfigStateSubCommandType1.VISION_OP_MODE,
            0,
            0,
            2,
        ]);

        expect(configStateMsg(data)).toEqual({
            type: 'config_vision_op_mode',
            data: 2,
        });
    });

    it('should parse config vision model', () => {
        const data = buildBuffer([
            IncCommandType.CONFIG_STATE,
            IncConfigStateSubCommandType1.VISION_MODEL,
            0,
            0,
            1,
        ]);

        expect(configStateMsg(data)).toEqual({
            type: 'config_vision_model',
            data: 1,
        });
    });

    it('should parse config imu sensitivity', () => {
        const data = buildBuffer([
            IncCommandType.CONFIG_STATE,
            IncConfigStateSubCommandType1.IMU_SENSITIVITY,
            0,
            0,
            5,
            4,
        ]);

        expect(configStateMsg(data)).toEqual({
            type: 'config_imu_sensitivity',
            data: [5, 4],
        });
    });

    it('should return null for unsupported command', () => {
        const data = buildBuffer([99, 0, 0, 0]);
        expect(tapIncMsg(data)).toBeNull();
    });
});
