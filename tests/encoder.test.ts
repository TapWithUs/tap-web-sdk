import { describe, it, expect } from 'vitest';
import {
    encodeSetFeature,
    encodeSetVisionSensorOpMode,
    encodeSetVisionSensorModel,
    encodeSetImuSensitivity,
    encodeSetHapticPattern,
    encodeKeepaliveMessage,
    encodeStandbyStateGet,
    encodeStandbyStateSet,
} from '../src/encoder';
import { DeviceFeatures, VisionSensorOpModes, ModelTypes } from '../src/enumerations';

describe('encoder', () => {
    it('should encode set feature command', () => {
        const cmd = encodeSetFeature(DeviceFeatures.MODEL_DETECTION, 1);
        expect(Array.from(cmd)).toEqual([0, 0, 0, 0, DeviceFeatures.MODEL_DETECTION, 1]);
    });

    it('should encode vision sensor op mode command', () => {
        const cmd = encodeSetVisionSensorOpMode(VisionSensorOpModes.STREAM);
        expect(Array.from(cmd)).toEqual([1, 0, 0, 0, VisionSensorOpModes.STREAM]);
    });

    it('should encode vision sensor model command', () => {
        const cmd = encodeSetVisionSensorModel(ModelTypes.AIR_GESTURE);
        expect(Array.from(cmd)).toEqual([1, 0, 1, 0, ModelTypes.AIR_GESTURE]);
    });

    it('should encode IMU sensitivity command', () => {
        const cmd = encodeSetImuSensitivity(4, 5);
        expect(Array.from(cmd)).toEqual([1, 1, 2, 0, 5, 4]);
    });

    it('should encode haptic pattern command', () => {
        const pattern = new Uint8Array([0, 2, 100, 30]);
        const cmd = encodeSetHapticPattern(pattern);
        expect(Array.from(cmd)).toEqual([1, 2, 3, 0, 0, 2, 100, 30]);
    });

    it('should encode keepalive command', () => {
        const cmd = encodeKeepaliveMessage();
        expect(Array.from(cmd)).toEqual([2, 0, 0, 0]);
    });

    it('should encode standby state get command', () => {
        const cmd = encodeStandbyStateGet();
        expect(Array.from(cmd)).toEqual([3, 3, 0, 0]);
    });

    it('should encode standby state set command', () => {
        const cmd = encodeStandbyStateSet(true);
        expect(Array.from(cmd)).toEqual([3, 4, 0, 0, 1]);
    });
});
