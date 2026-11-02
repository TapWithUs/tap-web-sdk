// Unified connect — ported from tapsdk/__init__.py connect()

import { TapSDKWeb } from './TapSDKWeb';
import { TapSDKWeb2 } from './TapSDKWeb2';
import {
    BATTERY_SERVICE,
    DEVICE_INFORMATION_SERVICE,
} from './deviceInfo';
import { detectProtocol, NUS_SERVICE, TAP_SERVICE } from './detect';

export type ConnectedTapSDK = TapSDKWeb | TapSDKWeb2;

export interface ConnectOptions {
    keepaliveTimeout?: number;
    getTimeout?: number;
    /** Max ms to wait for the GATT link (default 10000). */
    connectTimeout?: number;
    /** connect() only: connect to this device and skip the picker. */
    device?: BluetoothDevice;
    /**
     * connect() only. When true (default), reconnect the Tap most recently connected in this
     * page session before opening the picker. Set false to always open the picker, e.g. to add another Tap.
     */
    reuseKnownDevice?: boolean;
    /** connect() only: ms to wait on the known device before opening the picker (default 3000). */
    reuseTimeout?: number;
}

function assertBluetoothSupported(): void {
    if (typeof navigator === 'undefined' || !('bluetooth' in navigator)) {
        throw new Error(
            'Web Bluetooth is not available. Make sure you are using Chrome or Edge ' +
            'and accessing the page via localhost or HTTPS.',
        );
    }
}

const TAP_OPTIONAL_SERVICES = [NUS_SERVICE, DEVICE_INFORMATION_SERVICE, BATTERY_SERVICE];
const DEFAULT_CONNECT_TIMEOUT_MS = 10000;
const DEFAULT_REUSE_TIMEOUT_MS = 3000;

/** Devices connected in this page session, most recent first. Works without getDevices(). */
let sessionDevices: BluetoothDevice[] = [];

function rememberDevice(device: BluetoothDevice): void {
    sessionDevices = [device, ...sessionDevices.filter((d) => d.id !== device.id)];
}

/**
 * Known Tap devices, most recently used first: Taps connected earlier in this page session,
 * plus devices this origin was granted before (needs getDevices(), Chrome 85+, which may
 * require a flag). After a page reload, connecting to a granted Tap that is not advertising
 * (for example one still connected to the OS) often fails with "no longer in range".
 */
export async function getPermittedDevices(): Promise<BluetoothDevice[]> {
    const devices = [...sessionDevices];
    if (
        typeof navigator !== 'undefined'
        && 'bluetooth' in navigator
        && typeof navigator.bluetooth.getDevices === 'function'
    ) {
        try {
            for (const device of await navigator.bluetooth.getDevices()) {
                if (!devices.some((d) => d.id === device.id)) {
                    devices.push(device);
                }
            }
        } catch (error) {
            console.warn('getDevices failed:', error);
        }
    }
    return devices;
}

async function gattConnectWithTimeout(
    device: BluetoothDevice,
    timeoutMs: number,
): Promise<BluetoothRemoteGATTServer> {
    if (!device.gatt) {
        throw new Error('Device has no GATT server');
    }
    const gatt = device.gatt;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
            if (!gatt.connected) {
                gatt.disconnect();
            }
            reject(new Error(
                `Timed out connecting to ${device.name ?? device.id}. ` +
                'Make sure the Tap is on and in range.',
            ));
        }, timeoutMs);
    });
    try {
        return await Promise.race([gatt.connect(), timeout]);
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Connect to a specific BluetoothDevice (for example from getPermittedDevices()), detect
 * firmware, and return TapSDKWeb or TapSDKWeb2. Needs no user click and no picker.
 */
export async function connectToDevice(
    device: BluetoothDevice,
    options?: ConnectOptions,
): Promise<ConnectedTapSDK> {
    assertBluetoothSupported();

    const server = await gattConnectWithTimeout(
        device,
        options?.connectTimeout ?? DEFAULT_CONNECT_TIMEOUT_MS,
    );
    try {
        const sdk = await createSdk(device, server, options);
        rememberDevice(device);
        return sdk;
    } catch (error) {
        if (device.gatt?.connected) {
            device.gatt.disconnect();
        }
        throw error;
    }
}

async function createSdk(
    device: BluetoothDevice,
    server: BluetoothRemoteGATTServer,
    options?: ConnectOptions,
): Promise<ConnectedTapSDK> {
    const protocol = await detectProtocol(server);

    if (protocol === 'v2') {
        const sdk = new TapSDKWeb2({
            keepaliveTimeout: options?.keepaliveTimeout,
            getTimeout: options?.getTimeout,
        });
        const ok = await sdk.connectToDevice(device);
        if (!ok) {
            throw new Error('Failed to complete TapSDK2 connection setup');
        }
        return sdk;
    }

    const sdk = new TapSDKWeb();
    const ok = await sdk.connectToDevice(device);
    if (!ok) {
        throw new Error('Failed to complete TapSDK connection setup');
    }
    return sdk;
}

/**
 * Connect to a Tap, detect firmware, and return TapSDKWeb or TapSDKWeb2. Call from a user click.
 * Starts GATT notifications (web equivalent of Python connect + start).
 *
 * Order: `options.device` if given. Otherwise the Tap most recently connected in this page
 * session, tried for `reuseTimeout` ms. Otherwise the browser device picker.
 * A Tap still connected to the OS does not advertise, so it is missing from the picker;
 * that is why the last Tap is tried first. This works until the page reloads. Devices
 * known only from getDevices() are not auto-reused: after a reload Chrome often cannot reach
 * a Tap that is not advertising ("no longer in range"). Set `reuseKnownDevice: false` to always show the picker.
 */
export async function connect(options?: ConnectOptions): Promise<ConnectedTapSDK> {
    assertBluetoothSupported();

    if (options?.device) {
        return connectToDevice(options.device, options);
    }

    if (options?.reuseKnownDevice !== false) {
        const [known] = sessionDevices;
        if (known) {
            try {
                return await connectToDevice(known, {
                    ...options,
                    connectTimeout: options?.reuseTimeout ?? DEFAULT_REUSE_TIMEOUT_MS,
                });
            } catch (error) {
                console.warn('Could not reuse the known Tap, opening the picker:', error);
            }
        }
    }

    const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [TAP_SERVICE] }],
        optionalServices: TAP_OPTIONAL_SERVICES,
    });

    return connectToDevice(device, options);
}

export function isTapSDKWeb2(sdk: ConnectedTapSDK): sdk is TapSDKWeb2 {
    return sdk instanceof TapSDKWeb2;
}
