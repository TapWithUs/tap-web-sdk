// Parsers ported from tapsdk/parsers.py

import type { RawDataMessage, TapIncMessage } from './types';

// Constant for distinguishing raw message types (2^31)
const MSG_TYPE_VALUE = 2147483648;

export const IncCommandType = {
    IMU_DATA: 0,
    MODEL_DETECTION: 1,
    STANDBY_STATE: 2,
} as const;

export const IncSubCommandType1 = {
    IMU_MOTION_DATA: 0,
    IMU_RAW_DATA: 1,
    TAP_GESTURE: 2,
    AIR_GESTURE: 3,
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
 * Parse mouse data message
 * @param data Raw data from mouse_data_characteristic
 * @returns [vx, vy, proximity, roll, pitch, yaw]
 * 
 * Mouse data structure:
 * - Byte 0: Message type (0 for mouse data)
 * - Bytes 1-2: Velocity X (int16, little-endian, signed)
 * - Bytes 3-4: Velocity Y (int16, little-endian, signed)
 * - Bytes 5-8: Reserved
 * - Byte 9: Proximity flag (1 = mouse active)
 * - Bytes 10-11: Roll in degrees (int16, little-endian, signed)
 * - Bytes 12-13: Pitch in degrees (int16, little-endian, signed)
 * - Bytes 14-15: Yaw in degrees (int16, little-endian, signed)
 */
export function mouseDataMsg(
    data: DataView,
    parseEulerAngles = true,
): [number, number, boolean, number, number, number] {
    const vx = data.getInt16(1, true); // little-endian, signed
    const vy = data.getInt16(3, true);
    const prox = data.getUint8(9) === 1;

    if (!parseEulerAngles) {
        return [vx, vy, prox, 0, 0, 0];
    }

    let roll = 0;
    let pitch = 0;
    let yaw = 0;
    if (data.byteLength >= 16) {
        roll = data.getInt16(10, true);
        pitch = data.getInt16(12, true);
        yaw = data.getInt16(14, true);
    }

    return [vx, vy, prox, roll, pitch, yaw];
}

/**
 * Parse air gesture data message
 * @param data Raw data from air_gesture_data_characteristic
 * @returns [gesture code, swipe direction]
 * 
 * Air gesture data structure:
 * - Byte 0: Gesture code (0x14 for mouse mode change, or gesture enum value)
 * - Byte 1: State data (for mouse mode changes)
 * - Byte 2: Reserved
 * - Byte 3: Swipe direction (0 = no swipe, 1-4 = directional swipe)
 */
export function airGestureDataMsg(data: DataView): [number, number] {
    const gesture = data.getUint8(0);
    const swipe = data.byteLength > 3 ? data.getUint8(3) : 0;
    return [gesture, swipe];
}

/**
 * Parse raw sensor data messages.
 * Raw data is packed with:
 *   [msg_type (1 bit)][timestamp (31 bit)][payload (12-30 bytes)]
 *   - msg_type 0 = imu, 1 = accelerometers
 *   - timestamp in milliseconds
 *   - imu payload: 6 int16 values [g_x, g_y, g_z, xl_x, xl_y, xl_z]
 *   - accl payload: 15 int16 values (5 fingers * 3 axes)
 *
 * @param data Raw data from raw_sensors_characteristic
 * @param scaleFactors Optional [fingerAccScale, imuGyroScale, imuAccScale] for scaling
 * @returns Array of parsed messages
 */
export function rawDataMsg(
    data: DataView,
    scaleFactors?: [number | null, number | null, number | null]
): RawDataMessage[] {
    const messages: RawDataMessage[] = [];
    let ptr = 0;
    const length = data.byteLength;

    while (ptr <= length - 4) {
        // Decode timestamp and message type (4 bytes, little-endian, unsigned)
        let ts = data.getUint32(ptr, true);
        if (ts === 0) {
            break;
        }
        ptr += 4;

        // Resolve message type based on high bit
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

        // Check if we have enough bytes for the payload
        const payloadBytes = numSamples * 2;
        if (ptr + payloadBytes > length) {
            break;
        }

        // Parse payload (int16, little-endian, signed)
        const payload: number[] = [];
        for (let i = 0; i < numSamples; i++) {
            const val = data.getInt16(ptr, true);
            ptr += 2;
            payload.push(val);
        }

        // Apply scale factors if provided
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
 * Parse incremental (TapSDK2) notification messages.
 * @param data Raw notification payload from tap_data_read_characteristic
 * @param scaleFactors Optional [fingerAccScale, imuGyroScale, imuAccScale] for scaling
 */
export function tapIncMsg(
    data: DataView,
    scaleFactors?: [number | null, number | null, number | null],
): TapIncMessage | null {
    const cmdType = data.getUint8(CMD_BYTE_INDEX);

    if (cmdType === IncCommandType.IMU_DATA) {
        const subCmdType = data.getUint8(SUBCMD1_BYTE_INDEX);
        const payload = new DataView(data.buffer, data.byteOffset + PAYLOAD_START_INDEX, data.byteLength - PAYLOAD_START_INDEX);

        if (subCmdType === IncSubCommandType1.IMU_MOTION_DATA) {
            const vx = payload.getInt16(1, true);
            const vy = payload.getInt16(3, true);
            const prox = payload.getUint8(9) === 1;
            const eulerAngles = [0, 1, 2].map((i) => payload.getInt16(10 + i * 2, true));
            return {
                type: 'imu_motion',
                data: [vx, vy, prox, eulerAngles] as [number, number, boolean, number[]],
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
        const payload = new DataView(data.buffer, data.byteOffset + PAYLOAD_START_INDEX, data.byteLength - PAYLOAD_START_INDEX);

        if (subCmdType === IncSubCommandType1.TAP_GESTURE) {
            return {
                type: 'tap_gesture',
                data: [tapDataMsg(payload)],
            };
        }
        if (subCmdType === IncSubCommandType1.AIR_GESTURE) {
            const [gesture] = airGestureDataMsg(payload);
            return {
                type: 'air_gesture',
                data: [gesture],
            };
        }
    } else if (cmdType === IncCommandType.STANDBY_STATE) {
        return {
            type: 'standby_state',
            data: data.getUint8(PAYLOAD_START_INDEX) === 1,
        };
    }

    return null;
}
