// Parsers ported from tapsdk/parsers.py

import type { RawDataMessage } from './types';

// Constant for distinguishing raw message types (2^31)
const MSG_TYPE_VALUE = 2147483648;

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
 * @returns [vx, vy, proximity]
 */
export function mouseDataMsg(data: DataView): [number, number, boolean] {
    const vx = data.getInt16(1, true); // little-endian, signed
    const vy = data.getInt16(3, true);
    const prox = data.getUint8(9) === 1;
    return [vx, vy, prox];
}

/**
 * Parse air gesture data message
 * @param data Raw data from air_gesture_data_characteristic
 * @returns gesture code
 */
export function airGestureDataMsg(data: DataView): number {
    return data.getUint8(0);
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
