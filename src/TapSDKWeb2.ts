// TapSDK2 Web - Enhanced device interaction via Web Bluetooth
// Ported from tapsdk/tap2.py

import {
    DeviceFeatures,
    FingerAcclSensitivity,
    ImuAcclSensitivity,
    ImuGyroSensitivity,
    ModelTypes,
    VisionSensorOpModes,
} from './enumerations';
import {
    encodeKeepaliveMessage,
    encodeSetFeature,
    encodeSetHapticPattern,
    encodeSetImuSensitivity,
    encodeSetVisionSensorModel,
    encodeSetVisionSensorOpMode,
    encodeStandbyStateGet,
    encodeStandbyStateSet,
} from './encoder';
import { RawSensorsSensitivity } from './inputmodes';
import { tapIncMsg } from './parsers';
import type { ImuMotionData, RawDataMessage } from './types';

const TAP_SERVICE = 'c3ff0001-1d8b-40fd-a56f-c7bd5d0f3370';
const TAP_DATA_READ_CHARACTERISTIC = 'c3ff000e-1d8b-40fd-a56f-c7bd5d0f3370';
const TAP_DATA_WRITE_CHARACTERISTIC = 'c3ff000f-1d8b-40fd-a56f-c7bd5d0f3370';
const SERIAL_NUMBER_CHARACTERISTIC = '00002a25-0000-1000-8000-00805f9b34fb';

export type TapEventCallback = (identifier: string, tapcode: number[]) => void;
export type AirGestureEventCallback = (identifier: string, gestureData: number[]) => void;
export type RawImuDataEventCallback = (identifier: string, packets: RawDataMessage[]) => void;
export type ImuMotionDataEventCallback = (identifier: string, motionData: ImuMotionData) => void;
export type StandbyStateEventCallback = (identifier: string, isStandby: boolean) => void;
export type ConnectionEventCallback = (serialNumber: string) => void;
export type DisconnectionEventCallback = (identifier: string) => void;

export class TapSDKWeb2 {
    private device: BluetoothDevice | null = null;
    private server: BluetoothRemoteGATTServer | null = null;
    private tapDataReadChar: BluetoothRemoteGATTCharacteristic | null = null;
    private tapDataWriteChar: BluetoothRemoteGATTCharacteristic | null = null;

    private tapEventCb: TapEventCallback | null = null;
    private airGestureEventCb: AirGestureEventCallback | null = null;
    private rawDataEventCb: RawImuDataEventCallback | null = null;
    private imuMotionDataCb: ImuMotionDataEventCallback | null = null;
    private standbyStateEventCb: StandbyStateEventCallback | null = null;
    private connectionCb: ConnectionEventCallback | null = null;
    private disconnectionCb: DisconnectionEventCallback | null = null;

    private deviceSerialNumber: string | null = null;
    private scaleFactors: [number | null, number | null, number | null] | null = null;
    private writeChain: Promise<void> = Promise.resolve();
    private keepAliveInterval: number | null = null;
    private readonly keepAliveTimeout: number;

    constructor(options?: { keepaliveTimeout?: number }) {
        this.keepAliveTimeout = options?.keepaliveTimeout ?? 10000;
    }

    get identifier(): string {
        return this.deviceSerialNumber ?? this.device?.name ?? this.device?.id ?? 'unknown';
    }

    get serialNumber(): string | null {
        return this.deviceSerialNumber;
    }

    get isConnected(): boolean {
        return this.server?.connected ?? false;
    }

    static isSupported(): boolean {
        return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
    }

    registerTapEvents(cb: TapEventCallback): void {
        this.tapEventCb = cb;
    }

    registerAirGestureEvents(cb: AirGestureEventCallback): void {
        this.airGestureEventCb = cb;
    }

    registerRawImuDataEvents(cb: RawImuDataEventCallback): void {
        this.rawDataEventCb = cb;
    }

    registerRawDataEvents(cb: RawImuDataEventCallback): void {
        this.registerRawImuDataEvents(cb);
    }

    registerImuMotionDataEvents(cb: ImuMotionDataEventCallback): void {
        this.imuMotionDataCb = cb;
    }

    registerStandbyStateEvents(cb: StandbyStateEventCallback): void {
        this.standbyStateEventCb = cb;
    }

    registerConnectionEvents(cb: ConnectionEventCallback): void {
        this.connectionCb = cb;
    }

    registerDisconnectionEvents(cb: DisconnectionEventCallback): void {
        this.disconnectionCb = cb;
    }

    async getPermittedDevices(): Promise<BluetoothDevice[]> {
        try {
            if ('getDevices' in navigator.bluetooth) {
                const devices = await navigator.bluetooth.getDevices();
                return devices.filter((d) => d.name?.toLowerCase().includes('tap') || d.id);
            }
        } catch (error) {
            console.warn('getDevices not supported:', error);
        }
        return [];
    }

    async connectToDevice(device: BluetoothDevice): Promise<boolean> {
        try {
            this.device = device;
            this.device.addEventListener('gattserverdisconnected', () => {
                this.onDisconnected();
            });
            return await this.connectGatt();
        } catch (error) {
            console.error('Failed to connect to device:', error);
            return false;
        }
    }

    async connect(): Promise<boolean> {
        if (!TapSDKWeb2.isSupported()) {
            throw new Error(
                'Web Bluetooth is not available. Make sure you are using Chrome/Edge/Opera ' +
                'and accessing the page via localhost or HTTPS.',
            );
        }

        this.device = await navigator.bluetooth.requestDevice({
            filters: [{ services: [TAP_SERVICE] }],
            optionalServices: [TAP_SERVICE],
        });

        this.device.addEventListener('gattserverdisconnected', () => {
            this.onDisconnected();
        });

        return await this.connectGatt();
    }

    disconnect(): void {
        this.stopKeepAlive();
        if (this.server?.connected) {
            this.server.disconnect();
        }
    }

    async setFeature(feature: DeviceFeatures, enable: boolean): Promise<void> {
        const writeValue = encodeSetFeature(feature, enable ? 1 : 0);
        await this.writeTapGattChar(writeValue);
    }

    async setVisionSensorOpMode(mode: VisionSensorOpModes): Promise<void> {
        const writeValue = encodeSetVisionSensorOpMode(mode);
        await this.writeTapGattChar(writeValue);
    }

    async setVisionSensorModel(model: ModelTypes): Promise<void> {
        const writeValue = encodeSetVisionSensorModel(model);
        await this.writeTapGattChar(writeValue);
    }

    async setImuSensitivity(
        xlSensitivity: ImuAcclSensitivity,
        gyroSensitivity: ImuGyroSensitivity,
        options?: {
            scaled?: boolean;
            fingerAcclSens?: FingerAcclSensitivity;
        },
    ): Promise<void> {
        if (options?.scaled) {
            const sensitivity = new RawSensorsSensitivity(
                options.fingerAcclSens ?? FingerAcclSensitivity.G2,
                gyroSensitivity,
                xlSensitivity,
            );
            this.scaleFactors = sensitivity.getScaleFactors();
        } else {
            this.scaleFactors = null;
        }

        const writeValue = encodeSetImuSensitivity(xlSensitivity, gyroSensitivity);
        await this.writeTapGattChar(writeValue);
    }

    async setHapticPattern(sequence: number[]): Promise<void> {
        let seq = sequence.slice(0, 18);
        seq = seq.map((d) => Math.max(0, Math.min(255, Math.floor(d / 10))));
        const pattern = new Uint8Array([0x0, 0x2, ...seq]);
        const writeValue = encodeSetHapticPattern(pattern);
        await this.writeTapGattChar(writeValue);
    }

    async sendVibrationSequence(sequence: number[]): Promise<void> {
        await this.setHapticPattern(sequence);
    }

    async sendKeepaliveMessage(): Promise<void> {
        const writeValue = encodeKeepaliveMessage();
        await this.writeTapGattChar(writeValue);
    }

    async setStandbyState(standby: boolean): Promise<void> {
        const writeValue = encodeStandbyStateSet(standby);
        await this.writeTapGattChar(writeValue);
    }

    async getStandbyState(): Promise<void> {
        const writeValue = encodeStandbyStateGet();
        await this.writeTapGattChar(writeValue);
    }

    private async connectGatt(): Promise<boolean> {
        if (!this.device?.gatt) {
            return false;
        }

        this.server = await this.device.gatt.connect();
        const tapService = await this.server.getPrimaryService(TAP_SERVICE);

        this.tapDataReadChar = await tapService.getCharacteristic(TAP_DATA_READ_CHARACTERISTIC);
        this.tapDataWriteChar = await tapService.getCharacteristic(TAP_DATA_WRITE_CHARACTERISTIC);

        await this.tapDataReadChar.startNotifications();
        this.tapDataReadChar.addEventListener('characteristicvaluechanged', (event: Event) => {
            const target = event.target as BluetoothRemoteGATTCharacteristic;
            if (target.value) {
                this.onIncMsg(this.identifier, target.value);
            }
        });

        try {
            const serialChar = await tapService.getCharacteristic(SERIAL_NUMBER_CHARACTERISTIC);
            const serialValue = await serialChar.readValue();
            this.deviceSerialNumber = new TextDecoder().decode(serialValue.buffer);
        } catch {
            this.deviceSerialNumber = this.device.name ?? this.device.id;
        }

        this.startKeepAlive();

        if (this.connectionCb) {
            this.connectionCb(this.deviceSerialNumber ?? this.identifier);
        }

        return true;
    }

    private onIncMsg(identifier: string, data: DataView): void {
        if (data.byteLength === 0) {
            return;
        }

        const message = tapIncMsg(data, this.scaleFactors ?? undefined);
        if (!message) {
            return;
        }

        switch (message.type) {
            case 'imu_raw':
                if (this.rawDataEventCb) {
                    this.rawDataEventCb(identifier, message.data);
                }
                break;
            case 'imu_motion':
                if (this.imuMotionDataCb) {
                    this.imuMotionDataCb(identifier, message.data);
                }
                break;
            case 'air_gesture':
                if (this.airGestureEventCb) {
                    this.airGestureEventCb(identifier, message.data);
                }
                break;
            case 'tap_gesture':
                if (this.tapEventCb) {
                    this.tapEventCb(identifier, message.data);
                }
                break;
            case 'standby_state':
                if (this.standbyStateEventCb) {
                    this.standbyStateEventCb(identifier, message.data);
                }
                break;
        }
    }

    private onDisconnected(): void {
        this.stopKeepAlive();
        if (this.disconnectionCb) {
            this.disconnectionCb(this.identifier);
        }
    }

    private writeTapGattChar(writeValue: Uint8Array): Promise<void> {
        if (!this.tapDataWriteChar) {
            console.warn('Tap data write characteristic not available');
            return Promise.resolve();
        }

        this.writeChain = this.writeChain.then(async () => {
            await this.tapDataWriteChar!.writeValueWithResponse(writeValue.buffer as ArrayBuffer);
        });

        return this.writeChain;
    }

    private startKeepAlive(): void {
        if (this.keepAliveInterval !== null) {
            return;
        }

        this.keepAliveInterval = window.setInterval(() => {
            void this.sendKeepaliveMessage();
        }, this.keepAliveTimeout);
    }

    private stopKeepAlive(): void {
        if (this.keepAliveInterval !== null) {
            window.clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
        }
    }
}
