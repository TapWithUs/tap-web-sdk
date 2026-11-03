import { describe, expect, it, vi } from 'vitest';
import { TapSDKWeb } from '../src/TapSDKWeb';
import { TapSDKWeb2 } from '../src/TapSDKWeb2';

function deviceWithFailingGatt(): { device: BluetoothDevice; listeners: Set<() => void> } {
    const listeners = new Set<() => void>();
    const device = {
        id: 'failing',
        name: 'Tap_1',
        gatt: {
            connected: false,
            connect: () => Promise.reject(new Error('link failed')),
            disconnect: () => {},
        },
        addEventListener: (_type: string, l: () => void) => listeners.add(l),
        removeEventListener: (_type: string, l: () => void) => listeners.delete(l),
    } as unknown as BluetoothDevice;
    return { device, listeners };
}

describe('disconnect listener cleanup', () => {
    it('TapSDKWeb removes its gattserverdisconnected listener when the connection fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const { device, listeners } = deviceWithFailingGatt();
        expect(await new TapSDKWeb().connectToDevice(device)).toBe(false);
        expect(listeners.size).toBe(0);
    });

    it('TapSDKWeb2 removes its gattserverdisconnected listener when the connection fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const { device, listeners } = deviceWithFailingGatt();
        expect(await new TapSDKWeb2({}).connectToDevice(device)).toBe(false);
        expect(listeners.size).toBe(0);
    });
});
