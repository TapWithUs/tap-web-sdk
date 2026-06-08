// Event types for TapSDK Web

export interface TapEvent {
    identifier: string;
    tapcode: number;
}

export interface MouseEvent {
    identifier: string;
    vx: number;
    vy: number;
    proximity: boolean;
    roll: number;
    pitch: number;
    yaw: number;
}

export interface AirGestureEvent {
    identifier: string;
    gesture: number;
}

export interface RawDataMessage {
    type: 'imu' | 'accl';
    ts: number;
    payload: number[];
}

export interface RawDataEvent {
    identifier: string;
    packets: RawDataMessage[];
}

export type ImuMotionData = [number, number, boolean, number[]];

export type TapIncMessage =
    | { type: 'imu_raw'; data: RawDataMessage[] }
    | { type: 'imu_motion'; data: ImuMotionData }
    | { type: 'tap_gesture'; data: number[] }
    | { type: 'air_gesture'; data: number[] }
    | { type: 'standby_state'; data: boolean };
