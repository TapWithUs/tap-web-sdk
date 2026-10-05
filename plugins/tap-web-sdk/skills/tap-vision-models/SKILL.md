---
name: tap-vision-models
description: Switch the Tap v2 vision model between TAPPING and AIR_GESTURE, set the op mode, and decode UnifiedAirGestures (swipes, pinches, holds, fist). Use for air gestures, pinch, swipe, fist, model switching, gesture mode vs tap mode, or v1 AirGestures.
---

# Vision models and air gestures

**v2 (`TapSDKWeb2`) only** for model switching. v1 air gestures are at the end of this page.

The v2 device runs one vision model at a time:

| `ModelTypes` | Output | Callback |
|--------------|--------|----------|
| `TAPPING` | finger taps | `registerTapEvents`: `cb(id, [tapcode])` |
| `AIR_GESTURE` | swipes, pinches, holds, fist | `registerAirGestureEvents`: `cb(id, [code])` |

| `VisionSensorOpModes` | Meaning | Use with |
|-----------------------|---------|----------|
| `TRIGGER` | Run the model when a tap-like trigger occurs | `TAPPING` |
| `STREAM` | Run the model all the time | `AIR_GESTURE` |
| `STREAM_ON_TRIGGER` | Start streaming after a trigger | experiments |

## Enable and switch

```typescript
import {
    DeviceFeatures,
    ModelTypes,
    TapSDKWeb2,
    UnifiedAirGestures,
    VisionSensorOpModes,
} from '@tapwithus/tapsdk';

async function useAirGestures(sdk: TapSDKWeb2): Promise<void> {
    await sdk.setFeature(DeviceFeatures.MODEL_DETECTION, true);
    await sdk.setVisionSensorModel(ModelTypes.AIR_GESTURE);
    await sdk.setVisionSensorOpMode(VisionSensorOpModes.STREAM);
}

async function useTapping(sdk: TapSDKWeb2): Promise<void> {
    await sdk.setFeature(DeviceFeatures.MODEL_DETECTION, true);
    await sdk.setVisionSensorModel(ModelTypes.TAPPING);
    await sdk.setVisionSensorOpMode(VisionSensorOpModes.TRIGGER);
}
```

Call these after `connect()` returns and after you register callbacks. `connect()` already started notifications. There is no `start()`. You can switch at runtime, as often as needed. Read the current state with `await sdk.getVisionSensorModel()` and `await sdk.getVisionSensorOpMode()`. Each call times out after 2 s if the device does not answer.

To start from a clean state, turn each feature off. Do not loop `Object.values(DeviceFeatures)` — a numeric enum also lists names.

```typescript
await sdk.setFeature(DeviceFeatures.RAW_IMU_DATA, false);
await sdk.setFeature(DeviceFeatures.MODEL_DETECTION, false);
await sdk.setFeature(DeviceFeatures.IMU_MOTION_DATA, false);
await sdk.setFeature(DeviceFeatures.TRIGGER_DETECTIONS, false);
await sdk.setFeature(DeviceFeatures.STANDBY_GESTURE_DETECTION, false);
```

## UnifiedAirGestures codes

Letters: A = thumb, B = index, C = middle, D = ring, E = pinky. "AB" = thumb touches index (pinch).

| Code | Name | Meaning |
|------|------|---------|
| 100 | `COMBINED_GESTURE_NONE` | No gesture / hand relaxed. Use it as "release" after a hold. |
| 101 | `COMBINED_GESTURE_LEFT` | Swipe left |
| 102 | `COMBINED_GESTURE_RIGHT` | Swipe right |
| 103 | `COMBINED_GESTURE_UP` | Swipe up |
| 104 | `COMBINED_GESTURE_DOWN` | Swipe down |
| 105-108 | `COMBINED_GESTURE_AB` / `AC` / `AD` / `AE` | Short pinch: thumb + index / middle / ring / pinky |
| 109 | `COMBINED_GESTURE_FIST` | Fist |
| 110-113 | `COMBINED_GESTURE_AB_HOLD` ... `AE_HOLD` | Pinch held |
| 114 | `COMBINED_GESTURE_FIST_HOLD` | Fist held |

```typescript
function onAirGesture(_identifier: string, data: number[]): void {
    if (data[0] === UnifiedAirGestures.COMBINED_GESTURE_LEFT) {
        goBack();
    }
}
```

The device sends gesture packets continuously in `STREAM` mode, so the same code repeats. To act once per gesture, act when the code **changes**, or ignore repeats within about 40 ms. Holds repeat until the hand relaxes and `NONE` (100) arrives. Wait for a few `NONE` packets in a row before you treat a hold as released (see `tap-dpad`).

## Example: switch models with a gesture

Fist-hold switches to tapping; all-five-finger tap (31) switches back:

```typescript
function onAirGesture(_identifier: string, data: number[]): void {
    if (data[0] === UnifiedAirGestures.COMBINED_GESTURE_FIST_HOLD) {
        void useTapping(sdk);
    }
}

function onTap(_identifier: string, data: number[]): void {
    if (data[0] === 31) {
        void useAirGestures(sdk);
    }
}
```

## Standby

`DeviceFeatures.STANDBY_GESTURE_DETECTION` lets the user put the device in standby with a gesture. `registerStandbyStateEvents(cb(id, isStandby))` reports changes. `await sdk.setStandbyState(false)` wakes it. `await sdk.getStandbyState()` reads it.

## v1 air gestures (TapXR / Tap Strap 2 in Controller mode)

v1 has no model switching. In `InputModeController()`, `registerAirGestureEvents` gives `cb(id, gesture: number)` that matches `AirGestures` (for example `UP_ONE_FINGER`, `LEFT_TWO_FINGERS`, `PINCH`, `THUMB_FINGER`, `STATE_FIST`). `registerAirGestureStateEvents` gives `cb(id, MouseModes)` when the air-mouse state changes.

## Docs

- Enumerations: `src/enumerations.ts` in this repository
- Demo: https://tapwithus.github.io/tap-web-sdk/
