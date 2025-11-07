import { assertCanvasHasMapTiles } from '../utils/canvasValidation';

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
      const context = {
        getImageData: (x: number, y: number) => {
          const clampedX = Math.min(Math.max(Math.floor(x), 0), width - 1);
          const clampedY = Math.min(Math.max(Math.floor(y), 0), height - 1);
          const key = `${clampedX},${clampedY}`;
          const pixel = overrides[key] ?? defaultPixel;
          return { data: new Uint8ClampedArray(pixel) };
        }
      };

      return context as unknown as CanvasRenderingContext2D;
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

});
