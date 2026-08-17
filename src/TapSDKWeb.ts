// TapSDK Web - Web Bluetooth implementation
// Ported from tapsdk/tap.py

import { MouseModes, InputType } from './enumerations';
import { InputMode, InputModeText, InputModeRaw, inputTypeCommand } from './inputmodes';
import { tapDataMsg, mouseDataMsg, airGestureDataMsg, rawDataMsg } from './parsers';
import {
    BATTERY_SERVICE,
    DEVICE_INFORMATION_SERVICE,
    readDeviceInfo,
    type DeviceInfo,
} from './deviceInfo';
import { NUS_SERVICE, TAP_SERVICE } from './detect';

const TAP_DATA_CHARACTERISTIC = 'c3ff0005-1d8b-40fd-a56f-c7bd5d0f3370';
const MOUSE_DATA_CHARACTERISTIC = 'c3ff0006-1d8b-40fd-a56f-c7bd5d0f3370';
const UI_CMD_CHARACTERISTIC = 'c3ff0009-1d8b-40fd-a56f-c7bd5d0f3370';
const AIR_GESTURE_DATA_CHARACTERISTIC = 'c3ff000a-1d8b-40fd-a56f-c7bd5d0f3370';
const TAP_MODE_CHARACTERISTIC = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // NUS RX
const RAW_SENSORS_CHARACTERISTIC = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // NUS TX

export type TapEventCallback = (identifier: string, tapcode: number) => void;
export type MouseEventCallback = (identifier: string, vx: number, vy: number, proximity: boolean) => void;
export type AirGestureEventCallback = (identifier: string, gesture: number) => void;
export type AirGestureStateEventCallback = (identifier: string, mouseMode: MouseModes) => void;
export type RawDataEventCallback = (identifier: string, packets: Array<{ type: string; ts: number; payload: number[] }>) => void;
export type ConnectionEventCallback = (sdk: TapSDKWeb) => void;
export type DisconnectionEventCallback = (identifier: string) => void;

export class TapSDKWeb {
    private device: BluetoothDevice | null = null;
    private server: BluetoothRemoteGATTServer | null = null;

    private tapDataChar: BluetoothRemoteGATTCharacteristic | null = null;
    private mouseDataChar: BluetoothRemoteGATTCharacteristic | null = null;
    private airGestureDataChar: BluetoothRemoteGATTCharacteristic | null = null;
    private rawSensorsChar: BluetoothRemoteGATTCharacteristic | null = null;
    private tapModeChar: BluetoothRemoteGATTCharacteristic | null = null;
    private uiCmdChar: BluetoothRemoteGATTCharacteristic | null = null;

    private tapEventCb: TapEventCallback | null = null;
    private mouseEventCb: MouseEventCallback | null = null;
    private airGestureEventCb: AirGestureEventCallback | null = null;
    private airGestureStateEventCb: AirGestureStateEventCallback | null = null;
    private rawDataEventCb: RawDataEventCallback | null = null;
    private connectionCb: ConnectionEventCallback | null = null;
    private disconnectionCb: DisconnectionEventCallback | null = null;

    private mouseMode: MouseModes = MouseModes.STDBY;
    private inputMode: InputMode = new InputModeText();
    private inputType: InputType = InputType.AUTO;
    private inputModeRefreshInterval: number | null = null;
    private readonly INPUT_MODE_REFRESH_TIMEOUT = 10000;

    get identifier(): string {
        return this.device?.name ?? this.device?.id ?? 'unknown';
    }

    get isConnected(): boolean {
        return this.server?.connected ?? false;
    }

    /** Protocol label for unified connect demos. */
    get protocol(): 'v1' {
        return 'v1';
    }

    registerTapEvents(cb: TapEventCallback): void {
        this.tapEventCb = cb;
    }

    registerMouseEvents(cb: MouseEventCallback): void {
        this.mouseEventCb = cb;
    }

    registerAirGestureEvents(cb: AirGestureEventCallback): void {
        this.airGestureEventCb = cb;
    }

    registerAirGestureStateEvents(cb: AirGestureStateEventCallback): void {
        this.airGestureStateEventCb = cb;
    }

    registerRawDataEvents(cb: RawDataEventCallback): void {
        this.rawDataEventCb = cb;
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

    static isSupported(): boolean {
        return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
    }

    /**
     * Connect to a Tap device using Web Bluetooth (v1 path).
     * Prefer package-level connect() for auto protocol detect.
     */
    async connect(): Promise<boolean> {
        if (!TapSDKWeb.isSupported()) {
            throw new Error(
                'Web Bluetooth is not available. Make sure you are using Chrome/Edge/Opera ' +
                'and accessing the page via localhost or HTTPS.',
            );
        }

        this.device = await navigator.bluetooth.requestDevice({
            filters: [{ services: [TAP_SERVICE] }],
            optionalServices: [NUS_SERVICE, DEVICE_INFORMATION_SERVICE, BATTERY_SERVICE],
        });

        this.device.addEventListener('gattserverdisconnected', () => {
            this.onDisconnected();
        });

        return await this.connectGatt();
    }

    private async connectGatt(): Promise<boolean> {
        if (!this.device?.gatt) {
            return false;
        }

        this.server = await this.device.gatt.connect();

        const tapService = await this.server.getPrimaryService(TAP_SERVICE);
        let nusService: BluetoothRemoteGATTService | null = null;
        try {
            nusService = await this.server.getPrimaryService(NUS_SERVICE);
        } catch {
            console.warn('NUS service not available (raw sensors may not work)');
        }

        this.tapDataChar = await tapService.getCharacteristic(TAP_DATA_CHARACTERISTIC);
        this.mouseDataChar = await tapService.getCharacteristic(MOUSE_DATA_CHARACTERISTIC);
        this.airGestureDataChar = await tapService.getCharacteristic(AIR_GESTURE_DATA_CHARACTERISTIC);
        this.uiCmdChar = await tapService.getCharacteristic(UI_CMD_CHARACTERISTIC);

        if (nusService) {
            try {
                this.tapModeChar = await nusService.getCharacteristic(TAP_MODE_CHARACTERISTIC);
            } catch {
                console.warn('TAP mode characteristic not available');
            }
            try {
                this.rawSensorsChar = await nusService.getCharacteristic(RAW_SENSORS_CHARACTERISTIC);
            } catch {
                console.warn('Raw sensors characteristic not available');
            }
        }

        await this.startNotifications();

        if (this.connectionCb) {
            this.connectionCb(this);
        }

        return true;
    }

    disconnect(): void {
        this.stopInputModeRefresh();
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

    async setInputMode(inputMode: InputMode): Promise<void> {
        if (
            inputMode instanceof InputModeRaw &&
            this.inputMode instanceof InputModeRaw &&
            !this.arraysEqual(inputMode.getCommand(), this.inputMode.getCommand())
        ) {
            console.warn('Cannot change raw sensitivities while in raw mode');
            return;
        }

        this.inputMode = inputMode;
        const command = inputMode.getCommand();

        this.startInputModeRefresh();
        await this.writeInputMode(command);
    }

    async setInputType(inputType: InputType): Promise<void> {
        this.inputType = inputType;
        const command = inputTypeCommand(inputType);

        this.startInputModeRefresh();
        await this.writeInputMode(command);
    }

    async sendVibrationSequence(sequence: number[]): Promise<void> {
        if (!this.uiCmdChar) {
            console.warn('UI command characteristic not available');
            return;
        }

        let seq = sequence.slice(0, 18);
        seq = seq.map((d) => Math.max(0, Math.min(255, Math.floor(d / 10))));

        const command = new Uint8Array([0x0, 0x2, ...seq]);
        await this.uiCmdChar.writeValue(command.buffer as ArrayBuffer);
    }

    private async startNotifications(): Promise<void> {
        if (this.tapDataChar) {
            await this.tapDataChar.startNotifications();
            this.tapDataChar.addEventListener('characteristicvaluechanged', (event: Event) => {
                const target = event.target as BluetoothRemoteGATTCharacteristic;
                if (target.value) {
                    this.onTapped(target.value);
                }
            });
        }

        if (this.mouseDataChar) {
            await this.mouseDataChar.startNotifications();
            this.mouseDataChar.addEventListener('characteristicvaluechanged', (event: Event) => {
                const target = event.target as BluetoothRemoteGATTCharacteristic;
                if (target.value) {
                    this.onMoused(target.value);
                }
            });
        }

        if (this.airGestureDataChar) {
            await this.airGestureDataChar.startNotifications();
            this.airGestureDataChar.addEventListener('characteristicvaluechanged', (event: Event) => {
                const target = event.target as BluetoothRemoteGATTCharacteristic;
                if (target.value) {
                    this.onAirGesture(target.value);
                }
            });
        }

        if (this.rawSensorsChar) {
            await this.rawSensorsChar.startNotifications();
            this.rawSensorsChar.addEventListener('characteristicvaluechanged', (event: Event) => {
                const target = event.target as BluetoothRemoteGATTCharacteristic;
                if (target.value) {
                    this.onRawData(target.value);
                }
            });
        }
    }

    private onTapped(data: DataView): void {
        const tapcode = tapDataMsg(data);

        if (this.mouseMode === MouseModes.AIR_MOUSE) {
            if (tapcode === 2 || tapcode === 4) {
                this.onAirGestureFromTap(tapcode + 10);
                return;
            }
        }

        if (this.tapEventCb) {
            this.tapEventCb(this.identifier, tapcode);
        }
    }

    private onMoused(data: DataView): void {
        if (this.mouseEventCb) {
            const [vx, vy, prox] = mouseDataMsg(data);
            this.mouseEventCb(this.identifier, vx, vy, prox);
        }
    }

    private onAirGesture(data: DataView): void {
        const [gesture] = airGestureDataMsg(data);

        if (gesture === 0x14) {
            this.mouseMode = data.getUint8(1) as MouseModes;
            if (this.airGestureStateEventCb) {
                this.airGestureStateEventCb(this.identifier, this.mouseMode);
            }
        } else if (this.airGestureEventCb) {
            this.airGestureEventCb(this.identifier, gesture);
        }
    }

    private onAirGestureFromTap(gesture: number): void {
        if (this.airGestureEventCb) {
            this.airGestureEventCb(this.identifier, gesture);
        }
    }

    private onRawData(data: DataView): void {
        if (this.rawDataEventCb) {
            let scaleFactors: [number | null, number | null, number | null] | undefined;
            if (this.inputMode instanceof InputModeRaw && this.inputMode.scaled) {
                scaleFactors = this.inputMode.sensitivity.getScaleFactors();
            }
            const packets = rawDataMsg(data, scaleFactors);
            this.rawDataEventCb(this.identifier, packets);
        }
    }

    private onDisconnected(): void {
        this.stopInputModeRefresh();
        if (this.disconnectionCb) {
            this.disconnectionCb(this.identifier);
        }
    }

    private async writeInputMode(value: Uint8Array): Promise<void> {
        if (!this.tapModeChar) {
            console.warn('TAP mode characteristic not available');
            return;
        }
        await this.tapModeChar.writeValue(value.buffer as ArrayBuffer);
    }

    private startInputModeRefresh(): void {
        if (this.inputModeRefreshInterval !== null) {
            return;
        }

        this.inputModeRefreshInterval = window.setInterval(async () => {
            await this.refreshInputMode();
        }, this.INPUT_MODE_REFRESH_TIMEOUT);
    }

    private stopInputModeRefresh(): void {
        if (this.inputModeRefreshInterval !== null) {
            window.clearInterval(this.inputModeRefreshInterval);
            this.inputModeRefreshInterval = null;
        }
    }

    private async refreshInputMode(): Promise<void> {
        await this.writeInputMode(this.inputMode.getCommand());
        await this.writeInputMode(inputTypeCommand(this.inputType));
    }

    private arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }
}
