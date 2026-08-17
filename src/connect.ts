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
}

function assertBluetoothSupported(): void {
    if (typeof navigator === 'undefined' || !('bluetooth' in navigator)) {
        throw new Error(
            'Web Bluetooth is not available. Make sure you are using Chrome/Edge/Opera ' +
            'and accessing the page via localhost or HTTPS.',
        );
    }
}

/**
 * Request a Tap device, detect v1/v2 protocol, return matching SDK.
 * Does full GATT setup + notifications (web equivalent of Python connect + start).
 */
export async function connect(options?: ConnectOptions): Promise<ConnectedTapSDK> {
    assertBluetoothSupported();

    const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [TAP_SERVICE] }],
        optionalServices: [NUS_SERVICE, DEVICE_INFORMATION_SERVICE, BATTERY_SERVICE],
    });

    if (!device.gatt) {
        throw new Error('Device has no GATT server');
    }

    const server = await device.gatt.connect();
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

export function isTapSDKWeb2(sdk: ConnectedTapSDK): sdk is TapSDKWeb2 {
    return sdk instanceof TapSDKWeb2;
}
