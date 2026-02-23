# TapSDK Web

A TypeScript/JavaScript SDK for communicating with [Tap Strap](https://www.tapwithus.com/) devices in the browser using Web Bluetooth.
#### Try the [demo app](https://tapwithus.github.io/tap-web-sdk)

## Browser Support

This SDK uses the [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API) which is supported in:
- **Chrome** (Desktop & Android)
- **Edge**
- **Opera**

> **Note:** Safari and Firefox do not support Web Bluetooth. The page must be served over HTTPS or localhost.

## Installation

### For Development

Clone the repository and build the SDK:

```bash
git clone https://github.com/TapWithUs/tap-web-sdk.git
cd tap-web-sdk
npm install
npm run build
```

### Using in Your Project

Link the SDK locally for development:

```bash
# In the tap-web-sdk directory
npm link

# In your project directory
npm link tap-sdk-web
```

Or install directly from the local path:

```bash
npm install /path/to/tap-web-sdk
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

tap.registerMouseEvents((identifier, vx, vy, proximity, roll, pitch, yaw) => {
    console.log(`Mouse: vx=${vx}, vy=${vy}, proximity=${proximity}`);
    console.log(`Orientation: roll=${roll}°, pitch=${pitch}°, yaw=${yaw}°`);
});

tap.registerAirGestureEvents((identifier, gesture) => {
    console.log(`Air gesture: ${gesture}`);
});

tap.registerSwipeEvents((identifier, direction) => {
    console.log(`Swipe direction: ${direction}`);
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
| `registerMouseEvents(cb)` | `(identifier: string, vx: number, vy: number, proximity: boolean, roll: number, pitch: number, yaw: number) => void` |
| `registerAirGestureEvents(cb)` | `(identifier: string, gesture: number) => void` |
| `registerSwipeEvents(cb)` | `(identifier: string, direction: number) => void` |
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

### Swipe Gestures

Swipe gestures are directional swipes detected from the air gesture characteristic:

```typescript
import { SwipeDirections } from 'tap-sdk-web';

tap.registerSwipeEvents((identifier, direction) => {
    switch (direction) {
        case SwipeDirections.UP:
            console.log('Swiped up');
            break;
        case SwipeDirections.DOWN:
            console.log('Swiped down');
            break;
        case SwipeDirections.LEFT:
            console.log('Swiped left');
            break;
        case SwipeDirections.RIGHT:
            console.log('Swiped right');
            break;
    }
});
```

**Note:** 
- Swipe events are automatically debounced (300ms) to prevent duplicate detections
- Swipe events take priority over air gesture events when both are present in the data
- Based on the iOS SDK implementation

### Haptic Feedback

```typescript
// Array of durations in milliseconds (10-2550ms, 10ms resolution)
// Maximum 18 values
await tap.sendVibrationSequence([100, 200, 100, 200, 500]);
```

## Testing the Example Locally

The SDK includes a complete working example in the [examples/basic](./examples/basic/) directory.

### Prerequisites

- A Chromium-based browser (Chrome, Edge, or Opera)
- A Tap Strap device
- HTTPS or localhost (required for Web Bluetooth)

### Steps to Run

1. **Build the SDK**:

```bash
npm run build
```

This compiles the TypeScript source and creates the bundle at `dist/tap-sdk-web.bundle.js`.

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

- If using `serve`: Open [http://localhost:3000/examples/basic/](http://localhost:3000/examples/basic/)
- If using Python or http-server: Open [http://localhost:8000/examples/basic/](http://localhost:8000/examples/basic/)

4. **Test the SDK**:

- Click "Connect to Tap" to open the browser's Bluetooth device picker
- Select your Tap device
- Try different input modes (Controller Mode recommended for testing)
- Tap your fingers to see events in the log
- Test haptic feedback with the "Send Vibration" button

### Troubleshooting

- **"Bluetooth not available"**: Make sure you're using Chrome, Edge, or Opera (not Safari/Firefox)
- **"Connection failed"**: Ensure your Tap device is powered on and not connected to another device
- **"HTTPS required"**: The example works on `localhost`, but if deploying, you need HTTPS
- **No events appearing**: Try switching to Controller Mode - Text Mode may not generate tap events in the browser

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
