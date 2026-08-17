// Shared device metadata reads — ported from tapsdk/device_info.py

export const DEVICE_INFORMATION_SERVICE = '0000180a-0000-1000-8000-00805f9b34fb';
export const BATTERY_SERVICE = '0000180f-0000-1000-8000-00805f9b34fb';
export const MANUFACTURER_NAME_CHARACTERISTIC = '00002a29-0000-1000-8000-00805f9b34fb';
export const SERIAL_NUMBER_CHARACTERISTIC = '00002a25-0000-1000-8000-00805f9b34fb';
export const HARDWARE_REVISION_CHARACTERISTIC = '00002a27-0000-1000-8000-00805f9b34fb';
export const FIRMWARE_REVISION_CHARACTERISTIC = '00002a26-0000-1000-8000-00805f9b34fb';
export const SOFTWARE_REVISION_CHARACTERISTIC = '00002a28-0000-1000-8000-00805f9b34fb';
export const BATTERY_LEVEL_CHARACTERISTIC = '00002a19-0000-1000-8000-00805f9b34fb';
export const GAP_DEVICE_NAME_CHARACTERISTIC = '00002a00-0000-1000-8000-00805f9b34fb';

export const DEVICE_NAME_CHARACTERISTIC = 'c3ff0003-1d8b-40fd-a56f-c7bd5d0f3370';
export const MODEL_VERSION_CHARACTERISTIC = 'c3ff000c-1d8b-40fd-a56f-c7bd5d0f3370';
export const FW_VERSION2_CHARACTERISTIC = 'c3ff000d-1d8b-40fd-a56f-c7bd5d0f3370';

export interface DeviceInfo {
    name: string | null;
    fwVersion: string | null;
    fwVersion2: string | null;
    modelVersion: string | null;
    hardwareRevision: string | null;
    serialNumber: string | null;
    manufacturer: string | null;
    softwareRevision: string | null;
    batteryLevel: number | null;
}

export function formatModelVersionHex(value: string | null): string | null {
    if (value === null) {
        return null;
    }
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) {
        return value;
    }
    return `0x${parsed.toString(16).toUpperCase()}`;
}

async function readGattString(
    server: BluetoothRemoteGATTServer,
    serviceUuid: string,
    charUuid: string,
): Promise<string | null> {
    try {
        const service = await server.getPrimaryService(serviceUuid);
        const characteristic = await service.getCharacteristic(charUuid);
        const value = await characteristic.readValue();
        const text = new TextDecoder().decode(value.buffer).replace(/\0/g, '').trim();
        return text || null;
    } catch {
        return null;
    }
}

async function readGattUint8(
    server: BluetoothRemoteGATTServer,
    serviceUuid: string,
    charUuid: string,
): Promise<number | null> {
    try {
        const service = await server.getPrimaryService(serviceUuid);
        const characteristic = await service.getCharacteristic(charUuid);
        const value = await characteristic.readValue();
        if (value.byteLength === 0) {
            return null;
        }
        return value.getUint8(0);
    } catch {
        return null;
    }
}

async function resolveDeviceName(
    server: BluetoothRemoteGATTServer,
    deviceName: string | undefined,
    tapServiceUuid: string,
): Promise<string | null> {
    if (deviceName) {
        return deviceName;
    }
    const tapName = await readGattString(server, tapServiceUuid, DEVICE_NAME_CHARACTERISTIC);
    if (tapName) {
        return tapName;
    }
    return readGattString(server, DEVICE_INFORMATION_SERVICE, GAP_DEVICE_NAME_CHARACTERISTIC);
}

/**
 * Read device name, FW versions, battery, and other public fields.
 * Missing characteristics yield null for that field.
 */
export async function readDeviceInfo(
    server: BluetoothRemoteGATTServer,
    options?: { deviceName?: string; tapServiceUuid?: string },
): Promise<DeviceInfo> {
    const tapServiceUuid = options?.tapServiceUuid ?? 'c3ff0001-1d8b-40fd-a56f-c7bd5d0f3370';
    const modelVersionRaw = await readGattString(server, tapServiceUuid, MODEL_VERSION_CHARACTERISTIC);

    return {
        name: await resolveDeviceName(server, options?.deviceName, tapServiceUuid),
        fwVersion: await readGattString(server, DEVICE_INFORMATION_SERVICE, FIRMWARE_REVISION_CHARACTERISTIC),
        fwVersion2: await readGattString(server, tapServiceUuid, FW_VERSION2_CHARACTERISTIC),
        modelVersion: formatModelVersionHex(modelVersionRaw),
        hardwareRevision: await readGattString(server, DEVICE_INFORMATION_SERVICE, HARDWARE_REVISION_CHARACTERISTIC),
        serialNumber: await readGattString(server, DEVICE_INFORMATION_SERVICE, SERIAL_NUMBER_CHARACTERISTIC),
        manufacturer: await readGattString(server, DEVICE_INFORMATION_SERVICE, MANUFACTURER_NAME_CHARACTERISTIC),
        softwareRevision: await readGattString(server, DEVICE_INFORMATION_SERVICE, SOFTWARE_REVISION_CHARACTERISTIC),
        batteryLevel: await readGattUint8(server, BATTERY_SERVICE, BATTERY_LEVEL_CHARACTERISTIC),
    };
}
