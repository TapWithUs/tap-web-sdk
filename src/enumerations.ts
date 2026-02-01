// Enumerations ported from tapsdk/enumerations.py

export enum MouseModes {
    STDBY = 0,
    AIR_MOUSE = 1,
    OPTICAL1 = 2,
    OPTICAL2 = 3,
}

export enum InputType {
    MOUSE = 1,
    KEYBOARD = 2,
    AUTO = 3,
}

export enum AirGestures {
    NONE = 0,
    GENERAL = 1,
    UP_ONE_FINGER = 2,
    UP_TWO_FINGERS = 3,
    DOWN_ONE_FINGER = 4,
    DOWN_TWO_FINGERS = 5,
    LEFT_ONE_FINGER = 6,
    LEFT_TWO_FINGERS = 7,
    RIGHT_ONE_FINGER = 8,
    RIGHT_TWO_FINGERS = 9,
    PINCH = 10,
    THUMB_FINGER = 12,
    THUMB_MIDDLE = 14,
    STATE_OPEN = 100,
    STATE_THUMB_FINGER = 101,
    STATE_THUMB_MIDDLE = 102,
    STATE_THUMB_RING = 103,
    STATE_THUMB_PINKY = 104,
    STATE_FIST = 105,
}

export enum FingerAcclSensitivity {
    G2 = 1,
    G4 = 2,
    G8 = 3,
    G16 = 4,
}

export enum ImuGyroSensitivity {
    DPS125 = 1,
    DPS250 = 2,
    DPS500 = 3,
    DPS1000 = 4,
    DPS2000 = 5,
}

export enum ImuAcclSensitivity {
    G2 = 1,
    G4 = 2,
    G8 = 3,
    G16 = 4,
}
