
/**
 * Creates a canvas, preferring @napi-rs/canvas in integration test environments for consistency
 * Unit tests use mocks, so we skip @napi-rs/canvas there
 */
export const createCompatibleCanvas = (width: number, height: number): HTMLCanvasElement => {
  if (typeof require !== 'undefined') {
    try {
      // Check if we're in integration test environment (has real canvas API)
      const testCanvas = document.createElement('canvas');
      const testCtx = testCanvas.getContext('2d');
      const hasRealCanvas = testCtx && typeof testCtx.getImageData === 'function';

      if (hasRealCanvas) {
        const canvasPkg = '@napi-rs/canvas';
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { createCanvas } = require(canvasPkg);
        return createCanvas(width, height) as unknown as HTMLCanvasElement;
      }
    } catch {
      // @napi-rs/canvas not available or detection failed
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};
