# AGENTS.md - TapSDK Web

Coding-agent guide for **tap-sdk-web** (repo: [TapWithUs/tap-web-sdk](https://github.com/TapWithUs/tap-web-sdk)).

- **App builders** (integrate Tap in a web app): start with [For app builders](#for-app-builders).
- **SDK maintainers** (change this package): see [For SDK maintainers](#for-sdk-maintainers).

Official portal: [Web SDK](https://dev.tapwithus.com/docs/web/) · [Getting started](https://dev.tapwithus.com/docs/getting-started/) · [How Tap works](https://dev.tapwithus.com/docs/how-tap-works/)

---

## For app builders

### What this package is

Browser TypeScript/JavaScript SDK for Tap devices over **Web Bluetooth**. Same Controller-mode model as the native/Python SDKs.

| Item | Value |
|------|--------|
| Package name | `tap-sdk-web` |
| Repository | `TapWithUs/tap-web-sdk` |
| npm | **Not published** — clone + `npm install` + `npm run build`, then `npm link` or path install |
| Hardware (documented) | **Tap Strap** and **TapXR** only |
| Tap Band | Waitlist only — https://www.tapwithus.com/tapband-waitlist/ — **not** an SDK first-run target |
| XR gestures | Gesture subset of Band; **do not invent** missing-gesture lists — use enums in this package |

### Install (clone path — no npm)

```bash
git clone https://github.com/TapWithUs/tap-web-sdk.git
cd tap-web-sdk
npm install
npm run build

# In the tap-web-sdk directory
npm link

# In your app
npm link tap-sdk-web
```

Or: `npm install /path/to/tap-web-sdk`.

Do **not** tell users to `npm install tap-sdk-web` from the registry until it is published.

### Browsers and page origin

- **Supported:** Chrome, Edge, Opera (Desktop; Chrome also Android).
- **Unsupported:** Safari, Firefox.
- **Required:** HTTPS or `localhost`.
- **Connect:** must run inside a **user gesture** (`requestDevice` via `connect()`), e.g. button click — not on page load.

### First win (get a tap callback)

1. Serve the page over HTTPS or localhost in Chrome/Edge/Opera.
2. Call `connect()` from a button click (opens the Bluetooth picker).
3. On **v1** (`TapSDKWeb`), call `await sdk.setInputMode(new InputModeController())` after connect.
4. Register `registerTapEvents` and tap a finger combination.

**Critical:** devices boot in **Text** (HID keyboard). Text mode is **silent to the SDK** — zero tap callbacks. **Controller** (`InputModeController`) unlocks app tap events on v1. Use Controller+Text only if you need both; switch back to Text when the user needs a normal keyboard.

```typescript
import {
    connect,
    isTapSDKWeb2,
    InputModeController,
} from 'tap-sdk-web';

const sdk = await connect(); // user gesture required

if (isTapSDKWeb2(sdk)) {
    // v2 tapcode shape may be a list — follow existing types, do not invent
    sdk.registerTapEvents((id, data) => console.log('Tap', data[0]));
} else {
    sdk.registerTapEvents((id, tapcode) => console.log('Tap', tapcode));
    await sdk.setInputMode(new InputModeController());
}
```

### Zero-events checklist

If the app connects but prints no taps:

1. **v1 still in Text mode** — missing `setInputMode(new InputModeController())` (most common).
2. Wrong browser (Safari/Firefox) or not HTTPS/localhost.
3. `connect()` not triggered by a user gesture.
4. Device connected elsewhere or powered off.
5. Invented API / wrong import — only use exports from `tap-sdk-web` (`src/index.ts`).

### Do not invent

- Do not invent APIs, BLE UUIDs, gesture lists, or Band-as-supported SDK flows.
- Do not invent v2 tapcode shapes — follow `TapSDKWeb2` / existing docs (list vs int may differ from v1).
- Prefer portal + this repo’s README over guesswork.

### Coding-agent skills

App-builder skills live at:

- `.cursor/skills/tap-sdk-web/SKILL.md`
- `.claude/skills/tap-sdk-web/SKILL.md`

---

## For SDK maintainers

This section is for changing **tap-web-sdk** itself. Keep feature parity with the Python SDK.

### Project overview

Web Bluetooth implementation of TapSDK for browsers. Same functionality as [tap-python-sdk](https://github.com/TapWithUs/tap-python-sdk), adapted for promise-based Web Bluetooth.

**Important:** Maintain feature parity with the Python SDK when implementing features or fixing bugs.

### Reference implementation

- **Primary:** [tap-python-sdk](https://github.com/TapWithUs/tap-python-sdk)
- **Key files:**
  - `tapsdk/tap.py` — main SDK
  - `tapsdk/models.py` — models and enumerations
  - `tapsdk/parsers.py` — BLE parsing
  - `examples/` — usage examples

### Development setup

```bash
npm install
npm run build
npm test
npm run test:watch
npm run bundle
```

### Testing

```bash
npm test
npm test src/parsers.test.ts
npm run test:watch
```

### Code style and conventions

#### TypeScript

- Strict mode
- Prefer `const` over `let`; avoid `var`
- Explicit types for public APIs; inference for internals
- Prefer interfaces for object shapes
- Enums for fixed value sets (`enumerations.ts`)

#### Naming

- Classes: `PascalCase` (`TapSDKWeb`, `InputModeController`)
- Methods: `camelCase` (`setInputMode`, `registerTapEvents`)
- Constants: `UPPER_SNAKE_CASE` (`TAP_SERVICE`, `INPUT_MODE_REFRESH_TIMEOUT`)
- Private: prefix `_` or `private`

#### Layout

- Main SDK: `src/TapSDKWeb.ts` / `src/TapSDKWeb2.ts`
- Input modes: `src/inputmodes.ts`
- Parsers: `src/parsers.ts`
- Enumerations: `src/enumerations.ts`
- Types: `src/types.ts`
- Connect/detect: `src/connect.ts`, `src/detect.ts`
- Public API: `src/index.ts` (exports only)

### Feature parity with Python SDK

#### Core features (must match)

1. **Input modes:** Text, Controller, ControllerText, Raw
2. **Events:** Tap, Mouse, AirGesture, AirGestureState, RawData
3. **Commands:** setInputMode, setInputType, sendVibrationSequence
4. **Parsing:** tap codes, mouse, air gestures, raw sensors
5. **Raw sensitivities:** finger accel, IMU gyro, IMU accel

#### Platform differences (Web vs Python)

- Connection: `navigator.bluetooth.requestDevice()` (user gesture), not BLE scanning
- Async/await promises vs Python callbacks
- Typically one device per page
- HTTPS or localhost; Chrome/Edge/Opera only

#### Bluetooth characteristics (must match Python)

```typescript
const TAP_SERVICE = 'c3ff0001-1d8b-40fd-a56f-c7bd5d0f3370';
const NUS_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const TAP_DATA_CHARACTERISTIC = 'c3ff0005-1d8b-40fd-a56f-c7bd5d0f3370';
const MOUSE_DATA_CHARACTERISTIC = 'c3ff0006-1d8b-40fd-a56f-c7bd5d0f3370';
const UI_CMD_CHARACTERISTIC = 'c3ff0009-1d8b-40fd-a56f-c7bd5d0f3370';
const AIR_GESTURE_DATA_CHARACTERISTIC = 'c3ff000a-1d8b-40fd-a56f-c7bd5d0f3370';
const TAP_MODE_CHARACTERISTIC = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const RAW_SENSORS_CHARACTERISTIC = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
```

### Common maintainer tasks

#### New feature

1. Check Python SDK first
2. Port from `tapsdk/tap.py` to Web Bluetooth promises
3. Add TypeScript types
4. Tests in `*.test.ts`
5. Update README examples
6. Export from `src/index.ts` if public

#### Bug fix

1. Check Python SDK
2. Port fix if already fixed there; otherwise consider reporting upstream
3. Add regression test

#### Parsers

- Match `tapsdk/parsers.py` exactly
- Unit-test edge cases

#### Tests

- Vitest; mock Web Bluetooth
- Cover success and error paths

### Maintainer notes

- **Raw sensors:** Developer mode in TapManager; NUS required; sensitivities match Python scale
- **Air gestures:** TapXR; firmware-dependent; extended state needs Spatial Control firmware
- **Input mode refresh:** every ~10s so the device does not fall back to Text (matches Python)

### Don'ts (maintainers)

- Do not change BLE UUIDs without checking Python
- Do not add features absent from Python without discussion
- Do not break backward compatibility
- Do not use `any` — prefer `unknown` or proper types
- Do not commit without running tests
- Do not change parser logic without understanding the Python version
- Do not publish to npm as part of casual doc/agent work (out of scope unless explicitly requested)

### Do's (maintainers)

- Reference Python SDK for features
- Keep API compatibility where practical
- Type all public APIs
- Write tests for new behavior
- Update README when adding features
- Handle Web Bluetooth permission errors gracefully

### Resources

- [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)
- [tap-python-sdk](https://github.com/TapWithUs/tap-python-sdk)
- [Tap Developer Portal](https://dev.tapwithus.com/docs/web/)
- [Web Bluetooth samples](https://googlechrome.github.io/samples/web-bluetooth/)

When in doubt: check Python SDK, existing tests, then a real Tap Strap/TapXR.
