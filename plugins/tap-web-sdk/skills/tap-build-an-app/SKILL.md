---
name: tap-build-an-app
description: Build a complete browser app or interactive experience controlled by a Tap - games, pages, presentations, or creative tools. Use when the user asks to build, make, or create something with their Tap, especially if they are not a developer.
---

# Build an app with a Tap

The user may not be a developer. Keep the project small, explain how to run it in plain words, and test with the real device.

## Workflow

1. **Ask** (only what is missing): device (Tap Strap / Tap Strap 2 / TapXR / TapBand) and what the app should do.
2. **Connect first.** Use the `tap-getting-started` quickstart and confirm taps arrive before you build anything else.
3. **Pick the input** (load the matching skill):
   - finger taps and combos: `tap-tapping`
   - swipes, pinches, fist: `tap-vision-models` (v2)
   - pointer, tilt, rotation: `tap-imu-motion`
   - twist-to-adjust value: `tap-knob` (v2)
   - directions + select + drag/rotate: `tap-dpad` (v2)
   - data recording: `tap-raw-sensors`
4. **Put the output on the same page.**
5. **Build one interaction, test it with the user, then add the next.**
6. **Give feedback**: haptics (`sendVibrationSequence`) and on-screen state, so the user knows the gesture was seen.
7. **Deliver**: one folder, a `package.json` that depends on `@tapwithus/tapsdk`, one HTML page, and one run command (`npx serve` or `npx vite`, on localhost).

## Core pattern

Call `connect()` from a button click. It starts notifications. There is no `start()`. Register callbacks next, then enable input. Keep callback work short. Update state, then draw.

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
        sdk.registerTapEvents((_id, tapcode) => handle('tap', tapcode[0]));
        sdk.registerAirGestureEvents((_id, gesture) => handle('air', gesture[0]));
        await sdk.setFeature(DeviceFeatures.MODEL_DETECTION, true);
        await sdk.setVisionSensorModel(ModelTypes.TAPPING);
        await sdk.setVisionSensorOpMode(VisionSensorOpModes.TRIGGER);
    } else {
        sdk.registerTapEvents((_id, tapcode) => handle('tap', tapcode));
        sdk.registerAirGestureEvents((_id, gesture) => handle('air', gesture));
        await sdk.setInputMode(new InputModeController());
    }
});
```

If a callback must not draw, push the event onto an array and read that array from `requestAnimationFrame`.

## Output on the page

| Output | How |
|--------|-----|
| Status and text | Update the DOM. Show "Click Connect", "Connected", or "Disconnected". |
| Game or visual | Canvas or HTML elements in this page. |
| Sound | Web Audio in this page. |
| Keyboard fallback | `keydown` on this page (arrow keys, space) calls the same functions as taps. |

The browser cannot press keys in other applications and cannot change the OS volume. Keep the interaction inside the page.

## Rules

- Do not add dependencies to the SDK. Add them to the app's `package.json`.
- Import `@tapwithus/tapsdk`. Do not copy SDK source into the app.
- Add a keyboard fallback so the user can test the page without the Tap.
- Show connection status on screen.
- Use Chrome, Edge, or Opera. Serve the page on localhost or HTTPS.
- Call `connect()` from a button click.
- If the device does not connect, use the troubleshooting table in `tap-getting-started`.
