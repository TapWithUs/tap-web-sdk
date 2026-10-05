# Tap Web SDK

Connect order, every time: call `connect()` from a button click, then register callbacks, then enable input, then keep the page open. `connect()` starts notifications. There is no `start()`. `connect()` alone delivers no taps until you enable input.

> Demo: https://tapwithus.github.io/tap-web-sdk/
> Skills: https://github.com/TapWithUs/tap-web-sdk/tree/master/plugins/tap-web-sdk/skills
> Package: `npm install @tapwithus/tapsdk` (Chrome, Edge, or Opera; the page must use HTTPS or localhost)

BLE SDK for Tap Strap, Tap Strap 2, TapXR, and TapBand in the browser. It receives taps, air gestures, mouse / IMU motion, and raw sensor data, and sends haptics and mode commands.

## Two protocols, one entry point

`await connect()` opens the browser device picker, detects the firmware protocol, and returns:

- `TapSDKWeb` (**v1**, classic firmware): input modes (`InputModeText`, `InputModeController`, `InputModeControllerText`, `InputModeRaw`)
- `TapSDKWeb2` (**v2**, framed firmware): `DeviceFeatures` switches, vision models (`ModelTypes.TAPPING` / `AIR_GESTURE`), IMU motion with roll / pitch / yaw

Check with `isTapSDKWeb2(sdk)`. Write code that handles both unless the user names the device.

## Required order

```typescript
import {
    connect,
    isTapSDKWeb2,
    DeviceFeatures,
    InputModeController,
    ModelTypes,
    VisionSensorOpModes,
} from '@tapwithus/tapsdk';

document.querySelector('#connect')!.addEventListener('click', async () => {
    const sdk = await connect();
    if (isTapSDKWeb2(sdk)) {
        sdk.registerTapEvents((_id, tapcode) => console.log(tapcode[0]));
        await sdk.setFeature(DeviceFeatures.MODEL_DETECTION, true);
        await sdk.setVisionSensorModel(ModelTypes.TAPPING);
        await sdk.setVisionSensorOpMode(VisionSensorOpModes.TRIGGER);
    } else {
        sdk.registerTapEvents((_id, tapcode) => console.log(tapcode));
        await sdk.setInputMode(new InputModeController());
    }
});
```

## Callback signatures

| Register | v1 `TapSDKWeb` | v2 `TapSDKWeb2` |
|----------|----------------|-----------------|
| `registerTapEvents` | `(id, tapcode: number)` | `(id, [tapcode])` |
| `registerAirGestureEvents` | `(id, gesture: number)` -> `AirGestures` | `(id, [code])` -> `UnifiedAirGestures` |
| `registerMouseEvents` | `(id, vx, vy, proximity)` | n/a |
| `registerImuMotionDataEvents` | n/a | `(id, [dx, dy, isMouse, [roll, pitch, yaw]])` |
| `registerRawDataEvents` | `(id, [{type, ts, payload}])` | same (alias of `registerRawImuDataEvents`) |
| `registerAirGestureStateEvents` | `(id, MouseModes)` | n/a |
| `registerStandbyStateEvents` | n/a | `(id, isStandby: boolean)` |
| `registerConnectionEvents` | `(sdk)` | `(serial: string)` |
| `registerDisconnectionEvents` | `(identifier)` | `(identifier)` |

Tapcode bits: thumb = 1, index = 2, middle = 4, ring = 8, pinky = 16.

## Gotchas

- Call `connect()` from a click handler. The browser blocks the device picker without a user gesture.
- Use Chrome, Edge, or Opera. Safari and Firefox do not support Web Bluetooth. The page must use HTTPS or localhost.
- v1 boots in **Text mode**: the Tap types into the focused field and the SDK gets **no** taps. Call `setInputMode(new InputModeController())` after you register callbacks.
- v2 sends nothing until features are on: `MODEL_DETECTION` + a vision model for taps / gestures, `IMU_MOTION_DATA` for motion, `RAW_IMU_DATA` for raw.
- v2 runs one vision model at a time: `TAPPING` (with `TRIGGER`) or `AIR_GESTURE` (with `STREAM`).
- `connect()` already starts notifications. Register callbacks immediately after it returns, before you enable input.
- Callbacks run on the Bluetooth notification path. Keep them short. Do not block. Start async work with `void sdk.sendVibrationSequence(...)`.
- Haptics: `await sdk.sendVibrationSequence([onMs, offMs, ...])`, 10-2550 ms per value, max 18 values.
- Do not invent APIs, UUIDs, or enum values. Check `src/enumerations.ts` and the README.
- Update firmware with the Tap Manager app. Close Tap Manager before you connect. v1 raw sensors need Developer mode in Tap Manager.
- Test with the real device and ask the user what they see. There is no simulator.

## Skills

| Skill | Use for |
|-------|---------|
| `tap-getting-started` | install, connect, quickstart page, troubleshooting |
| `tap-tapping` | tapcodes, finger combos, double taps, shortcuts, haptics |
| `tap-vision-models` | v2 model switching, `UnifiedAirGestures` (swipe, pinch, hold, fist) |
| `tap-imu-motion` | pointer, tilt, roll / pitch / yaw, v1 mouse |
| `tap-raw-sensors` | raw accelerometer / gyro, sensitivity, CSV logging |
| `tap-knob` | v2 pinch-hold + twist to change a value |
| `tap-dpad` | v2 swipes, pinch select, hold to rotate or drag |
| `tap-build-an-app` | complete apps: one page, on-screen output, Web Audio |

Skill files live in `plugins/tap-web-sdk/skills/<name>/SKILL.md` in the SDK repository.

## Contributing to this repository

# AGENTS.md - TapSDK Web

## Project Overview

This is the **Web Bluetooth implementation** of the TapSDK for browsers (TypeScript/JavaScript). It provides the same functionality as the [tap-python-sdk](https://github.com/TapWithUs/tap-python-sdk) but adapted for browser environments using the Web Bluetooth API.

**Important**: This SDK should maintain feature parity with the Python SDK. Always reference the Python SDK when implementing new features or fixing bugs.

## Reference Implementation

- **Primary Reference**: [tap-python-sdk](https://github.com/TapWithUs/tap-python-sdk)
- **Key Files to Reference**:
  - `tapsdk/tap.py` - Main SDK implementation
  - `tapsdk/models.py` - Data models and enumerations
  - `tapsdk/parsers.py` - BLE data parsing logic
  - `examples/` - Usage examples

## Development Setup

```bash
# Install dependencies
npm install

# Build the SDK
npm run build

# Run tests
npm test

# Watch mode for tests
npm run test:watch

# Bundle for distribution
npm run bundle
```

## Testing

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm test src/parsers.test.ts
```

### Watch Mode
```bash
npm run test:watch
```

## Code Style & Conventions

### TypeScript Guidelines
- Use TypeScript strict mode
- Prefer `const` over `let`, avoid `var`
- Use explicit types for public APIs
- Use type inference for internal variables
- Prefer interfaces over type aliases for object shapes
- Use enums for fixed sets of values (see `enumerations.ts`)

### Naming Conventions
- Classes: `PascalCase` (e.g., `TapSDKWeb`, `InputModeController`)
- Functions/Methods: `camelCase` (e.g., `setInputMode`, `registerTapEvents`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `TAP_SERVICE`, `INPUT_MODE_REFRESH_TIMEOUT`)
- Private members: prefix with `_` or use `private` keyword

### Code Organization
- **Main SDK**: `src/TapSDKWeb.ts`
- **Input Modes**: `src/inputmodes.ts`
- **Data Parsers**: `src/parsers.ts`
- **Enumerations**: `src/enumerations.ts`
- **Type Definitions**: `src/types.ts`
- **Public API**: `src/index.ts` (exports only)

## Feature Parity with Python SDK

When implementing features, always check the Python SDK first:

### Core Features (Must Match)
1. **Input Modes**: Text, Controller, ControllerText, Raw
2. **Events**: Tap, Mouse, AirGesture, AirGestureState, RawData
3. **Commands**: setInputMode, setInputType, sendVibrationSequence
4. **Data Parsing**: Tap codes, mouse data, air gestures, raw sensor data
5. **Raw Mode Sensitivities**: Finger accelerometer, IMU gyro, IMU accelerometer

### Platform Differences (Web vs Python)
- **Connection**: Web uses `navigator.bluetooth.requestDevice()` instead of BLE scanning
- **Async/Await**: Web Bluetooth is promise-based, Python uses callbacks
- **No Multi-Device**: Web typically connects to one device at a time
- **Browser Limitations**: Must be HTTPS or localhost, limited browser support

### Bluetooth Characteristics (Must Match Python SDK)
```typescript
// These UUIDs must match tap.py exactly
const TAP_SERVICE = 'c3ff0001-1d8b-40fd-a56f-c7bd5d0f3370';
const NUS_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const TAP_DATA_CHARACTERISTIC = 'c3ff0005-1d8b-40fd-a56f-c7bd5d0f3370';
const MOUSE_DATA_CHARACTERISTIC = 'c3ff0006-1d8b-40fd-a56f-c7bd5d0f3370';
const UI_CMD_CHARACTERISTIC = 'c3ff0009-1d8b-40fd-a56f-c7bd5d0f3370';
const AIR_GESTURE_DATA_CHARACTERISTIC = 'c3ff000a-1d8b-40fd-a56f-c7bd5d0f3370';
const TAP_MODE_CHARACTERISTIC = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const RAW_SENSORS_CHARACTERISTIC = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
```

## Common Tasks

### Adding a New Feature
1. Check if it exists in the Python SDK
2. Review the Python implementation in `tapsdk/tap.py`
3. Adapt for Web Bluetooth API (promises instead of callbacks)
4. Add TypeScript types
5. Write tests in `*.test.ts`
6. Update README.md with usage examples
7. Update `src/index.ts` exports if needed

### Fixing a Bug
1. Check if the bug exists in Python SDK
2. If fixed in Python, port the fix
3. If new bug, consider reporting to Python SDK team
4. Add regression test

### Updating Parsers
- Parsers in `src/parsers.ts` must match `tapsdk/parsers.py` logic exactly
- Test with real device data when possible
- Add unit tests for edge cases

### Adding Tests
- Use Vitest framework
- Test files: `*.test.ts`
- Mock Web Bluetooth API using Vitest mocks
- Test both success and error cases

## Important Notes

### Web Bluetooth Limitations
- Only works in Chrome, Edge, Opera (not Safari/Firefox)
- Requires HTTPS or localhost
- User must grant permission via browser dialog
- Limited to one connection per page (typically)

### Raw Sensor Data
- Only available with "Developer mode" enabled in TapManager app
- Requires NUS service to be available
- Sensitivity values must match Python SDK scale factors

### Air Gestures
- TapXR only feature
- Requires specific firmware version
- Extended state events require Spatial Control firmware

### Input Mode Refresh
- SDK automatically refreshes input mode every 10 seconds
- Prevents device from reverting to text mode
- Matches Python SDK behavior

## Don'ts

- ❌ Don't change BLE UUIDs without checking Python SDK
- ❌ Don't add features not in Python SDK without discussion
- ❌ Don't break backward compatibility
- ❌ Don't use `any` type - prefer `unknown` or proper types
- ❌ Don't commit without running tests
- ❌ Don't change parser logic without understanding Python version

## Do's

- ✅ Always reference Python SDK when implementing features
- ✅ Maintain API compatibility with Python SDK where possible
- ✅ Add TypeScript types for all public APIs
- ✅ Write tests for new features
- ✅ Update README when adding features
- ✅ Use Web Bluetooth best practices
- ✅ Handle errors gracefully (browser may reject permissions)
- ✅ Test on real Tap devices when possible

## Resources

- [Web Bluetooth API Docs](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)
- [tap-python-sdk Repository](https://github.com/TapWithUs/tap-python-sdk)
- [Tap Developer Portal](https://www.tapwithus.com/developers)
- [Web Bluetooth Samples](https://googlechrome.github.io/samples/web-bluetooth/)

## Questions?

When in doubt:
1. Check the Python SDK implementation
2. Review existing tests
3. Test with a real Tap device
4. Ask the team
