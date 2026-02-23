// TapSDK Web - Browser SDK for Tap Strap devices using Web Bluetooth
// Chromium-only (Chrome, Edge, Opera)

export { TapSDKWeb } from './TapSDKWeb';
export {
    InputType,
    MouseModes,
    AirGestures,
    SwipeDirections,
    FingerAcclSensitivity,
    ImuGyroSensitivity,
    ImuAcclSensitivity,
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
} from './parsers';
export type {
    TapEvent,
    MouseEvent,
    AirGestureEvent,
    RawDataMessage,
    RawDataEvent,
} from './types';
