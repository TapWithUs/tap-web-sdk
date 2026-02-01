# TapSDK Web

A TypeScript/JavaScript SDK for communicating with [Tap Strap](https://www.tapwithus.com/) devices in the browser using Web Bluetooth.

## Browser Support

This SDK uses the [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API) which is supported in:
- **Chrome** (Desktop & Android)
- **Edge**
- **Opera**

> **Note:** Safari and Firefox do not support Web Bluetooth. The page must be served over HTTPS or localhost.

## Installation

```bash
npm install tap-sdk-web
```

Or include directly via CDN:

```html
<script type="module">
    import { TapSDKWeb } from 'https://unpkg.com/tap-sdk-web/dist/tap-sdk-web.bundle.js';
</script>
```

## Quick Start

```typescript
import {
    TapSDKWeb,
    InputModeController,
    InputType,
} from 'tap-sdk-web';

const tap = new TapSDKWeb();

// Register event callbacks
tap.registerConnectionEvents((sdk) => {
    console.log(`Connected to: ${sdk.identifier}`);
});

tap.registerTapEvents((identifier, tapcode) => {
    // tapcode is a 5-bit bitmap: Thumb=1, Index=2, Middle=4, Ring=8, Pinky=16
    console.log(`Tap detected: ${tapcode}`);
});

tap.registerMouseEvents((identifier, vx, vy, proximity) => {
    console.log(`Mouse: vx=${vx}, vy=${vy}, proximity=${proximity}`);
});

tap.registerAirGestureEvents((identifier, gesture) => {
    console.log(`Air gesture: ${gesture}`);
});

// Connect (triggers browser device picker)
await tap.connect();

// Set input mode
await tap.setInputMode(new InputModeController());

// Send haptic feedback
await tap.sendVibrationSequence([100, 200, 100]);
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
} from 'tap-sdk-web';

// Text mode - taps generate keyboard characters
await tap.setInputMode(new InputModeText());

// Controller mode - taps generate raw tap codes + mouse/gesture events
await tap.setInputMode(new InputModeController());

// Combined mode - both text and controller events
await tap.setInputMode(new InputModeControllerText());

// Raw mode - IMU and accelerometer data
import { FingerAcclSensitivity, ImuGyroSensitivity, ImuAcclSensitivity } from 'tap-sdk-web';

await tap.setInputMode(new InputModeRaw({
    scaled: true,
    fingerAcclSens: FingerAcclSensitivity.G16,
    imuGyroSens: ImuGyroSensitivity.DPS500,
    imuAcclSens: ImuAcclSensitivity.G4,
}));
```

### Input Types (TapXR)

```typescript
import { InputType } from 'tap-sdk-web';

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

### Air Gestures

```typescript
import { AirGestures } from 'tap-sdk-web';

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
        // ... etc
    }
});
```

### Haptic Feedback

```typescript
// Array of durations in milliseconds (10-2550ms, 10ms resolution)
// Maximum 18 values
await tap.sendVibrationSequence([100, 200, 100, 200, 500]);
```

## Example

See the [examples/basic](./examples/basic/) directory for a complete working example.

To run the example:

```bash
# Build the SDK
npm run build

# Serve the examples directory (requires a local server)
npx serve .

# Open http://localhost:3000/examples/basic/ in Chrome
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Watch mode for tests
npm run test:watch
```

## License

MIT
