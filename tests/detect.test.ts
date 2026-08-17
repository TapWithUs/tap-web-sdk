import { describe, it, expect } from 'vitest';
import { detectProtocolFromCharacteristics, V2_READ_CHAR } from '../src/detect';
import { formatModelVersionHex } from '../src/deviceInfo';

describe('detectProtocolFromCharacteristics', () => {
    it('returns v2 when c3ff000e is present', () => {
        expect(detectProtocolFromCharacteristics([
            'c3ff0005-1d8b-40fd-a56f-c7bd5d0f3370',
            V2_READ_CHAR,
        ])).toBe('v2');
    });

    it('returns v1 when c3ff000e is absent', () => {
        expect(detectProtocolFromCharacteristics([
            'c3ff0005-1d8b-40fd-a56f-c7bd5d0f3370',
            'c3ff0006-1d8b-40fd-a56f-c7bd5d0f3370',
        ])).toBe('v1');
    });

    it('is case-insensitive on uuids', () => {
        expect(detectProtocolFromCharacteristics([
            V2_READ_CHAR.toUpperCase(),
        ])).toBe('v2');
    });
});

describe('formatModelVersionHex', () => {
    it('formats numeric strings as hex', () => {
        expect(formatModelVersionHex('10')).toBe('0xA');
    });

    it('passes through non-numeric strings', () => {
        expect(formatModelVersionHex('abc')).toBe('abc');
    });

    it('returns null for null', () => {
        expect(formatModelVersionHex(null)).toBeNull();
    });
});
