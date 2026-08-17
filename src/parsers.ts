// Parsers ported from tapsdk/parsers.py

import type { RawDataMessage, TapIncMessage } from './types';

// Constant for distinguishing raw message types (2^31)
const MSG_TYPE_VALUE = 2147483648;

export const IncCommandType = {
    IMU_DATA: 0,
    MODEL_DETECTION: 1,
    STANDBY_STATE: 2,
    CONFIG_STATE: 3,
} as const;

export const IncSubCommandType1 = {
    IMU_MOTION_DATA: 0,
    IMU_RAW_DATA: 1,
    TAP_GESTURE: 2,
    AIR_GESTURE: 3,
} as const;

export const IncConfigStateSubCommandType1 = {
    FEATURE: 0,
    VISION_OP_MODE: 1,
    VISION_MODEL: 2,
    IMU_SENSITIVITY: 3,
    HAPTIC_PATTERN: 4,
} as const;

const CMD_BYTE_INDEX = 0;
const SUBCMD1_BYTE_INDEX = 1;
const PAYLOAD_START_INDEX = 4;

/**
 * Parse tap data message
 * @param data Raw data from tap_data_characteristic
 * @returns tapcode (8-bit unsigned number, 1-31)
 */
export function tapDataMsg(data: DataView): number {
    return data.getUint8(0);
}

/**
 * Parse mouse data message into (vx, vy, proximity).
 * When parseEulerAngles is true (v2 IMU motion), also return [roll, pitch, yaw].
 */
export function mouseDataMsg(
    data: DataView,
    parseEulerAngles?: false,
): [number, number, boolean];
export function mouseDataMsg(
    data: DataView,
    parseEulerAngles: true,
): [number, number, boolean, number[]];
export function mouseDataMsg(
    data: DataView,
    parseEulerAngles = false,
): [number, number, boolean] | [number, number, boolean, number[]] {
    const vx = data.getInt16(1, true);
    const vy = data.getInt16(3, true);
    const prox = data.getUint8(9) === 1;

    if (!parseEulerAngles) {
        return [vx, vy, prox];
    }

    const eulerAngles = [0, 0, 0];
    if (data.byteLength >= 16) {
        eulerAngles[0] = data.getInt16(10, true);
        eulerAngles[1] = data.getInt16(12, true);
        eulerAngles[2] = data.getInt16(14, true);
    }
    return [vx, vy, prox, eulerAngles];
}

/**
 * Parse air gesture data message into [gesture_code].
 */
export function airGestureDataMsg(data: DataView): number[] {
    return [data.getUint8(0)];
}

/**
 * Parse raw sensor data messages.
 */
export function rawDataMsg(
    data: DataView,
    scaleFactors?: [number | null, number | null, number | null]
): RawDataMessage[] {
    const messages: RawDataMessage[] = [];
    let ptr = 0;
    const length = data.byteLength;

    while (ptr <= length - 4) {
        let ts = data.getUint32(ptr, true);
        if (ts === 0) {
            break;
        }
        ptr += 4;

        let msgType: 'imu' | 'accl';
        let numSamples: number;

        if (ts >= MSG_TYPE_VALUE) {
            msgType = 'accl';
            ts -= MSG_TYPE_VALUE;
            numSamples = 15;
        } else {
            msgType = 'imu';
            numSamples = 6;
        }

        const payloadBytes = numSamples * 2;
        if (ptr + payloadBytes > length) {
            break;
        }

        const payload: number[] = [];
        for (let i = 0; i < numSamples; i++) {
            const val = data.getInt16(ptr, true);
            ptr += 2;
            payload.push(val);
        }

        let scaledPayload = payload;
        if (scaleFactors) {
            if (msgType === 'accl' && scaleFactors[0] !== null) {
                scaledPayload = payload.map((v) => v * scaleFactors[0]!);
            } else if (msgType === 'imu') {
                scaledPayload = payload.map((v, j) => {
                    if (j < 3 && scaleFactors[1] !== null) {
                        return v * scaleFactors[1]!;
                    } else if (j >= 3 && scaleFactors[2] !== null) {
                        return v * scaleFactors[2]!;
                    }
                    return v;
                });
            }
        }

        messages.push({ type: msgType, ts, payload: scaledPayload });
    }

    return messages;
}

/**
 * Parse CONFIG_STATE (cmd=3) incremental messages.
 */
export function configStateMsg(data: DataView): TapIncMessage | null {
    const subCmdType = data.getUint8(SUBCMD1_BYTE_INDEX);
    const payloadOffset = data.byteOffset + PAYLOAD_START_INDEX;
    const payloadLength = data.byteLength - PAYLOAD_START_INDEX;
    const payload = new Uint8Array(data.buffer, payloadOffset, Math.max(0, payloadLength));

    if (subCmdType === IncConfigStateSubCommandType1.FEATURE) {
        if (payload.length < 2) {
            return null;
        }
        return {
            type: 'config_feature',
            data: {
                featureNumber: payload[0],
                featureValue: payload[1] === 1,
            },
        };
    }
    if (subCmdType === IncConfigStateSubCommandType1.VISION_OP_MODE) {
        if (payload.length < 1) {
            return null;
        }
        return {
            type: 'config_vision_op_mode',
            data: payload[0],
        };
    }
    if (subCmdType === IncConfigStateSubCommandType1.VISION_MODEL) {
        if (payload.length < 1) {
            return null;
        }
        return {
            type: 'config_vision_model',
            data: payload[0],
        };
    }
    if (subCmdType === IncConfigStateSubCommandType1.IMU_SENSITIVITY) {
        if (payload.length < 2) {
            return null;
        }
        return {
            type: 'config_imu_sensitivity',
            data: [payload[0], payload[1]],
        };
    }
    if (subCmdType === IncConfigStateSubCommandType1.HAPTIC_PATTERN) {
        return {
            type: 'config_haptic_pattern',
            data: Array.from(payload),
        };
    }
    return null;
}

/**
 * Parse incremental (TapSDK2) notification messages.
 */
export function tapIncMsg(
    data: DataView,
    scaleFactors?: [number | null, number | null, number | null],
): TapIncMessage | null {
    const cmdType = data.getUint8(CMD_BYTE_INDEX);

    if (cmdType === IncCommandType.IMU_DATA) {
        const subCmdType = data.getUint8(SUBCMD1_BYTE_INDEX);
        const payload = new DataView(
            data.buffer,
            data.byteOffset + PAYLOAD_START_INDEX,
            data.byteLength - PAYLOAD_START_INDEX,
        );

        if (subCmdType === IncSubCommandType1.IMU_MOTION_DATA) {
            return {
                type: 'imu_motion',
                data: mouseDataMsg(payload, true),
            };
        }
        if (subCmdType === IncSubCommandType1.IMU_RAW_DATA) {
            return {
                type: 'imu_raw',
                data: rawDataMsg(payload, scaleFactors),
            };
        }
    } else if (cmdType === IncCommandType.MODEL_DETECTION) {
        const subCmdType = data.getUint8(SUBCMD1_BYTE_INDEX);
        const payload = new DataView(
            data.buffer,
            data.byteOffset + PAYLOAD_START_INDEX,
            data.byteLength - PAYLOAD_START_INDEX,
        );

        if (subCmdType === IncSubCommandType1.TAP_GESTURE) {
            return {
                type: 'tap_gesture',
                data: [tapDataMsg(payload)],
            };
        }
        if (subCmdType === IncSubCommandType1.AIR_GESTURE) {
            return {
                type: 'air_gesture',
                data: airGestureDataMsg(payload),
            };
        }
    } else if (cmdType === IncCommandType.STANDBY_STATE) {
        return {
            type: 'standby_state',
            data: data.getUint8(PAYLOAD_START_INDEX) === 1,
        };
    } else if (cmdType === IncCommandType.CONFIG_STATE) {
        return configStateMsg(data);
    }

    return null;
}
