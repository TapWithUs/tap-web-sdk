// TapSDK Web - Browser SDK for Tap Strap devices using Web Bluetooth
// Chromium-only (Chrome, Edge, Opera)

export { TapSDKWeb } from './TapSDKWeb';
export { TapSDKWeb2 } from './TapSDKWeb2';
export {
    InputType,
    MouseModes,
    AirGestures,
    SwipeDirections,
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
    IncCommandType,
    IncSubCommandType1,
} from './parsers';
export {
    encodeSetFeature,
    encodeSetVisionSensorOpMode,
    encodeSetVisionSensorModel,
    encodeSetImuSensitivity,
    encodeSetHapticPattern,
    encodeKeepaliveMessage,
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
