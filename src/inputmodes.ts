// Input modes ported from tapsdk/inputmodes.py

import {
    InputType,
    FingerAcclSensitivity,
    ImuGyroSensitivity,
    ImuAcclSensitivity,
} from './enumerations';

// Scale factors for raw sensor data (from Python SDK)
const FINGER_ACC_SCALES = [null, 3.91, 7.81, 15.62, 31.25]; // mg/lsb
const IMU_GYRO_SCALES = [null, 4.375, 8.75, 17.5, 35, 70]; // mdps/lsb
const IMU_ACC_SCALES = [null, 0.061, 0.122, 0.244, 0.488]; // mg/lsb

export class RawSensorsSensitivity {
    readonly sensValues: [number, number, number];
    readonly scaleFactors: [number | null, number | null, number | null];

    constructor(
        fingerAcclSens: FingerAcclSensitivity,
        imuGyroSens: ImuGyroSensitivity,
        imuAcclSens: ImuAcclSensitivity
    ) {
        this.sensValues = [fingerAcclSens, imuGyroSens, imuAcclSens];
        this.scaleFactors = [
            FINGER_ACC_SCALES[fingerAcclSens],
            IMU_GYRO_SCALES[imuGyroSens],
            IMU_ACC_SCALES[imuAcclSens],
        ];
    }

    toArray(): [number, number, number] {
        return this.sensValues;
    }

    getScaleFactors(): [number | null, number | null, number | null] {
        return this.scaleFactors;
    }
}

export abstract class InputMode {
    static readonly COMMAND_PREFIX = new Uint8Array([0x3, 0xc, 0x0]);
    abstract readonly name: string;
    protected abstract readonly code: Uint8Array;

    getCommand(): Uint8Array {
        const prefix = InputMode.COMMAND_PREFIX;
        const result = new Uint8Array(prefix.length + this.code.length);
        result.set(prefix);
        result.set(this.code, prefix.length);
        return result;
    }

    toString(): string {
        return this.name;
    }
}

export class InputModeController extends InputMode {
    readonly name = 'Controller Mode';
    protected readonly code = new Uint8Array([0x1]);
}

export class InputModeText extends InputMode {
    readonly name = 'Text Mode';
    protected readonly code = new Uint8Array([0x0]);
}

export class InputModeControllerText extends InputMode {
    readonly name = 'Controller and Text Mode';
    protected readonly code = new Uint8Array([0x5]);
}

export class InputModeRaw extends InputMode {
    readonly name = 'Raw sensors Mode';
    readonly scaled: boolean;
    readonly sensitivity: RawSensorsSensitivity;
    protected readonly code: Uint8Array;

    constructor(options?: {
        scaled?: boolean;
        fingerAcclSens?: FingerAcclSensitivity;
        imuGyroSens?: ImuGyroSensitivity;
        imuAcclSens?: ImuAcclSensitivity;
    }) {
        super();
        this.scaled = options?.scaled ?? false;
        this.sensitivity = new RawSensorsSensitivity(
            options?.fingerAcclSens ?? FingerAcclSensitivity.G2,
            options?.imuGyroSens ?? ImuGyroSensitivity.DPS125,
            options?.imuAcclSens ?? ImuAcclSensitivity.G2
        );
        const sensArray = this.sensitivity.toArray();
        this.code = new Uint8Array([0xa, sensArray[0], sensArray[1], sensArray[2]]);
    }
}

/**
 * Generate the command bytes for setting input type
 */
export function inputTypeCommand(inputType: InputType): Uint8Array {
    return new Uint8Array([0x3, 0xd, 0x0, inputType]);
}
