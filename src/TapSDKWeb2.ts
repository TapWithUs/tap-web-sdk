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
    encodeGetFeature,
    encodeGetImuSensitivity,
    encodeGetVisionSensorModel,
    encodeGetVisionSensorOpMode,
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
import {
    BATTERY_SERVICE,
    DEVICE_INFORMATION_SERVICE,
    SERIAL_NUMBER_CHARACTERISTIC,
    readDeviceInfo,
    type DeviceInfo,
} from './deviceInfo';
import { TAP_SERVICE, V2_READ_CHAR, V2_WRITE_CHAR } from './detect';

const DEFAULT_GET_TIMEOUT_MS = 2000;

export type TapEventCallback = (identifier: string, tapcode: number[]) => void;
export type AirGestureEventCallback = (identifier: string, gestureData: number[]) => void;
export type RawImuDataEventCallback = (identifier: string, packets: RawDataMessage[]) => void;
export type ImuMotionDataEventCallback = (identifier: string, motionData: ImuMotionData) => void;
export type StandbyStateEventCallback = (identifier: string, isStandby: boolean) => void;
export type ConnectionEventCallback = (serialNumber: string) => void;
export type DisconnectionEventCallback = (identifier: string) => void;

type PendingKey = string;

interface PendingRequest {
    resolve: (value: unknown) => void;
    reject: (reason: Error) => void;
    timer: ReturnType<typeof setTimeout>;
}

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
    private readonly getTimeoutMs: number;
    private pendingRequests = new Map<PendingKey, PendingRequest>();

    constructor(options?: { keepaliveTimeout?: number; getTimeout?: number }) {
        this.keepAliveTimeout = options?.keepaliveTimeout ?? 10000;
        this.getTimeoutMs = options?.getTimeout != null
            ? Math.round(options.getTimeout * (options.getTimeout < 100 ? 1000 : 1))
            : DEFAULT_GET_TIMEOUT_MS;
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

    get protocol(): 'v2' {
        return 'v2';
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
            optionalServices: [DEVICE_INFORMATION_SERVICE, BATTERY_SERVICE],
        });

        this.device.addEventListener('gattserverdisconnected', () => {
            this.onDisconnected();
        });

        return await this.connectGatt();
    }

    disconnect(): void {
        this.stopKeepAlive();
        this.rejectAllPending(new Error('Disconnected'));
        if (this.server?.connected) {
            this.server.disconnect();
        }
    }

    async getDeviceInfo(): Promise<DeviceInfo> {
        if (!this.server?.connected) {
            throw new Error('Not connected');
        }
        return readDeviceInfo(this.server, { deviceName: this.device?.name ?? undefined });
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

    async getStandbyState(): Promise<boolean> {
        return this.requestAndWait('standby_state', encodeStandbyStateGet()) as Promise<boolean>;
    }

    async getFeature(feature: DeviceFeatures): Promise<boolean> {
        return this.requestAndWait(
            `config_feature:${feature}`,
            encodeGetFeature(feature),
        ) as Promise<boolean>;
    }

    async getVisionSensorOpMode(): Promise<VisionSensorOpModes> {
        const modeValue = await this.requestAndWait(
            'config_vision_op_mode',
            encodeGetVisionSensorOpMode(),
        ) as number;
        return modeValue as VisionSensorOpModes;
    }

    async getVisionSensorModel(): Promise<ModelTypes> {
        const modelValue = await this.requestAndWait(
            'config_vision_model',
            encodeGetVisionSensorModel(),
        ) as number;
        return modelValue as ModelTypes;
    }

    async getImuSensitivity(): Promise<[ImuGyroSensitivity, ImuAcclSensitivity]> {
        const [gyroValue, xlValue] = await this.requestAndWait(
            'config_imu_sensitivity',
            encodeGetImuSensitivity(),
        ) as [number, number];
        return [gyroValue as ImuGyroSensitivity, xlValue as ImuAcclSensitivity];
    }

    private async connectGatt(): Promise<boolean> {
        if (!this.device?.gatt) {
            return false;
        }

        this.server = await this.device.gatt.connect();
        const tapService = await this.server.getPrimaryService(TAP_SERVICE);

        this.tapDataReadChar = await tapService.getCharacteristic(V2_READ_CHAR);
        this.tapDataWriteChar = await tapService.getCharacteristic(V2_WRITE_CHAR);

        await this.tapDataReadChar.startNotifications();
        this.tapDataReadChar.addEventListener('characteristicvaluechanged', (event: Event) => {
            const target = event.target as BluetoothRemoteGATTCharacteristic;
            if (target.value) {
                this.onIncMsg(this.identifier, target.value);
            }
        });

        try {
            const dis = await this.server.getPrimaryService(DEVICE_INFORMATION_SERVICE);
            const serialChar = await dis.getCharacteristic(SERIAL_NUMBER_CHARACTERISTIC);
            const serialValue = await serialChar.readValue();
            this.deviceSerialNumber = new TextDecoder().decode(serialValue.buffer).replace(/\0/g, '').trim();
        } catch {
            this.deviceSerialNumber = this.device.name ?? this.device.id;
        }

        this.startKeepAlive();

        if (this.connectionCb) {
            this.connectionCb(this.deviceSerialNumber ?? this.identifier);
        }

        return true;
    }

    private resolvePendingRequest(key: PendingKey, value: unknown): void {
        const pending = this.pendingRequests.get(key);
        if (!pending) {
            return;
        }
        clearTimeout(pending.timer);
        this.pendingRequests.delete(key);
        pending.resolve(value);
    }

    private rejectAllPending(error: Error): void {
        for (const [key, pending] of this.pendingRequests) {
            clearTimeout(pending.timer);
            pending.reject(error);
            this.pendingRequests.delete(key);
        }
    }

    private requestAndWait(key: PendingKey, writeValue: Uint8Array): Promise<unknown> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pendingRequests.delete(key);
                reject(new Error(`get request timed out: ${key}`));
            }, this.getTimeoutMs);

            this.pendingRequests.set(key, { resolve, reject, timer });
            void this.writeTapGattChar(writeValue).catch((error: unknown) => {
                const pending = this.pendingRequests.get(key);
                if (pending) {
                    clearTimeout(pending.timer);
                    this.pendingRequests.delete(key);
                    pending.reject(error instanceof Error ? error : new Error(String(error)));
                }
            });
        });
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
                this.resolvePendingRequest('standby_state', message.data);
                if (this.standbyStateEventCb) {
                    this.standbyStateEventCb(identifier, message.data);
                }
                break;
            case 'config_feature':
                this.resolvePendingRequest(
                    `config_feature:${message.data.featureNumber}`,
                    message.data.featureValue,
                );
                break;
            case 'config_vision_op_mode':
                this.resolvePendingRequest('config_vision_op_mode', message.data);
                break;
            case 'config_vision_model':
                this.resolvePendingRequest('config_vision_model', message.data);
                break;
            case 'config_imu_sensitivity':
                this.resolvePendingRequest('config_imu_sensitivity', message.data);
                break;
            default:
                break;
        }
    }

    private onDisconnected(): void {
        this.stopKeepAlive();
        this.rejectAllPending(new Error('Disconnected'));
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
