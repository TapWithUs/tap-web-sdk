# TapSDK Web

TypeScript/JavaScript SDK for [Tap Strap](https://www.tapwithus.com/) and [TapXR](https://www.tapwithus.com/) in the browser via [Web Bluetooth](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API).

**Package:** [`@tapwithus/tapsdk`](https://www.npmjs.com/package/@tapwithus/tapsdk) · **Demo:** [tapwithus.github.io/tap-web-sdk](https://tapwithus.github.io/tap-web-sdk)

Docs: [Web SDK](https://dev.tapwithus.com/docs/web/) · [Getting started](https://dev.tapwithus.com/docs/getting-started/) · [How Tap works](https://dev.tapwithus.com/docs/how-tap-works/)

Supported hardware for this SDK: **Tap Strap** and **TapXR**. [Tap Band](https://www.tapwithus.com/tapband-waitlist/) is on a waitlist.

## Browser Support

Web Bluetooth works in **Chrome**, **Edge**, and **Opera**. Safari and Firefox are not supported. Serve the page over **HTTPS** or **localhost**. Call `connect()` from a user gesture (for example a button click).

## Installation

```bash
npm install @tapwithus/tapsdk
```

## Quick Start

Devices boot in Text / HID keyboard mode. For tap callbacks on v1, switch to **Controller** after connect. Call `connect()` from a user gesture.

```typescript
import {
    connect,
    isTapSDKWeb2,
    InputModeController,
} from '@tapwithus/tapsdk';

// Must run from a user gesture (e.g. button onclick)
const sdk = await connect();

sdk.registerDisconnectionEvents((id) => console.log('Disconnected', id));

if (isTapSDKWeb2(sdk)) {
    sdk.registerTapEvents((id, data) => console.log('Tap', data[0]));
} else {
    sdk.registerTapEvents((id, tapcode) => console.log('Tap', tapcode));
    sdk.registerMouseEvents((id, vx, vy, proximity) => {
        console.log(`Mouse: vx=${vx}, vy=${vy}, proximity=${proximity}`);
    });
    await sdk.setInputMode(new InputModeController());
}

await sdk.sendVibrationSequence([100, 200, 100]);
```

If you get no events on v1, you are still in Text mode — call `await sdk.setInputMode(new InputModeController())`.

## AI-Assisted Development

Use a coding agent with the `tap-sdk-web` skill. The skill holds SDK rules (install path, Controller mode, browsers, common mistakes). Your prompt only needs to describe the app.

### Install the skill

From your app project root:

```bash
curl -sL https://raw.githubusercontent.com/TapWithUs/tap-web-sdk/master/install-skills.sh | bash
```

Or install for one tool:

```bash
curl -sL https://raw.githubusercontent.com/TapWithUs/tap-web-sdk/master/install-skills.sh | bash -s -- cursor
curl -sL https://raw.githubusercontent.com/TapWithUs/tap-web-sdk/master/install-skills.sh | bash -s -- claude
```

From a local clone of this repo:

```bash
./install-skills.sh all      # Cursor + Claude
./install-skills.sh cursor
./install-skills.sh claude
```

| Tool | Skill path |
|------|------------|
| [Cursor](https://cursor.com/) | `.cursor/skills/tap-sdk-web/` |
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | `.claude/skills/tap-sdk-web/` |

### Sample prompt

After the skill is installed, describe the app:

```text
Build a small web page with @tapwithus/tapsdk: a Connect button that pairs a Tap Strap and logs each finger combination to the page.
```

## API Reference

### TapSDKWeb

The main class for interacting with Tap devices.

#### Static Methods

| Method | Description |
|--------|-------------|
| `TapSDKWeb.isSupported()` | Returns `true` if Web Bluetooth is available |

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `identifier` | `string` | Device name or ID |
| `isConnected` | `boolean` | Current connection status |

#### Connection Methods

| Method | Description |
|--------|-------------|
| `connect()` | Opens browser device picker and connects to selected Tap |
| `disconnect()` | Disconnects from the device |
| `getPermittedDevices()` | Returns previously permitted devices (Chrome 85+) |
| `connectToDevice(device)` | Connects to a specific `BluetoothDevice` |

#### Event Registration

| Method | Callback Signature |
|--------|-------------------|
| `registerConnectionEvents(cb)` | `(sdk: TapSDKWeb) => void` |
| `registerDisconnectionEvents(cb)` | `(identifier: string) => void` |
| `registerTapEvents(cb)` | `(identifier: string, tapcode: number) => void` |
| `registerMouseEvents(cb)` | `(identifier: string, vx: number, vy: number, proximity: boolean) => void` |
| `registerAirGestureEvents(cb)` | `(identifier: string, gesture: number) => void` |
| `registerAirGestureStateEvents(cb)` | `(identifier: string, mouseMode: MouseModes) => void` |
| `registerRawDataEvents(cb)` | `(identifier: string, packets: RawDataPacket[]) => void` |

#### Control Methods

| Method | Description |
|--------|-------------|
| `getDeviceInfo()` | Read DIS/BAS + Tap device fields (`Promise<DeviceInfo>`) |
| `setInputMode(mode)` | Set input mode (Text, Controller, ControllerText, Raw) |
| `setInputType(type)` | Set input type for TapXR (Auto, Mouse, Keyboard) |
| `sendVibrationSequence(durations)` | Send haptic feedback (array of durations in ms) |

### Input Modes

```typescript
import {
    InputModeText,
    InputModeController,
    InputModeControllerText,
    InputModeRaw,
} from '@tapwithus/tapsdk';

// Text mode - taps generate keyboard characters (silent to the SDK)
await tap.setInputMode(new InputModeText());

// Controller mode - taps generate raw tap codes + mouse/gesture events
await tap.setInputMode(new InputModeController());

// Combined mode - both text and controller events
await tap.setInputMode(new InputModeControllerText());

// Raw mode - IMU and accelerometer data
import { FingerAcclSensitivity, ImuGyroSensitivity, ImuAcclSensitivity } from '@tapwithus/tapsdk';

await tap.setInputMode(new InputModeRaw({
    scaled: true,
    fingerAcclSens: FingerAcclSensitivity.G16,
    imuGyroSens: ImuGyroSensitivity.DPS500,
    imuAcclSens: ImuAcclSensitivity.G4,
}));
```

### Input Types (TapXR)

```typescript
import { InputType } from '@tapwithus/tapsdk';

await tap.setInputType(InputType.AUTO);     // Auto-detect
await tap.setInputType(InputType.MOUSE);    // Mouse mode
await tap.setInputType(InputType.KEYBOARD); // Keyboard mode
```

### Tap Codes

Tap codes are 5-bit bitmaps representing which fingers tapped:

| Finger | Bit Value |
|--------|-----------|
| Thumb  | 1 |
| Index  | 2 |
| Middle | 4 |
| Ring   | 8 |
| Pinky  | 16 |

Example: `tapcode = 3` means Thumb + Index tapped together.

### Mouse Events & Orientation Data

Mouse events include velocity, proximity, and device orientation (roll, pitch, yaw):

```typescript
tap.registerMouseEvents((identifier, vx, vy, proximity, roll, pitch, yaw) => {
    // vx, vy: Mouse velocity (signed integers)
    // proximity: Boolean indicating if mouse is active
    // roll, pitch, yaw: Orientation angles in degrees (signed integers)
    console.log(`Velocity: (${vx}, ${vy}), Active: ${proximity}`);
    console.log(`Orientation: roll=${roll}°, pitch=${pitch}°, yaw=${yaw}°`);
});
```

**Note:** Orientation data (roll/pitch/yaw) may be zero if not available on older firmware versions or if the data packet is shorter than 16 bytes.

### Air Gestures

TapXR only. Use enums from this package; do not invent gesture lists.

```typescript
import { AirGestures } from '@tapwithus/tapsdk';

tap.registerAirGestureEvents((identifier, gesture) => {
    switch (gesture) {
        case AirGestures.GENERAL:
            console.log('General gesture');
            break;
        case AirGestures.UP_ONE_FINGER:
            console.log('Swipe up');
            break;
        case AirGestures.DOWN_ONE_FINGER:
            console.log('Swipe down');
            break;
        // ... see AirGestures in the package
    }
});
```

### Haptic Feedback

```typescript
// Array of durations in milliseconds (10-2550ms, 10ms resolution)
// Maximum 18 values
await tap.sendVibrationSequence([100, 200, 100, 200, 500]);
```

## Testing the Example Locally

The SDK includes a unified demo in [examples/index.html](./examples/index.html).

### Prerequisites

- A Chromium-based browser (Chrome, Edge, or Opera)
- A Tap Strap or TapXR device
- HTTPS or localhost (required for Web Bluetooth)

### Steps to Run

1. **Build the SDK**:

```bash
npm run build
```

This compiles the TypeScript source and creates the bundle at `dist/tap-web-sdk.bundle.js`.

2. **Start a local web server**:

```bash
# Option 1: Using npx serve (no installation needed)
npx serve .

# Option 2: Using Python 3
python3 -m http.server 8000

# Option 3: Using Node.js http-server
npx http-server -p 8000
```

3. **Open the example in your browser**:

- If using `serve`: Open [http://localhost:3000/examples/](http://localhost:3000/examples/)
- If using Python or http-server: Open [http://localhost:8000/examples/](http://localhost:8000/examples/)

4. **Test the SDK**:

- Click "Connect to Tap" to open the browser's Bluetooth device picker (user gesture required)
- Select your Tap device
- Use **Controller Mode** for tap callbacks (default Text mode is silent to the SDK)
- Tap your fingers to see events in the log
- Test haptic feedback with the "Send Vibration" button

### Troubleshooting

- **"Bluetooth not available"**: Use Chrome, Edge, or Opera (not Safari/Firefox); serve over HTTPS or localhost
- **"Connection failed"**: Ensure the Tap is powered on and not connected to another host
- **"HTTPS required"**: `localhost` works; remote hosts need HTTPS
- **No events appearing**: On v1, switch to Controller mode — Text mode does not deliver SDK tap callbacks
- **User gesture**: Call `connect()` from a click/tap handler, not on page load

## Development

```bash
git clone https://github.com/TapWithUs/tap-web-sdk.git
cd tap-web-sdk
npm install
npm run build
npm test
```

To use a local build in another project:

```bash
# In tap-web-sdk
npm link

# In your app
npm link @tapwithus/tapsdk
```

## License

MIT
