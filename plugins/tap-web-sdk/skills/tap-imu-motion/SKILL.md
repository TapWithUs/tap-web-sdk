---
name: tap-imu-motion
description: Use Tap hand motion - v2 IMU motion data (dx, dy, roll, pitch, yaw) and v1 mouse events - to move a cursor, steer, tilt, or rotate things. Use for air mouse, pointer, cursor control, tilt, orientation, euler angles, roll/pitch/yaw, or motion-driven UI.
---

# IMU motion and mouse

The two protocols give motion in different ways. `connect()` already started notifications. There is no `start()`. Register callbacks, then enable the feature or the input mode.

## v2 (`TapSDKWeb2`): IMU motion feature

```typescript
import { DeviceFeatures } from '@tapwithus/tapsdk';
import type { ImuMotionData } from '@tapwithus/tapsdk';

function onMotion(_identifier: string, motion: ImuMotionData): void {
    const [dx, dy, isMouse, [roll, pitch, yaw]] = motion;
}

sdk.registerImuMotionDataEvents(onMotion);
await sdk.setFeature(DeviceFeatures.IMU_MOTION_DATA, true);
```

- `dx`, `dy`: signed int pointer deltas since the last packet. Add them to a cursor position.
- `isMouse`: `true` when the device considers the motion a pointer movement.
- `roll`, `pitch`, `yaw`: signed ints, orientation in degrees.
- Turn off with `setFeature(DeviceFeatures.IMU_MOTION_DATA, false)` to save battery and bandwidth.
- Motion works together with `MODEL_DETECTION` (air gestures). The `tap-knob` and `tap-dpad` skills combine them.

## v1 (`TapSDKWeb`): mouse events

```typescript
import { InputModeController, InputType } from '@tapwithus/tapsdk';

function onMouse(_identifier: string, vx: number, vy: number, proximity: boolean): void {
}

sdk.registerMouseEvents(onMouse);
await sdk.setInputMode(new InputModeController());
```

- `vx`, `vy`: signed velocities. `proximity`: `true` when a surface is detected (optical mouse on Tap Strap).
- This callback does not include roll, pitch, or yaw. For orientation on v1, use raw IMU (`tap-raw-sensors`).
- TapXR Spatial Control: `await sdk.setInputType(InputType.MOUSE)` forces air-mouse. `InputType.AUTO` returns to automatic.

## Patterns

**Cursor on a canvas** (clamp to bounds, optional gain):

```typescript
const GAIN = 1;
let x = 400;
let y = 300;

function onMotion(_identifier: string, motion: ImuMotionData): void {
    const [dx, dy] = motion;
    x = Math.min(Math.max(x + dx * GAIN, 0), WIDTH);
    y = Math.min(Math.max(y + dy * GAIN, 0), HEIGHT);
}
```

On v1, use `vx` and `vy` from `registerMouseEvents` the same way.

**Relative rotation (roll as a dial)**: store a reference roll when the user starts (for example on a pinch-hold), then use `roll - reference`. Do not use absolute roll. It depends on how the hand is held. See `tap-knob`.

**Smoothing**: an exponential moving average removes jitter:

```typescript
const alpha = 0.3;
smooth = alpha * value + (1 - alpha) * smooth;
```

**Dead zone**: ignore `Math.abs(dx) + Math.abs(dy) < 2` to stop drift when the hand is still.

**Rate**: count packets per second if timing matters. Do not assume a fixed rate.

## Axes

- Tap Strap: https://raw.githubusercontent.com/TapWithUs/tap-python-sdk/master/docs/assets/TAP-axis-alpha.png
- TapXR: https://raw.githubusercontent.com/TapWithUs/tap-python-sdk/master/docs/assets/TAPXR-axis.png

If a direction is inverted on the user's device, flip the sign. Ask the user to test and tell you.

## Docs

- Demo: https://tapwithus.github.io/tap-web-sdk/
- Motion type: `ImuMotionData` in `src/types.ts`
