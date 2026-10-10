import {describe, expect, it} from '@jest/globals';
import {parseCoordinate, toCompass16} from '../../tools/geo';

describe('parseCoordinate', () => {
    it('returns the absolute value for northern and eastern references', () => {
        expect(parseCoordinate(60.1699, 'N')).toBe(60.1699);
        expect(parseCoordinate(-60.1699, 'N')).toBe(60.1699);
        expect(parseCoordinate('24.9384', 'E')).toBe(24.9384);
    });

    it('negates the value for southern and western references regardless of case and padding', () => {
        expect(parseCoordinate(33.8688, 'S')).toBe(-33.8688);
        expect(parseCoordinate('151.2093', ' w ')).toBe(-151.2093);
        expect(parseCoordinate(-33.8688, 's')).toBe(-33.8688);
    });

    it('keeps the value positive when the reference is missing or unknown', () => {
        expect(parseCoordinate(-12.5)).toBe(12.5);
        expect(parseCoordinate(12.5, '')).toBe(12.5);
        expect(parseCoordinate(12.5, 'X')).toBe(12.5);
    });

    it('returns null for missing and non numeric values', () => {
        expect(parseCoordinate(null as unknown as number)).toBeNull();
        expect(parseCoordinate(undefined as unknown as number)).toBeNull();
        expect(parseCoordinate('not a number')).toBeNull();
        expect(parseCoordinate(Number.NaN)).toBeNull();
        expect(parseCoordinate(Number.POSITIVE_INFINITY)).toBeNull();
    });
});

describe('toCompass16', () => {
    it('maps the cardinal and intercardinal degrees to their abbreviations', () => {
        expect(toCompass16(0)).toBe('N');
        expect(toCompass16(22.5)).toBe('NNE');
        expect(toCompass16(45)).toBe('NE');
        expect(toCompass16(90)).toBe('E');
        expect(toCompass16(135)).toBe('SE');
        expect(toCompass16(180)).toBe('S');
        expect(toCompass16(225)).toBe('SW');
        expect(toCompass16(270)).toBe('W');
        expect(toCompass16(315)).toBe('NW');
        expect(toCompass16(337.5)).toBe('NNW');
    });

    it('rounds to the nearest sector and wraps around the full circle', () => {
        expect(toCompass16(11)).toBe('N');
        expect(toCompass16(12)).toBe('NNE');
        expect(toCompass16(359)).toBe('N');
        expect(toCompass16(360)).toBe('N');
        expect(toCompass16(450)).toBe('E');
        expect(toCompass16(-90)).toBe('W');
        expect(toCompass16(-450)).toBe('W');
    });

    it('returns null for missing and non finite directions', () => {
        expect(toCompass16(null)).toBeNull();
        expect(toCompass16(undefined)).toBeNull();
        expect(toCompass16(Number.NaN)).toBeNull();
        expect(toCompass16(Number.NEGATIVE_INFINITY)).toBeNull();
    });
});
