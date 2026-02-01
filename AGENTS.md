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
