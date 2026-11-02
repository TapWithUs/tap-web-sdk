# TapSDK Web

A TypeScript/JavaScript SDK for Tap devices in the browser, using Web Bluetooth. It works with [Tap Strap](https://www.tapwithus.com/) and [TapXR](https://www.tapwithus.com/). [TapBand](https://www.tapwithus.com/tapband-waitlist/) uses the same BLE API and is coming soon (waitlist). It is not for sale yet.

TapXR developer firmware supports the full gesture set: taps, thumb swipes up / down / left / right, thumb-to-finger pinches with hold, and fist with hold. This SDK delivers those **raw** detections (the same codes as the Python, iOS, and Android SDKs). iOS and Android also add a processed click / drag / drop layer. This Web SDK does not.

#### Try the [demo app](https://tapwithus.github.io/tap-web-sdk)

## Browser Support

Call `connect()` from a **user click**. The browser blocks the Bluetooth device picker without a user gesture.

This SDK uses the [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API). Use **Chrome** or **Edge**. The page must use HTTPS or localhost.

> Safari and Firefox do not support Web Bluetooth.

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

`connect()` detects firmware and returns `TapSDKWeb` (classic) or `TapSDKWeb2` (framed). Handle both. Check with `isTapSDKWeb2(sdk)`.

```typescript
import {
    connect,
    isTapSDKWeb2,
    InputModeController,
    DeviceFeatures,
    ModelTypes,
    VisionSensorOpModes,
    UnifiedAirGestures,
} from '@tapwithus/tapsdk';

document.querySelector('#connect')!.addEventListener('click', async () => {
    const sdk = await connect();

    sdk.registerDisconnectionEvents((id) => console.log('Disconnected', id));

    if (isTapSDKWeb2(sdk)) {
        sdk.registerTapEvents((_id, tapcode) => console.log('Tap', tapcode[0]));
        sdk.registerAirGestureEvents((_id, data) => {
            const code = data[0];
            if (code === UnifiedAirGestures.COMBINED_GESTURE_UP) {
                console.log('swipe up');
            }
        });
        await sdk.setFeature(DeviceFeatures.MODEL_DETECTION, true);
        await sdk.setVisionSensorModel(ModelTypes.TAPPING);
        await sdk.setVisionSensorOpMode(VisionSensorOpModes.TRIGGER);
    } else {
        sdk.registerTapEvents((_id, tapcode) => console.log('Tap', tapcode));
        sdk.registerMouseEvents((_id, vx, vy, proximity) => {
            console.log(`Mouse: vx=${vx}, vy=${vy}, proximity=${proximity}`);
        });
        await sdk.setInputMode(new InputModeController());
    }

    await sdk.sendVibrationSequence([100, 200, 100]);
});
```

`connect()` starts notifications. There is no `start()`. Register callbacks, then enable input. Keep the page open.

### Reconnecting a Tap

After you disconnect, the Tap can stay connected to your computer, so it stops advertising and **does not appear in the `connect()` picker**. `connect()` therefore tries the Tap you last connected **in this page session** first, and opens the picker only when there is none or it does not answer within 3 s (`reuseTimeout`).

- **Same page: works, no flag.** Connect, Disconnect, Connect again reconnects without the picker.
- **After a page reload: not supported for a Tap that is still connected to the computer.** Chrome can list it through `getDevices()` (may need `chrome://flags/#enable-web-bluetooth-new-permissions-backend`), but connecting usually fails with "Bluetooth Device is no longer in range" because the Tap is not advertising. `connect()` does not try these devices automatically. Disconnect the Tap in system Bluetooth settings (or reset it) so it advertises, then pick it in the picker.

```typescript
import { connect, connectToDevice, getPermittedDevices } from '@tapwithus/tapsdk';

await connect();                                  // last Tap of this session, else the picker
await connect({ reuseKnownDevice: false });       // always the picker (add another Tap)
await connect({ device });                        // a specific BluetoothDevice, no picker

const devices = await getPermittedDevices();      // session Taps first, then getDevices()
await connectToDevice(devices[0]);                // same as connect({ device })
```

| Option | Default | Meaning |
|--------|---------|---------|
| `reuseKnownDevice` | `true` | Reconnect the Tap last connected in this session before opening the picker |
| `reuseTimeout` | `3000` | Ms to wait on that Tap before the picker opens |
| `device` | none | Connect to this `BluetoothDevice` and skip the picker |
| `connectTimeout` | `10000` | Ms to wait for the Bluetooth link (`connectToDevice`, `device`) |

With several Taps connected in one session, `connect()` reuses the most recent one and never guesses beyond that. To let the user choose, list `getPermittedDevices()` as buttons and call `connectToDevice(device)`. A slow reconnect uses up the click's permission, so keep "choose" a separate click. `connectToDevice` fails after 10 s by default (`connectTimeout`). The demo has Connect and Choose device… buttons.

- Tap your fingers and perform swipes, pinches, or a fist to see events in the log
- Test haptic feedback with the "Vibrate" button

### Troubleshooting

- **"Bluetooth not available"**: Use Chrome or Edge (not Safari or Firefox)
- **"Connection failed"**: Ensure your Tap device is powered on and not connected to another device. Close Tap Manager.
- **"HTTPS required"**: The example works on `localhost`, but if deploying, you need HTTPS
- **Device picker does not open**: Call `connect()` from a button click
- **Paired Tap missing from the picker after Disconnect**: In the same page, click Connect again: it reuses the last Tap (see "Reconnecting a Tap"). After a reload, disconnect the Tap in system Bluetooth settings or reset it, then pick it in the picker.
- **No events appearing (`TapSDKWeb`)**: Switch to Controller Mode. Text Mode may not generate tap events in the browser
- **No events appearing (`TapSDKWeb2`)**: Enable `MODEL_DETECTION` and set a vision model

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
