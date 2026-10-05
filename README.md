# TapSDK Web

A TypeScript/JavaScript SDK for communicating with Tap devices in the browser using Web Bluetooth. It supports [Tap Strap](https://www.tapwithus.com/) and [TapXR](https://www.tapwithus.com/) today. [TapBand](https://www.tapwithus.com/tapband-waitlist/) is upcoming (waitlist) and is not fully supported in this SDK yet.
#### Try the [demo app](https://tapwithus.github.io/tap-web-sdk)

## Browser Support

This SDK uses the [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API) which is supported in:
- **Chrome** (Desktop & Android)
- **Edge**
- **Opera**

> **Note:** Safari and Firefox do not support Web Bluetooth. The page must be served over HTTPS or localhost.

## Installation

```bash
npm install @tapwithus/tapsdk
```

The [GitHub Pages demo](https://tapwithus.github.io/tap-web-sdk) is unchanged. It loads the built bundle from this repository. It does not install the npm package.

### Local development

Clone the repository and build the SDK:

```bash
git clone https://github.com/TapWithUs/tap-web-sdk.git
cd tap-web-sdk
npm install
npm run build
```

To link a local build into another project:

```bash
# In the tap-web-sdk directory
npm link

# In your project directory
npm link @tapwithus/tapsdk
```

## Quick Start

```typescript
import {
    connect,
    isTapSDKWeb2,
    InputModeController,
} from '@tapwithus/tapsdk';

// Auto-detects v1 / v2 and returns TapSDKWeb or TapSDKWeb2
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

## AI-assisted development

You do not need to be a developer to build with a Tap. Install the Tap skills into your coding agent, then describe the app you want in plain words. The agent knows how to connect, which events each device sends, and how to build common interactions.

The installer writes into the **current folder**. Add `-g` to install for your user instead, so the skills are available in every project.

| Tool | This folder (default) | Every project (`-g`) |
|------|------------------------|----------------------|
| Claude Code | `.claude/skills/` | `claude plugin install … --scope user` |
| Codex | `.agents/skills/` | `codex plugin add …` |
| Cursor | `.cursor/skills/` + [`.cursor/rules/tap-sdk.mdc`](.cursor/rules/tap-sdk.mdc) | `~/.cursor/skills/` + `~/.cursor/rules/tap-sdk.mdc` |
| Any agent that reads `AGENTS.md` | [`AGENTS.md`](AGENTS.md) | `~/.codex/AGENTS.md` |

Run the commands below in your project folder.

### This folder

```console
./install-skills.sh claude    # .claude/skills/
./install-skills.sh codex     # .agents/skills/
./install-skills.sh cursor    # .cursor/skills/ and .cursor/rules/
./install-skills.sh agents    # ./AGENTS.md
./install-skills.sh all       # all four, this folder
./install-skills.sh -g all    # all four, every project
```

Or, without a clone:

```console
curl -sL https://raw.githubusercontent.com/TapWithUs/tap-web-sdk/master/install-skills.sh | bash -s cursor
curl -sL https://raw.githubusercontent.com/TapWithUs/tap-web-sdk/master/install-skills.sh | bash
curl -sL https://raw.githubusercontent.com/TapWithUs/tap-web-sdk/master/install-skills.sh | bash -s -- -g all
```

### Every project

```console
./install-skills.sh -g claude
./install-skills.sh -g codex
./install-skills.sh -g cursor
./install-skills.sh -g agents
./install-skills.sh -g all
```

`-g claude` and `-g codex` need the `claude` and `codex` commands. You can also open `/plugins` in Codex and install **Tap Web SDK** from the marketplace list.

The `agents` target does not replace `AGENTS.md` in this repository. That file also contains notes for SDK contributors.

### What's included

- **tap-getting-started**: install, connect to any Tap (v1 or v2), quickstart page, troubleshooting
- **tap-tapping**: which fingers tapped, finger combos, double taps, in-page actions, haptics
- **tap-vision-models**: switch between the tapping and air-gesture models; swipes, pinches, holds, fist (v2)
- **tap-imu-motion**: pointer movement, tilt, roll / pitch / yaw (v2) and mouse events (v1)
- **tap-raw-sensors**: raw accelerometer and gyro streams, sensitivity, CSV logging
- **tap-knob**: hold a pinch and twist to turn a value up or down (v2)
- **tap-dpad**: swipe for directions, pinch to select, hold to rotate or drag (v2)
- **tap-build-an-app**: turn Tap events into one browser page

### Onboard your agent

1. Make an empty folder for your project and open your coding agent in it.
2. Install the skills (see above).
3. Turn on your Tap and close Tap Manager. Use Chrome, Edge, or Opera. Open the page on localhost or HTTPS.
4. Tell the agent which device you have (Tap Strap, Tap Strap 2, or TapXR). TapBand is upcoming (waitlist) and is not fully supported in this SDK yet.
5. Ask it to connect first: *"Use the tap-getting-started skill. Add a Connect button, connect to my Tap, and show my taps."* Tap your fingers and tell the agent what you see.
6. When taps arrive, describe your app. Build one interaction at a time and try each one with the device.
7. If something does not work, tell the agent exactly what happened (for example "nothing prints when I tap" or "letters appear in the page"). It can use the troubleshooting table in `tap-getting-started`.

### Sample prompts

- "Connect to my Tap and show which fingers I tap."
- "Make a presentation clicker: index finger = next slide, middle finger = previous slide, buzz on each tap."
- "Map my tap combos to buttons on this page."
- "Make a knob: hold a pinch and twist my wrist to change a value on the page."
- "Build a D-Pad game: swipe to move, pinch to pick a shape, hold and twist to rotate it."
- "Show a cursor on this page that follows my hand motion, and click with a pinch."
- "Switch between the tapping model and the air-gesture model when I make a fist."
- "Record 30 seconds of raw IMU data and download a CSV file."
- "Build a drum machine: each finger plays a different drum sound."

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

// Text mode - taps generate keyboard characters
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

Air-gesture support depends on the device and firmware. TapXR does not expose the full gesture set. TapBand is planned to support a broader set when it ships. Treat the enums below as the protocol surface, not as a guarantee that every code arrives on every device.

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

## Testing the Example Locally

The SDK includes a unified demo in [examples/index.html](./examples/index.html).

### Prerequisites

- A Chromium-based browser (Chrome, Edge, or Opera)
- A Tap Strap or TapXR device (TapBand is upcoming)
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

## Releasing

This package uses npm Trusted Publishing (OIDC). A `v*` tag push publishes `@tapwithus/tapsdk` to the public registry. The workflow does not use `NPM_TOKEN`.

One-time setup: on [the package settings](https://www.npmjs.com/package/@tapwithus/tapsdk) the GitHub Actions trusted publisher for `TapWithUs/tap-web-sdk`, workflow filename `npm-publish.yml`, no environment, must have **Allow npm publish** checked. Leave **Allow npm dist-tag** unchecked. Edit the current publisher if it is still stage-only.

1. Bump the version and push a tag:

```bash
npm version patch   # or minor / major
git push origin master --follow-tags
```

`npm version` updates `package.json` and creates a tag such as `v0.9.1`. The **Publish to npm** workflow then runs `npm publish`. The version goes live when the job succeeds.

## License

MIT
