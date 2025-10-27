import { describe, it, expect } from 'vitest';
import * as utils from '../services/utils';
import type { Track } from '../types';

describe('Color Utilities', () => {
  describe('hexToRgb', () => {
    it('correctly converts red hex to RGB', () => {
      expect(utils.hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('correctly converts green hex to RGB', () => {
      expect(utils.hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
    });

    it('correctly converts blue hex to RGB', () => {
      expect(utils.hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('correctly converts white hex to RGB', () => {
      expect(utils.hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('correctly converts black hex to RGB', () => {
      expect(utils.hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('returns null for invalid hex', () => {
      expect(utils.hexToRgb('badhex')).toBeNull();
    });
  });

  describe('rgbToHex', () => {
    it('correctly converts red RGB to hex', () => {
      expect(utils.rgbToHex(255, 0, 0)).toBe('#ff0000');
    });

    it('correctly converts green RGB to hex', () => {
      expect(utils.rgbToHex(0, 255, 0)).toBe('#00ff00');
    });

    it('correctly converts blue RGB to hex', () => {
      expect(utils.rgbToHex(0, 0, 255)).toBe('#0000ff');
    });
  });

  describe('color conversions are reversible', () => {
    it('hex -> RGB -> hex returns original value', () => {
      const hex = '#e67e22';
      const rgb = utils.hexToRgb(hex);
      expect(rgb).not.toBeNull();
      const finalHex = utils.rgbToHex(rgb!.r, rgb!.g, rgb!.b);
      expect(finalHex).toBe(hex);
    });
  });

  describe('rgbToHsv', () => {
    it('converts red correctly', () => {
      const result = utils.rgbToHsv(255, 0, 0);
      expect(result.h).toBe(0);
      expect(result.s).toBe(1);
      expect(result.v).toBe(1);
    });

    it('converts white correctly', () => {
      const result = utils.rgbToHsv(255, 255, 255);
      expect(result.h).toBe(0);
      expect(result.s).toBe(0);
      expect(result.v).toBe(1);
    });

    it('converts black correctly', () => {
      const result = utils.rgbToHsv(0, 0, 0);
      expect(result.h).toBe(0);
      expect(result.s).toBe(0);
      expect(result.v).toBe(0);
    });
  });

  describe('hsvToRgb', () => {
    it('converts red HSV correctly', () => {
      const result = utils.hsvToRgb(0, 1, 1);
      expect(result.r).toBe(255);
      expect(result.g).toBe(0);
      expect(result.b).toBe(0);
    });

    it('converts white HSV correctly', () => {
      const result = utils.hsvToRgb(0, 0, 1);
      expect(result.r).toBe(255);
      expect(result.g).toBe(255);
      expect(result.b).toBe(255);
    });

    it('converts black HSV correctly', () => {
      const result = utils.hsvToRgb(0, 0, 0);
      expect(result.r).toBe(0);
      expect(result.g).toBe(0);
      expect(result.b).toBe(0);
    });
  });

  describe('getRandomColorInRange', () => {
    it('returns a valid hex color', () => {
      const color = utils.getRandomColorInRange('#ff0000', '#0000ff');
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('returns fallback for invalid hex values', () => {
      const color = utils.getRandomColorInRange('invalid', 'invalid');
      expect(color).toBe('#ff4500');
    });
  });
});

describe('getTracksBounds', () => {
  it('returns null for empty tracks array', () => {
    expect(utils.getTracksBounds([])).toBeNull();
  });

  it('returns bounds for valid tracks', () => {
    const tracks: Track[] = [
      {
        id: 'test1',
        name: 'Track 1',
        points: [[51.5, -0.1], [51.6, -0.2]],
        length: 10,
        isVisible: true
      }
    ];
    const bounds = utils.getTracksBounds(tracks);
    expect(bounds).not.toBeNull();
    expect(bounds?.isValid()).toBe(true);
  });

  it('returns null when tracks have no points', () => {
    const tracks: Track[] = [
      {
        id: 'test1',
        name: 'Track 1',
        points: [],
        length: 0,
        isVisible: true
      }
    ];
    expect(utils.getTracksBounds(tracks)).toBeNull();
  });
});
