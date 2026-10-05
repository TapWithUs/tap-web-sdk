---
name: tap-tapping
description: Decode Tap tapcodes (which fingers tapped), map finger combinations to in-page actions, and give haptic feedback. Use for tapping, finger combos, chords, tap-to-action, shortcuts, v1 input modes, or the v2 TAPPING model.
---

# Tapping

Works on v1 and v2. Start from the `tap-getting-started` skill for connection.

## Tapcode bitmask

A tapcode is an int 1-31. Each bit is one finger:

| Bit | Value | Finger |
|-----|-------|--------|
| 0 | 1 | thumb |
| 1 | 2 | index |
| 2 | 4 | middle |
| 3 | 8 | ring |
| 4 | 16 | pinky |

Examples: `1` thumb, `2` index, `3` thumb+index, `6` index+middle, `31` all five.

```typescript
const FINGERS = ['thumb', 'index', 'middle', 'ring', 'pinky'];

function first(value: number | number[]): number {
    return Array.isArray(value) ? value[0] : value;
}

function fingers(tapcode: number): string[] {
    return FINGERS.filter((_, bit) => tapcode & (1 << bit));
}

const ACTIONS: Record<number, string> = {
    2: 'next',       // index
    4: 'previous',   // middle
    6: 'select',     // index + middle
    31: 'quit',      // all fingers
};

function onTap(_identifier: string, tapcode: number | number[]): void {
    const action = ACTIONS[first(tapcode)];
    if (action) {
        handle(action);
    }
}
```

Single-finger taps are the most reliable. Prefer them for frequent actions. Use 2-finger combos next. Use 3+ finger combos only for rare actions.

## Turn on tap events

- **v1**: `await sdk.setInputMode(new InputModeController())` after you register callbacks. `connect()` already started notifications. There is no `start()`.
  - `new InputModeText()` (default): the Tap types letters into the focused field. The SDK gets no taps.
  - `new InputModeController()`: the SDK gets tap, mouse, and air-gesture events. No typing.
  - `new InputModeControllerText()`: both at the same time.
  - The SDK re-sends the mode every 10 s, so the device stays in it.
- **v2**: `setFeature(DeviceFeatures.MODEL_DETECTION, true)`, `setVisionSensorModel(ModelTypes.TAPPING)`, `setVisionSensorOpMode(VisionSensorOpModes.TRIGGER)`.

## Double taps and multi-taps

The SDK reports every tap. Detect double taps yourself with a time window:

```typescript
const last = { code: null as number | null, t: 0 };

function onTap(_identifier: string, tapcode: number | number[]): void {
    const code = first(tapcode);
    const now = performance.now();
    if (code === last.code && now - last.t < 350) {
        handleDouble(code);
        last.code = null;
        return;
    }
    last.code = code;
    last.t = now;
    handleSingle(code);
}
```

If single and double must not both fire, delay the single action until the window ends (`setTimeout` for 350 ms) and clear that timer on the second tap.

## Map taps to page actions

The page cannot press keys in other apps. Map taps to functions in this page, and use the same functions for keyboard fallback:

```typescript
const ACTIONS: Record<number, () => void> = {
    2: () => goNext(),
    4: () => goPrevious(),
    6: () => select(),
};

function onTap(_identifier: string, tapcode: number | number[]): void {
    ACTIONS[first(tapcode)]?.();
}
```

## Haptic feedback

```typescript
await sdk.sendVibrationSequence([80]);            // short buzz
await sdk.sendVibrationSequence([100, 100, 100]); // double buzz
```

Values are on/off durations in ms (10-2550, max 18 values). From a callback, do not await: `void sdk.sendVibrationSequence([80])`.

## Docs

- Demo: https://tapwithus.github.io/tap-web-sdk/
- Enumerations: `src/enumerations.ts` in this repository
