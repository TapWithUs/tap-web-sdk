import { describe, it, expect } from 'vitest';
import {
    InputModeText,
    InputModeController,
    InputModeControllerText,
    InputModeRaw,
    inputTypeCommand,
    RawSensorsSensitivity,
} from '../src/inputmodes';
import {
    InputType,
    FingerAcclSensitivity,
    ImuGyroSensitivity,
    ImuAcclSensitivity,
} from '../src/enumerations';

describe('inputmodes', () => {
    describe('InputModeText', () => {
        it('should have correct name', () => {
            const mode = new InputModeText();
            expect(mode.name).toBe('Text Mode');
            expect(mode.toString()).toBe('Text Mode');
        });

        it('should generate correct command bytes', () => {
            const mode = new InputModeText();
            const cmd = mode.getCommand();
            expect(Array.from(cmd)).toEqual([0x3, 0xc, 0x0, 0x0]);
        });
    });

    describe('InputModeController', () => {
        it('should have correct name', () => {
            const mode = new InputModeController();
            expect(mode.name).toBe('Controller Mode');
        });

        it('should generate correct command bytes', () => {
            const mode = new InputModeController();
            const cmd = mode.getCommand();
            expect(Array.from(cmd)).toEqual([0x3, 0xc, 0x0, 0x1]);
        });
    });

    describe('InputModeControllerText', () => {
        it('should have correct name', () => {
            const mode = new InputModeControllerText();
            expect(mode.name).toBe('Controller and Text Mode');
        });

        it('should generate correct command bytes', () => {
            const mode = new InputModeControllerText();
            const cmd = mode.getCommand();
            expect(Array.from(cmd)).toEqual([0x3, 0xc, 0x0, 0x5]);
        });
    });

    describe('InputModeRaw', () => {
        it('should have correct name', () => {
            const mode = new InputModeRaw();
            expect(mode.name).toBe('Raw sensors Mode');
        });

        it('should use default sensitivities', () => {
            const mode = new InputModeRaw();
            const cmd = mode.getCommand();
            // Default: G2, DPS125, G2 => [1, 1, 1]
            expect(Array.from(cmd)).toEqual([0x3, 0xc, 0x0, 0xa, 1, 1, 1]);
        });

        it('should use custom sensitivities', () => {
            const mode = new InputModeRaw({
                fingerAcclSens: FingerAcclSensitivity.G16,
                imuGyroSens: ImuGyroSensitivity.DPS500,
                imuAcclSens: ImuAcclSensitivity.G4,
            });
            const cmd = mode.getCommand();
            // G16=4, DPS500=3, G4=2
            expect(Array.from(cmd)).toEqual([0x3, 0xc, 0x0, 0xa, 4, 3, 2]);
        });

        it('should set scaled flag correctly', () => {
            const modeUnscaled = new InputModeRaw();
            const modeScaled = new InputModeRaw({ scaled: true });

            expect(modeUnscaled.scaled).toBe(false);
            expect(modeScaled.scaled).toBe(true);
        });

        it('should expose sensitivity object', () => {
            const mode = new InputModeRaw({
                fingerAcclSens: FingerAcclSensitivity.G4,
                imuGyroSens: ImuGyroSensitivity.DPS250,
                imuAcclSens: ImuAcclSensitivity.G8,
            });

            expect(mode.sensitivity).toBeInstanceOf(RawSensorsSensitivity);
            expect(mode.sensitivity.toArray()).toEqual([2, 2, 3]);
        });
    });

    describe('inputTypeCommand', () => {
        it('should generate MOUSE command', () => {
            const cmd = inputTypeCommand(InputType.MOUSE);
            expect(Array.from(cmd)).toEqual([0x3, 0xd, 0x0, 1]);
        });

        it('should generate KEYBOARD command', () => {
            const cmd = inputTypeCommand(InputType.KEYBOARD);
            expect(Array.from(cmd)).toEqual([0x3, 0xd, 0x0, 2]);
        });

        it('should generate AUTO command', () => {
            const cmd = inputTypeCommand(InputType.AUTO);
            expect(Array.from(cmd)).toEqual([0x3, 0xd, 0x0, 3]);
        });
    });

    describe('RawSensorsSensitivity', () => {
        it('should return correct sensitivity values', () => {
            const sens = new RawSensorsSensitivity(
                FingerAcclSensitivity.G2,
                ImuGyroSensitivity.DPS125,
                ImuAcclSensitivity.G2
            );
            expect(sens.toArray()).toEqual([1, 1, 1]);
        });

        it('should return correct scale factors', () => {
            const sens = new RawSensorsSensitivity(
                FingerAcclSensitivity.G2, // scale = 3.91
                ImuGyroSensitivity.DPS125, // scale = 4.375
                ImuAcclSensitivity.G2 // scale = 0.061
            );
            const factors = sens.getScaleFactors();
            expect(factors[0]).toBeCloseTo(3.91);
            expect(factors[1]).toBeCloseTo(4.375);
            expect(factors[2]).toBeCloseTo(0.061);
        });

        it('should handle all sensitivity levels', () => {
            const sens = new RawSensorsSensitivity(
                FingerAcclSensitivity.G16, // scale = 31.25
                ImuGyroSensitivity.DPS2000, // scale = 70
                ImuAcclSensitivity.G16 // scale = 0.488
            );
            const factors = sens.getScaleFactors();
            expect(factors[0]).toBeCloseTo(31.25);
            expect(factors[1]).toBeCloseTo(70);
            expect(factors[2]).toBeCloseTo(0.488);
        });
    });
});
