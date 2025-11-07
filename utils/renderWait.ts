import type * as L from 'leaflet';

type FrameHandle = number | ReturnType<typeof setTimeout>;

type PolylineInternals = L.Polyline & {
  _map?: L.Map;
  _path?: (SVGPathElement & { getAttribute(name: string): string | null }) | null;
  _parts?: Array<unknown> | null;
  _renderer?: (L.Renderer & {
    on?: (event: string, handler: () => void) => void;
    off?: (event: string, handler: () => void) => void;
  }) | null;
};

const globalScope = globalThis as typeof globalThis & {
  requestAnimationFrame?: typeof requestAnimationFrame;
  cancelAnimationFrame?: typeof cancelAnimationFrame;
};

const scheduleFrame = (callback: FrameRequestCallback): FrameHandle => {
  if (typeof globalScope.requestAnimationFrame === 'function') {
    return globalScope.requestAnimationFrame(callback);
  }

  return setTimeout(() => callback(Date.now()), 16);
};

const cancelFrame = (handle: FrameHandle | null) => {
  if (handle === null) {
    return;
  }

  if (typeof globalScope.cancelAnimationFrame === 'function' && typeof handle === 'number') {
    globalScope.cancelAnimationFrame(handle);
    return;
  }

  clearTimeout(handle as ReturnType<typeof setTimeout>);
};

const hasSvgPathContent = (polyline: PolylineInternals): boolean => {
  const path = polyline._path;
  if (!path || typeof path.getAttribute !== 'function') {
    return false;
  }

  const d = path.getAttribute('d');
  return typeof d === 'string' && d.length > 0;
};

const hasCanvasSegments = (polyline: PolylineInternals): boolean => {
  const parts = polyline._parts;
  if (!Array.isArray(parts)) {
    return false;
  }

  return parts.some(part => Array.isArray(part) && part.length > 1);
};

export const isPolylineReadyForExport = (polyline: L.Polyline): boolean => {
  const layer = polyline as PolylineInternals;
  if (!layer || !layer._map) {
    return false;
  }

  return hasSvgPathContent(layer) || hasCanvasSegments(layer);
};

export const waitForPolylines = (polylines: L.Polyline[], timeoutMs: number = 60000): Promise<void> => {
  if (polylines.length === 0) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const pending = new Set<L.Polyline>(polylines);
    const rendererSubscriptions = new Map<L.Renderer, () => void>();
    let frameHandle: FrameHandle | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let settled = false;

    const cleanup = () => {
      cancelFrame(frameHandle);
      frameHandle = null;

      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      rendererSubscriptions.forEach((handler, renderer) => {
        if (typeof (renderer as PolylineInternals['_renderer'])?.off === 'function') {
          (renderer as PolylineInternals['_renderer'])!.off('update', handler);
        }
      });
      rendererSubscriptions.clear();
    };

    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      callback();
    };

    const resolveAfterFrame = () => {
      finish(() => {
        scheduleFrame(() => {
          resolve();
        });
      });
    };

    const rejectWithError = (error: Error) => {
      finish(() => {
        reject(error);
      });
    };

    const subscribeToRenderer = (polyline: L.Polyline) => {
      const layer = polyline as PolylineInternals;
      const renderer = layer._renderer;
      if (!renderer || typeof renderer.on !== 'function') {
        return;
      }

      if (!rendererSubscriptions.has(renderer)) {
        const handler = () => {
          if (settled) {
            return;
          }
          evaluatePending();
        };
        renderer.on('update', handler);
        rendererSubscriptions.set(renderer, handler);
      }
    };

    const evaluatePending = () => {
      let changed = false;
      for (const polyline of Array.from(pending)) {
        if (isPolylineReadyForExport(polyline)) {
          pending.delete(polyline);
          changed = true;
        } else {
          subscribeToRenderer(polyline);
        }
      }

      if (changed && pending.size === 0) {
        resolveAfterFrame();
      }
    };

    const tick = () => {
      if (settled) {
        return;
      }

      evaluatePending();

      if (pending.size > 0) {
        frameHandle = scheduleFrame(() => {
          tick();
        });
      }
    };

    timeoutId = setTimeout(() => {
      rejectWithError(new Error('Map export timed out waiting for tracks to render.'));
    }, timeoutMs);

    // Initial evaluation in case layers are already ready.
    evaluatePending();

    if (!settled && pending.size > 0) {
      tick();
    }
  });
};
