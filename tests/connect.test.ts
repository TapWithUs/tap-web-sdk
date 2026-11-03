import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/detect', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../src/detect')>()),
    detectProtocol: vi.fn(async () => 'v1'),
}));
vi.mock('../src/TapSDKWeb', () => ({
    TapSDKWeb: class { async connectToDevice(): Promise<boolean> { return true; } },
}));
vi.mock('../src/TapSDKWeb2', () => ({
    TapSDKWeb2: class { async connectToDevice(): Promise<boolean> { return true; } },
}));

type ConnectModule = typeof import('../src/connect');
let mod: ConnectModule;
let connectToDevice: ConnectModule['connectToDevice'];
let getPermittedDevices: ConnectModule['getPermittedDevices'];
let connect: ConnectModule['connect'];

beforeEach(async () => {
    vi.resetModules();
    mod = await import('../src/connect');
    ({ connectToDevice, getPermittedDevices, connect } = mod);
});

type Listener = () => void;

function stubBluetooth(bluetooth: Partial<Bluetooth>): void {
    vi.stubGlobal('navigator', { bluetooth });
}

function fakeDevice(
    connect: () => Promise<BluetoothRemoteGATTServer>,
    id = 'abc',
    name = 'Tap_1',
): BluetoothDevice {
    const listeners = new Set<Listener>();
    return {
        id,
        name,
        gatt: { connected: false, connect, disconnect: vi.fn() },
        addEventListener: (_type: string, l: Listener) => listeners.add(l),
        removeEventListener: (_type: string, l: Listener) => listeners.delete(l),
    } as unknown as BluetoothDevice;
}

afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe('getPermittedDevices', () => {
    it('returns [] when Web Bluetooth is missing', async () => {
        vi.stubGlobal('navigator', {});
        expect(await getPermittedDevices()).toEqual([]);
    });

    it('returns [] when getDevices is not implemented', async () => {
        stubBluetooth({});
        expect(await getPermittedDevices()).toEqual([]);
    });

    it('returns [] when getDevices throws', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        stubBluetooth({ getDevices: () => Promise.reject(new Error('blocked')) });
        expect(await getPermittedDevices()).toEqual([]);
        warn.mockRestore();
    });

    it('keeps only Tap devices from getDevices()', async () => {
        const tap = fakeDevice(() => Promise.reject(new Error('unused')), 'tap', 'TapXR_29BB');
        const other = fakeDevice(() => Promise.reject(new Error('unused')), 'kbd', 'Keyboard');
        stubBluetooth({ getDevices: () => Promise.resolve([other, tap]) });
        expect(await getPermittedDevices()).toEqual([tap]);
    });
});

describe('connectToDevice', () => {
    it('rejects with a clear error when the GATT link never comes up', async () => {
        vi.useFakeTimers();
        stubBluetooth({});
        const device = fakeDevice(() => new Promise(() => {}));
        const result = connectToDevice(device, { connectTimeout: 500 });
        const assertion = expect(result).rejects.toThrow(/Timed out connecting to Tap_1/);
        await vi.advanceTimersByTimeAsync(500);
        await assertion;
        expect(device.gatt?.disconnect).toHaveBeenCalled();
    });

    it('rejects when the device has no GATT server', async () => {
        stubBluetooth({});
        await expect(connectToDevice({ id: 'x' } as unknown as BluetoothDevice))
            .rejects.toThrow('no GATT server');
    });
});

const okServer = (): Promise<BluetoothRemoteGATTServer> =>
    Promise.resolve({} as BluetoothRemoteGATTServer);

describe('connect', () => {
    it('opens the picker when no Tap is known', async () => {
        const picked = fakeDevice(okServer);
        const requestDevice = vi.fn(async () => picked);
        stubBluetooth({ requestDevice });
        await connect();
        expect(requestDevice).toHaveBeenCalledOnce();
    });

    it('reconnects the last used Tap without the picker', async () => {
        const picked = fakeDevice(okServer);
        const requestDevice = vi.fn(async () => picked);
        stubBluetooth({ requestDevice });
        await connect();
        await connect();
        expect(requestDevice).toHaveBeenCalledOnce();
    });

    it('falls back to the picker when the last Tap does not answer', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        let hang = false;
        const last = fakeDevice(() => (hang ? new Promise(() => {}) : okServer()));
        const fresh = fakeDevice(okServer, 'fresh');
        const requestDevice = vi.fn().mockResolvedValueOnce(last).mockResolvedValueOnce(fresh);
        stubBluetooth({ requestDevice });
        await connect();
        hang = true;
        vi.useFakeTimers();
        const result = connect({ reuseTimeout: 100 });
        await vi.advanceTimersByTimeAsync(100);
        await result;
        expect(requestDevice).toHaveBeenCalledTimes(2);
        warn.mockRestore();
    });

    it('does not auto-reuse a device known only from getDevices()', async () => {
        const granted = fakeDevice(okServer, 'granted');
        const fresh = fakeDevice(okServer, 'fresh');
        const requestDevice = vi.fn(async () => fresh);
        stubBluetooth({ requestDevice, getDevices: async () => [granted] });
        const grantedConnect = vi.spyOn(granted.gatt as BluetoothRemoteGATTServer, 'connect');
        await connect();
        expect(grantedConnect).not.toHaveBeenCalled();
        expect(requestDevice).toHaveBeenCalledOnce();
    });

    it('skips the last Tap when reuseKnownDevice is false', async () => {
        const first = fakeDevice(okServer, 'first');
        const second = fakeDevice(okServer, 'second');
        const requestDevice = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
        stubBluetooth({ requestDevice });
        await connect();
        await connect({ reuseKnownDevice: false });
        expect(requestDevice).toHaveBeenCalledTimes(2);
    });

    it('connects to options.device without the picker', async () => {
        const chosen = fakeDevice(okServer, 'chosen');
        const requestDevice = vi.fn();
        stubBluetooth({ requestDevice, getDevices: async () => [fakeDevice(okServer, 'other')] });
        await connect({ device: chosen });
        expect(requestDevice).not.toHaveBeenCalled();
    });

    it('with several Taps, reuses the most recently connected one', async () => {
        const older = fakeDevice(okServer, 'older');
        const recent = fakeDevice(okServer, 'recent');
        const requestDevice = vi.fn();
        stubBluetooth({ requestDevice });
        await connectToDevice(older);
        await connectToDevice(recent);
        const olderConnect = vi.spyOn(older.gatt as BluetoothRemoteGATTServer, 'connect');
        const recentConnect = vi.spyOn(recent.gatt as BluetoothRemoteGATTServer, 'connect');
        await connect();
        expect(recentConnect).toHaveBeenCalled();
        expect(olderConnect).not.toHaveBeenCalled();
        expect(requestDevice).not.toHaveBeenCalled();
    });
});

describe('getPermittedDevices with session memory', () => {
    it('lists session devices first and drops duplicates by id', async () => {
        const session = fakeDevice(okServer, 'a');
        const sameIdFromChrome = fakeDevice(okServer, 'a');
        const other = fakeDevice(okServer, 'b');
        stubBluetooth({ getDevices: async () => [other, sameIdFromChrome] });
        await connectToDevice(session);
        const devices = await getPermittedDevices();
        expect(devices.map((d) => d.id)).toEqual(['a', 'b']);
        expect(devices[0]).toBe(session);
    });

    it('still lists session devices when getDevices is missing', async () => {
        const session = fakeDevice(okServer, 'a');
        stubBluetooth({});
        await connectToDevice(session);
        expect(await getPermittedDevices()).toEqual([session]);
    });
});

describe('connectToDevice edge cases', () => {
    it('disconnects a link that comes up after the timeout', async () => {
        vi.useFakeTimers();
        stubBluetooth({});
        let resolveLate!: (server: BluetoothRemoteGATTServer) => void;
        const server = { disconnect: vi.fn(), connected: true } as unknown as BluetoothRemoteGATTServer;
        const device = fakeDevice(() => new Promise((resolve) => { resolveLate = resolve; }));
        const result = connectToDevice(device, { connectTimeout: 500 });
        const assertion = expect(result).rejects.toThrow(/Timed out/);
        await vi.advanceTimersByTimeAsync(500);
        await assertion;
        resolveLate(server);
        await vi.advanceTimersByTimeAsync(0);
        expect(server.disconnect).toHaveBeenCalled();
    });

    it('returns a TapSDKWeb2 for framed firmware', async () => {
        const { detectProtocol } = await import('../src/detect');
        vi.mocked(detectProtocol).mockResolvedValueOnce('v2');
        stubBluetooth({});
        const sdk = await connectToDevice(fakeDevice(okServer, 'framed'));
        expect(mod.isTapSDKWeb2(sdk)).toBe(true);
    });

    it('caps reuseTimeout at 4 s so the picker can still open', async () => {
        vi.useFakeTimers();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        let hang = false;
        const last = fakeDevice(() => (hang ? new Promise(() => {}) : okServer()), 'last');
        const fresh = fakeDevice(okServer, 'fresh');
        const requestDevice = vi.fn().mockResolvedValueOnce(last).mockResolvedValueOnce(fresh);
        stubBluetooth({ requestDevice });
        await connect();
        hang = true;
        const result = connect({ reuseTimeout: 9000 });
        await vi.advanceTimersByTimeAsync(4000);
        await result;
        expect(requestDevice).toHaveBeenCalledTimes(2);
        warn.mockRestore();
    });
});
