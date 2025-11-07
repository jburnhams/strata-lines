import { isPolylineReadyForExport, waitForPolylines } from '../utils/renderWait';

type MutablePolyline = {
  _map?: object;
  _path?: { getAttribute: (name: string) => string | null } | null;
  _parts?: unknown[] | null;
  _renderer?: {
    on?: (event: string, handler: () => void) => void;
    off?: (event: string, handler: () => void) => void;
  } | null;
};

describe('render wait helpers', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('detects that a polyline without a map is not ready', () => {
    const polyline = {} as unknown as MutablePolyline;
    expect(isPolylineReadyForExport(polyline as any)).toBe(false);
  });

  it('detects readiness from an SVG path element', () => {
    const path = { getAttribute: (name: string) => (name === 'd' ? 'M0 0L1 1' : null) };
    const polyline: MutablePolyline = { _map: {}, _path: path };
    expect(isPolylineReadyForExport(polyline as any)).toBe(true);
  });

  it('detects readiness from projected canvas segments', () => {
    const polyline: MutablePolyline = {
      _map: {},
      _parts: [
        null,
        [{}, {}]
      ]
    };
    expect(isPolylineReadyForExport(polyline as any)).toBe(true);
  });

  it('waits for a renderer update before resolving', async () => {
    jest.useFakeTimers();

    let updateHandler: (() => void) | undefined;
    const renderer = {
      on: jest.fn((event: string, handler: () => void) => {
        if (event === 'update') {
          updateHandler = handler;
        }
      }),
      off: jest.fn()
    };

    const polyline: MutablePolyline = {
      _map: {},
      _parts: [],
      _renderer: renderer
    };

    const waitPromise = waitForPolylines([polyline as any], 5000);

    expect(renderer.on).toHaveBeenCalledWith('update', expect.any(Function));
    expect(updateHandler).toBeDefined();

    polyline._parts = [[{}, {}]];
    updateHandler?.();

    jest.runOnlyPendingTimers();

    await expect(waitPromise).resolves.toBeUndefined();
    expect(renderer.off).toHaveBeenCalledWith('update', expect.any(Function));
  });

  it('rejects when the wait times out', async () => {
    jest.useFakeTimers();

    const renderer = {
      on: jest.fn(),
      off: jest.fn()
    };

    const polyline: MutablePolyline = {
      _map: {},
      _parts: [],
      _renderer: renderer
    };

    const waitPromise = waitForPolylines([polyline as any], 100);

    jest.advanceTimersByTime(200);

    await expect(waitPromise).rejects.toThrow('Map export timed out waiting for tracks to render.');
  });
});
