// Command encoder ported from tapsdk/encoder.py

const CMD_BYTE_INDEX = 0;
const SUBCMD1_BYTE_INDEX = 1;
const SUBCMD2_BYTE_INDEX = 2;
const SUBCMD3_BYTE_INDEX = 3;
const PAYLOAD_START_INDEX = 4;
const METADATA_SIZE_BYTES = PAYLOAD_START_INDEX;

const PAYLOAD_FEATURE_NUMBER_INDEX = 0;
const PAYLOAD_FEATURE_VALUE_INDEX = 1;

const OutCommandType = {
    SET_FEATURE: 0,
    PERIPHERAL_COMMAND: 1,
    KEEPALIVE_COMMAND: 2,
    STANDBY_STATE_COMMAND: 3,
} as const;

const OutSubCommandType1 = {
    PERIPHERAL_TYPE_VISION_SENSOR: 0,
    PERIPHERAL_TYPE_IMU: 1,
    PHERIPHERAL_TYPE_HAPTIC: 2,
    STANDBY_STATE_GET: 3,
    STANDBY_STATE_SET: 4,
} as const;

const OutSubCommandType2 = {
    SET_VISUAL_SENSOR_OP_MODE: 0,
    SET_VISUAL_SENSOR_MODEL: 1,
    SET_IMU_SENSITIVITY: 2,
    SET_HAPTIC_PATTERN: 3,
} as const;

function encodeMsg(cmd: number, subcmd1: number, subcmd2: number, subcmd3: number, payload: Uint8Array): Uint8Array {
    const msg = new Uint8Array(METADATA_SIZE_BYTES + payload.length);
    msg[CMD_BYTE_INDEX] = cmd;
    msg[SUBCMD1_BYTE_INDEX] = subcmd1;
    msg[SUBCMD2_BYTE_INDEX] = subcmd2;
    msg[SUBCMD3_BYTE_INDEX] = subcmd3;
    msg.set(payload, PAYLOAD_START_INDEX);
    return msg;
}

export function encodeSetFeature(featureNumber: number, featureValue: number): Uint8Array {
    const payload = new Uint8Array(2);
    payload[PAYLOAD_FEATURE_NUMBER_INDEX] = featureNumber;
    payload[PAYLOAD_FEATURE_VALUE_INDEX] = featureValue;
    return encodeMsg(OutCommandType.SET_FEATURE, 0, 0, 0, payload);
}

export function encodeSetVisionSensorOpMode(mode: number): Uint8Array {
    const payload = new Uint8Array(1);
    payload[0] = mode;
    return encodeMsg(
        OutCommandType.PERIPHERAL_COMMAND,
        OutSubCommandType1.PERIPHERAL_TYPE_VISION_SENSOR,
        OutSubCommandType2.SET_VISUAL_SENSOR_OP_MODE,
        0,
        payload,
    );
}

export function encodeSetVisionSensorModel(model: number): Uint8Array {
    const payload = new Uint8Array(1);
    payload[0] = model;
    return encodeMsg(
        OutCommandType.PERIPHERAL_COMMAND,
        OutSubCommandType1.PERIPHERAL_TYPE_VISION_SENSOR,
        OutSubCommandType2.SET_VISUAL_SENSOR_MODEL,
        0,
        payload,
    );
}

export function encodeSetImuSensitivity(xlSensitivity: number, gyroSensitivity: number): Uint8Array {
    const payload = new Uint8Array(2);
    payload[0] = gyroSensitivity;
    payload[1] = xlSensitivity;
    return encodeMsg(
        OutCommandType.PERIPHERAL_COMMAND,
        OutSubCommandType1.PERIPHERAL_TYPE_IMU,
        OutSubCommandType2.SET_IMU_SENSITIVITY,
        0,
        payload,
    );
}

export function encodeSetHapticPattern(sequence: Uint8Array): Uint8Array {
    return encodeMsg(
        OutCommandType.PERIPHERAL_COMMAND,
        OutSubCommandType1.PHERIPHERAL_TYPE_HAPTIC,
        OutSubCommandType2.SET_HAPTIC_PATTERN,
        0,
        sequence,
    );
}

export function encodeKeepaliveMessage(): Uint8Array {
    return encodeMsg(OutCommandType.KEEPALIVE_COMMAND, 0, 0, 0, new Uint8Array(0));
}

export function encodeStandbyStateSet(standby: boolean): Uint8Array {
    const payload = new Uint8Array(1);
    payload[0] = standby ? 1 : 0;
    return encodeMsg(
        OutCommandType.STANDBY_STATE_COMMAND,
        OutSubCommandType1.STANDBY_STATE_SET,
        0,
        0,
        payload,
    );
}
