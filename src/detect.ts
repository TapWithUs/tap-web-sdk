// Protocol detect ported from tapsdk/_detect.py

export const TAP_SERVICE = 'c3ff0001-1d8b-40fd-a56f-c7bd5d0f3370';
export const NUS_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
export const V2_READ_CHAR = 'c3ff000e-1d8b-40fd-a56f-c7bd5d0f3370';
export const V2_WRITE_CHAR = 'c3ff000f-1d8b-40fd-a56f-c7bd5d0f3370';

export type TapProtocol = 'v1' | 'v2';

/**
 * Return "v2" if framed-protocol read characteristic is present.
 * Requires GATT services already discovered (after gatt.connect()).
 */
export async function detectProtocol(server: BluetoothRemoteGATTServer): Promise<TapProtocol> {
    const service = await server.getPrimaryService(TAP_SERVICE);
    try {
        await service.getCharacteristic(V2_READ_CHAR);
        return 'v2';
    } catch {
        return 'v1';
    }
}

/** Synchronous check when characteristic list is already known. */
export function detectProtocolFromCharacteristics(characteristicUuids: string[]): TapProtocol {
    const target = V2_READ_CHAR.toLowerCase();
    return characteristicUuids.some((uuid) => uuid.toLowerCase() === target) ? 'v2' : 'v1';
}
