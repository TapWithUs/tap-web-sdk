---
name: tap-getting-started
description: First skill for any Tap web app. Call connect() from a button click, then register callbacks, then enable input. connect() starts notifications. There is no start(). Use for install, connect to my Tap, setup, or no tap events.
---

# Tap getting started

Works for both firmware classes. `connect()` returns `TapSDKWeb` (classic firmware) or `TapSDKWeb2` (framed firmware). Write code that handles both unless the user says which device they have. Do not call these "SDK v1" or "SDK v2".

Devices: Tap Strap, Tap Strap 2, TapXR. TapBand uses the same BLE API and is coming soon ([waitlist](https://www.tapwithus.com/tapband-waitlist/)). It is not for sale yet. Never describe it as unsupported, missing, or buyable. TapXR developer firmware supports the full gesture set (taps, thumb swipes, pinches with hold, fist with hold). Do not invent a firmware version number.

## 1. Ask the user (once)

- Which device: Tap Strap, Tap Strap 2, or TapXR? (TapBand uses the same API; waitlist if they ask to buy one.)
- Is the Tap turned on and charged?
- Is Tap Manager (or another app) holding the connection? Close it.
- Is the firmware up to date (update it in the Tap Manager app)?
- Which browser: Chrome or Edge? The page must use HTTPS or localhost.

## 2. Install

```bash
npm install @tapwithus/tapsdk
```

In this repository, build the bundle first:

```bash
npm install
npm run build
```

Browser notes:

- Chrome or Edge. Safari and Firefox do not support Web Bluetooth.
- The page must use HTTPS or localhost.
- `connect()` calls `navigator.bluetooth.requestDevice()`. Call it from a button click. The browser blocks the device picker without a user gesture.

## 3. Connect and listen

Open [scripts/quickstart.html](scripts/quickstart.html) from this repository with a local static server after `npm run build`. In an app, use the same order with `import { ... } from '@tapwithus/tapsdk'`.

1. `const sdk = await connect()` from a click handler. This attaches, detects firmware, and starts notifications. There is no `start()`.
2. Register every callback immediately after `connect()` returns.
3. Enable input:
   - `TapSDKWeb`: `await sdk.setInputMode(new InputModeController())`. It boots in Text mode, which types into the focused field and sends **no** tap events to the SDK.
   - `TapSDKWeb2`: `setFeature(DeviceFeatures.MODEL_DETECTION, true)`, then pick a vision model (see the `tap-vision-models` skill).
4. Keep the page open. Do not navigate away.

## 4. Callback shapes differ between firmware classes

| Callback | `TapSDKWeb` | `TapSDKWeb2` |
|----------|-------------|--------------|
| `registerTapEvents` | `cb(identifier, tapcode: number)` | `cb(identifier, [tapcode])` |
| `registerAirGestureEvents` | `cb(identifier, gesture: number)` (`AirGestures`) | `cb(identifier, [code])` (`UnifiedAirGestures`) |
| `registerConnectionEvents` | `cb(sdk)` | `cb(serial: string)` |
| `registerDisconnectionEvents` | `cb(identifier)` | `cb(identifier)` |
| mouse / motion | `registerMouseEvents`: `cb(id, vx, vy, proximity)` | `registerImuMotionDataEvents`: `cb(id, [dx, dy, isMouse, [roll, pitch, yaw]])` |

Normalize with:

```typescript
function first(value: number | number[]): number {
    return Array.isArray(value) ? value[0] : value;
}
```

Check the class with `isTapSDKWeb2(sdk)`.

## 5. Callback rules

- Callbacks run on the Bluetooth notification path. Keep them short. Do not block in them.
- To run async work from a callback, use `void sdk.sendVibrationSequence([80])`, or put the event on a queue and handle it in `requestAnimationFrame` (see `tap-build-an-app`).
- `sendVibrationSequence([onMs, offMs, onMs, ...])` gives haptic feedback (10-2550 ms per value, up to 18 values).
- `await sdk.getDeviceInfo()` reads the name, firmware, and battery.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Device picker does not open | Call `connect()` from a button click. Use Chrome or Edge on HTTPS or localhost. |
| No device in the picker | Turn the Tap on. Close Tap Manager and other apps that hold the connection. Then retry. |
| User cancelled the picker | Catch the error and show it. Ask the user to click Connect again. |
| Connected but no tap events (`TapSDKWeb`) | Call `setInputMode(new InputModeController())` after you register callbacks. |
| Connected but no tap events (`TapSDKWeb2`) | Enable `MODEL_DETECTION` and set the `TAPPING` model with `TRIGGER` op mode. |
| Letters appear in a text field when tapping | Device is in Text mode (`TapSDKWeb`). Set Controller mode. |
| GATT service missing | Turn Bluetooth off and on. Close other apps that use the Tap. Click Connect again. |
| Events stop | Keep the page open. Do not reload it. |

## More

- Demo: https://tapwithus.github.io/tap-web-sdk/
- Next skills: `tap-tapping`, `tap-vision-models`, `tap-imu-motion`, `tap-raw-sensors`, `tap-knob`, `tap-dpad`, `tap-build-an-app`
