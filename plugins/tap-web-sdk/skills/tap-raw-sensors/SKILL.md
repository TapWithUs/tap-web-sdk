---
name: tap-raw-sensors
description: Stream raw accelerometer and gyroscope samples from a Tap (v1 raw mode or v2 RAW_IMU_DATA), set sensitivity and scaling, log to CSV, and plot. Use for raw sensors, raw IMU, accelerometer, gyro, data logging, datasets, custom gesture recognition, or research.
---

# Raw sensors

For research, datasets, and custom gesture models. For pointer movement or orientation, prefer `tap-imu-motion` (less data, already processed).

## Packet format (both protocols)

The callback gets a list of packets: `cb(identifier, packets)`.

| Key | Type | Meaning |
|-----|------|---------|
| `type` | `'imu' \| 'accl'` | `"imu"` (thumb IMU) or `"accl"` (finger accelerometers) |
| `ts` | `number` | Device timestamp in ms (device clock, not wall time) |
| `payload` | `number[]` | `imu`: `[gyroX, gyroY, gyroZ, acclX, acclY, acclZ]` (6 values). `accl`: 5 fingers x `[x, y, z]` (15 values, thumb first). |

Units: raw LSB counts, or **mdps** (gyro) and **mg** (accelerometer) when scaling is on. Rate is about 200 Hz per sensor, delivered in batches.

## v2 (`TapSDKWeb2`)

```typescript
import { DeviceFeatures, ImuAcclSensitivity, ImuGyroSensitivity } from '@tapwithus/tapsdk';

sdk.registerRawImuDataEvents(onRaw); // registerRawDataEvents also works
await sdk.setFeature(DeviceFeatures.RAW_IMU_DATA, true);
await sdk.setImuSensitivity(
    ImuAcclSensitivity.G2,       // G2 / G4 / G8 / G16
    ImuGyroSensitivity.DPS125,   // DPS125 ... DPS2000
    { scaled: true },            // payload in mg / mdps
);
// later
await sdk.setFeature(DeviceFeatures.RAW_IMU_DATA, false);
```

`connect()` already started notifications. There is no `start()`. `await sdk.getImuSensitivity()` returns `[ImuGyroSensitivity, ImuAcclSensitivity]`.

## v1 (`TapSDKWeb`)

```typescript
import { InputModeController, InputModeRaw } from '@tapwithus/tapsdk';
import { FingerAcclSensitivity, ImuAcclSensitivity, ImuGyroSensitivity } from '@tapwithus/tapsdk';

sdk.registerRawDataEvents(onRaw);
await sdk.setInputMode(new InputModeRaw({
    scaled: true,
    fingerAcclSens: FingerAcclSensitivity.G2,  // default G2
    imuGyroSens: ImuGyroSensitivity.DPS125,    // default DPS125
    imuAcclSens: ImuAcclSensitivity.G2,        // default G2
}));
// leave raw mode
await sdk.setInputMode(new InputModeController());
```

- To change sensitivity, leave raw mode first, then enter it again with new values. The SDK ignores a raw-to-raw change.
- Raw streaming needs **Developer mode** turned on in Tap Manager.
- Tap Strap streams finger accelerometers. Tap Strap 2 and TapXR also stream the thumb IMU.

## Log to CSV

Open [scripts/log-csv.html](scripts/log-csv.html) from this repository with a local static server after `npm run build`. It works on v1 and v2. It records for the chosen number of seconds, then downloads a CSV file.

Columns: `host_time`, `device_ts_ms`, `type` (`imu` or `accl`), then the payload values.

In the user's app, push packets onto an array in the callback and build the CSV outside the callback. Download it with a `Blob`.

## Plot

Parse the CSV in the page and draw it on a canvas, or open the file in a spreadsheet. `imu` accelerometer axes are payload columns 3, 4, and 5 (after gyro x/y/z).

## Tips

- Callbacks get batches at a high rate. Append to a list. Write the file or draw outside the callback.
- Use `ts` for timing between samples, not `Date.now()`.
- Lower sensitivity (`G2`, `DPS125`) gives more resolution. Raise it for fast, strong motion so values do not clip.

## Docs

- Demo: https://tapwithus.github.io/tap-web-sdk/
- Packet type: `RawDataMessage` in `src/types.ts`
