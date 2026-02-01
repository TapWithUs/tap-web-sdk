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
