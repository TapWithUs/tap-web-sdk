// TapSDK Web - Browser SDK for Tap Strap devices using Web Bluetooth
// Chromium-only (Chrome, Edge, Opera)

export { connect, isTapSDKWeb2 } from './connect';
export type { ConnectedTapSDK, ConnectOptions } from './connect';
export { TapSDKWeb } from './TapSDKWeb';
export { TapSDKWeb2 } from './TapSDKWeb2';
export {
    detectProtocol,
    detectProtocolFromCharacteristics,
    TAP_SERVICE,
    NUS_SERVICE,
    V2_READ_CHAR,
} from './detect';
export type { TapProtocol } from './detect';
export {
    readDeviceInfo,
    formatModelVersionHex,
    DEVICE_INFORMATION_SERVICE,
    BATTERY_SERVICE,
} from './deviceInfo';
export type { DeviceInfo } from './deviceInfo';
export {
    InputType,
    MouseModes,
    AirGestures,
    FingerAcclSensitivity,
    ImuGyroSensitivity,
    ImuAcclSensitivity,
    UnifiedAirGestures,
    VisionSensorOpModes,
    ModelTypes,
    DeviceFeatures,
} from './enumerations';
export {
    InputMode,
    InputModeText,
    InputModeController,
    InputModeControllerText,
    InputModeRaw,
    inputTypeCommand,
} from './inputmodes';
export {
    tapDataMsg,
    mouseDataMsg,
    airGestureDataMsg,
    rawDataMsg,
    tapIncMsg,
    configStateMsg,
    IncCommandType,
    IncSubCommandType1,
    IncConfigStateSubCommandType1,
} from './parsers';
export {
    encodeSetFeature,
    encodeGetFeature,
    encodeSetVisionSensorOpMode,
    encodeSetVisionSensorModel,
    encodeSetImuSensitivity,
    encodeSetHapticPattern,
    encodeKeepaliveMessage,
    encodeGetVisionSensorOpMode,
    encodeGetVisionSensorModel,
    encodeGetImuSensitivity,
    encodeStandbyStateGet,
    encodeStandbyStateSet,
} from './encoder';
export type {
    TapEvent,
    MouseEvent,
    AirGestureEvent,
    RawDataMessage,
    RawDataEvent,
    ImuMotionData,
    TapIncMessage,
} from './types';
