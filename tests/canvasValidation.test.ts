import { assertCanvasHasLineContent, assertCanvasHasMapTiles } from '../utils/canvasValidation';

type RGBA = [number, number, number, number];

type OverrideMap = Record<string, RGBA>;

const createMockCanvas = (width: number, height: number, defaultPixel: RGBA, overrides: OverrideMap = {}) => {
  return {
    width,
    height,
    getContext: (type: string) => {
      if (type !== '2d') {
        return null;
      }
      return {
        getImageData: (x: number, y: number) => {
          const clampedX = Math.min(Math.max(Math.floor(x), 0), width - 1);
          const clampedY = Math.min(Math.max(Math.floor(y), 0), height - 1);
          const key = `${clampedX},${clampedY}`;
          const pixel = overrides[key] ?? defaultPixel;
          return { data: new Uint8ClampedArray(pixel) };
        }
      } as CanvasRenderingContext2D;
    }
  } as unknown as HTMLCanvasElement;
};

describe('canvasValidation', () => {
  describe('assertCanvasHasMapTiles', () => {
    it('throws when the canvas only contains the background color', () => {
      const canvas = createMockCanvas(32, 32, [0, 0, 0, 255]);
      expect(() => assertCanvasHasMapTiles(canvas, '#000000')).toThrow(
        'Export failed: base map tiles were not rendered before capture.'
      );
    });

    it('does not throw when a non-background pixel is present', () => {
      const canvas = createMockCanvas(32, 32, [0, 0, 0, 255], {
        '5,5': [120, 120, 120, 255]
      });
      expect(() => assertCanvasHasMapTiles(canvas, '#000000')).not.toThrow();
    });
  });

  describe('assertCanvasHasLineContent', () => {
    it('throws when no opaque pixels are present', () => {
      const canvas = createMockCanvas(48, 48, [0, 0, 0, 0]);
      expect(() => assertCanvasHasLineContent(canvas)).toThrow(
        'Export failed: tracks were not rendered before capture.'
      );
    });

    it('does not throw when at least one opaque pixel exists', () => {
      const canvas = createMockCanvas(48, 48, [0, 0, 0, 0], {
        '10,10': [255, 0, 0, 200]
      });
      expect(() => assertCanvasHasLineContent(canvas)).not.toThrow();
    });
  });
});
