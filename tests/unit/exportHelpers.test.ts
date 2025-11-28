
import L from 'leaflet';
import { waitForCanvasRenderer } from '@/utils/exportHelpers';

// Mock Leaflet
jest.mock('leaflet', () => {
  const originalModule = jest.requireActual('leaflet');
  return {
    ...originalModule,
    polyline: jest.fn(),
    Map: jest.fn(),
    Canvas: jest.fn(),
  };
});

describe('waitForCanvasRenderer - Staggered Moving Slice Algorithm', () => {
  let mapMock: any;
  let rendererMock: any;
  let canvasMock: any;
  let contextMock: any;
  let onProgressMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    onProgressMock = jest.fn();

    // Mock Canvas Context
    contextMock = {
      getImageData: jest.fn(),
    };

    // Mock Canvas Element
    canvasMock = {
      width: 1000,
      height: 1000,
      getContext: jest.fn().mockReturnValue(contextMock),
    };

    // Mock Renderer
    rendererMock = {
      _container: canvasMock,
      on: jest.fn(),
    };
    // Make renderer an instance of L.Canvas to pass the instanceof check
    Object.setPrototypeOf(rendererMock, L.Canvas.prototype);

    // Mock Map
    mapMock = {
      getRenderer: jest.fn().mockReturnValue(rendererMock),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should resolve immediately if no renderer is found', async () => {
    mapMock.getRenderer.mockReturnValue(null);
    const promise = waitForCanvasRenderer(mapMock, onProgressMock);

    // Fast-forward timers just in case
    jest.advanceTimersByTime(100);

    await expect(promise).resolves.toBeUndefined();
    expect(onProgressMock).not.toHaveBeenCalled();
  });

  it('should scan slices and resolve when content is found (Needle in Haystack)', async () => {
    // SETUP:
    // Canvas Height = 1000px
    // Target Slice Height = 100px
    // Num Slices = 1000 / 100 = 10 slices
    // Slice Height = 100px
    // Stride = 7
    //
    // Check Sequence (slice indices):
    // Check 1: (0 * 7) % 10 = 0  (y=0)
    // Check 2: (1 * 7) % 10 = 7  (y=700)
    // Check 3: (2 * 7) % 10 = 4  (y=400)
    // Check 4: (3 * 7) % 10 = 1  (y=100)
    //
    // We will place content ONLY in slice index 1 (y=100).
    // The algorithm should find it on the 4th check.

    // Mock getImageData to return empty by default, but content for slice 1
    contextMock.getImageData.mockImplementation((x: number, y: number, w: number, h: number) => {
      // Create empty buffer
      const data = new Uint8ClampedArray(w * h * 4);

      // If we are scanning the slice starting at y=100 (Index 1)
      if (y === 100) {
        // Add a single non-transparent pixel
        data[3] = 255; // Alpha = 255 at index 0 (first pixel of the slice)
      }

      return { data };
    });

    // Start the wait
    const promise = waitForCanvasRenderer(mapMock, onProgressMock);

    // Advance time to trigger checks
    // We expect it to take 4 checks.
    // Initial check is via requestAnimationFrame (immediate/fast)
    // Subsequent checks are setInterval(100ms)

    // Check 1 (Immediate/RAF): Slice 0 -> Empty
    // requestAnimationFrame is a timer in jsdom/jest, so we need to advance time slightly or use runAllImmediates
    jest.advanceTimersByTime(1);

    // Check 2 (100ms): Slice 7 -> Empty
    // Since we advanced 1ms, we need 99 more to hit 100ms, or just advance 100
    jest.advanceTimersByTime(100);

    // Check 3 (200ms): Slice 4 -> Empty
    jest.advanceTimersByTime(100);

    // Check 4 (300ms): Slice 1 -> Found!
    jest.advanceTimersByTime(100);

    // After content is found, there is a setTimeout(resolve, 50) delay
    // We need to advance time to let that finish
    jest.advanceTimersByTime(100);

    await promise;

    // Verify:
    // It should have called getImageData 4 times
    expect(contextMock.getImageData).toHaveBeenCalledTimes(4);

    // Verify the sequence of Y coordinates scanned
    expect(contextMock.getImageData).toHaveBeenNthCalledWith(1, 0, 0, 1000, 100);   // Index 0
    expect(contextMock.getImageData).toHaveBeenNthCalledWith(2, 0, 700, 1000, 100); // Index 7
    expect(contextMock.getImageData).toHaveBeenNthCalledWith(3, 0, 400, 1000, 100); // Index 4
    expect(contextMock.getImageData).toHaveBeenNthCalledWith(4, 0, 100, 1000, 100); // Index 1

    // Progress should be reported 4 times
    expect(onProgressMock).toHaveBeenCalledTimes(4);
  });

  it('should eventually resolve even if canvas remains empty (Timeout/MaxChecks)', async () => {
    // Mock getImageData to always return empty
    contextMock.getImageData.mockReturnValue({
      data: new Uint8ClampedArray(1000 * 100 * 4) // All zeros
    });

    const promise = waitForCanvasRenderer(mapMock, onProgressMock);

    // Run through all 50 checks (maxChecks)
    // 50 checks * 100ms = 5000ms
    jest.advanceTimersByTime(6000);

    await promise;

    // Should have checked 50 times
    expect(onProgressMock).toHaveBeenCalledTimes(50);
    expect(contextMock.getImageData).toHaveBeenCalledTimes(50);
  });

  it('should handle small canvases with minimum 10 slices', async () => {
    // Canvas Height = 50px
    // Target Slice Height = 100px -> calculatedSlices = 1
    // But we clamp minSlices to 10.
    // So numSlices = 10.
    // Slice Height = ceil(50 / 10) = 5px.

    canvasMock.height = 50;

    contextMock.getImageData.mockReturnValue({
      data: new Uint8ClampedArray(1000 * 5 * 4) // All zeros
    });

    const promise = waitForCanvasRenderer(mapMock, onProgressMock);

    // Run one check
    jest.runAllTicks();
    jest.advanceTimersByTime(100);

    // Check logic for first few slices
    // Stride 7. Modulo 10.
    // Check 1: 0
    // Check 2: 7
    // Check 3: 4

    // We just want to ensure it doesn't crash and calls with small height
    expect(contextMock.getImageData).toHaveBeenCalled();
    const lastCall = contextMock.getImageData.mock.calls[0];
    // lastCall args: x, y, w, h
    expect(lastCall[3]).toBeLessThanOrEqual(5); // Height should be small

    // Finish
    jest.advanceTimersByTime(6000);
    await promise;
  });

  it('should handle getImageData errors gracefully', async () => {
    // Mock error
    contextMock.getImageData.mockImplementation(() => {
      throw new Error('Canvas tainted');
    });

    const promise = waitForCanvasRenderer(mapMock, onProgressMock);

    // It should treat error as "rendered" or "done" to avoid infinite loop hanging,
    // or keep retrying depending on implementation.
    // The current implementation: catch(e) -> isRendered=true -> resolve.
    // So it should resolve immediately on error.

    jest.advanceTimersByTime(100);

    await promise;

    // Should have tried at least once
    expect(contextMock.getImageData).toHaveBeenCalled();
    // Should resolve successfully (not reject) despite the internal error
    await expect(promise).resolves.toBeUndefined();
  });
});
