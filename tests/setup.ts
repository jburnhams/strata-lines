import { afterEach } from '@jest/globals';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream } from 'stream/web';

// Add TextEncoder/TextDecoder to global for jsdom
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Add ReadableStream for undici (required by leaflet-node 2.0.10+)
if (typeof globalThis.ReadableStream === 'undefined') {
  globalThis.ReadableStream = ReadableStream as any;
}

// Add setImmediate/clearImmediate for undici
if (typeof global.setImmediate === 'undefined') {
  global.setImmediate = ((fn: (...args: any[]) => void, ...args: any[]) =>
    setTimeout(fn, 0, ...args)) as typeof setImmediate;
}
if (typeof global.clearImmediate === 'undefined') {
  global.clearImmediate = ((id: any) => clearTimeout(id)) as typeof clearImmediate;
}

// Patch setTimeout to add unref() method for undici compatibility
// jsdom returns numbers from setTimeout, but undici expects Timeout objects with unref()
const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;
const timerMap = new Map<number, any>();
let nextTimerId = 1;

(globalThis as any).setTimeout = function(...args: any[]) {
  const realTimer = originalSetTimeout.apply(this, args as any);

  // If it's already an object with unref, return it directly
  if (realTimer && typeof realTimer === 'object' && typeof (realTimer as any).unref === 'function') {
    return realTimer;
  }

  // Otherwise, wrap the timer ID in an object with unref/ref methods
  const timerId = typeof realTimer === 'number' ? realTimer : nextTimerId++;
  const timerObj = {
    id: timerId,
    unref() { return this; },
    ref() { return this; },
    [Symbol.toPrimitive]() { return timerId; },
    valueOf() { return timerId; }
  };

  timerMap.set(timerId, timerObj);
  return timerObj;
};

(globalThis as any).clearTimeout = function(timer: any) {
  if (timer && typeof timer === 'object') {
    const timerId = timer.id || timer.valueOf();
    timerMap.delete(timerId);
    return originalClearTimeout.call(this, timerId);
  }
  timerMap.delete(timer);
  return originalClearTimeout.call(this, timer);
};

// Add performance.markResourceTiming stub for undici
if (typeof performance !== 'undefined' && !performance.markResourceTiming) {
  (performance as any).markResourceTiming = () => {};
}

const nodeRequire = eval('require') as NodeJS.Require;

let fontAssetPath: string | undefined;
try {
  fontAssetPath = nodeRequire.resolve(
    '@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff2'
  );
} catch {
  try {
    fontAssetPath = nodeRequire.resolve(
      '@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff'
    );
  } catch {
    fontAssetPath = undefined;
  }
}

const fontBasePathKey = 'LEAFLET_NODE_FONT_BASE_PATH';
const globalConfig = globalThis as Record<string, unknown>;

if (fontAssetPath) {
  // leaflet-node 2.0.7 suppresses the final fallback warning when no base path is
  // configured, but the module still logs resolution errors while importing unless
  // a base path is present ahead of time. Seed the global hook so the helper below
  // can re-register without spamming the console.
  globalConfig[fontBasePathKey] = fontAssetPath;
} else {
  delete globalConfig[fontBasePathKey];
}

const {
  default: leafletNodeModule,
  setFontAssetBasePath,
} = nodeRequire('leaflet-node');

if (fontAssetPath) {
  setFontAssetBasePath(fontAssetPath);
}

jest.doMock('leaflet', () => leafletNodeModule);

const installMatchMedia = () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

installMatchMedia();

// Cleanup after each test
afterEach(() => {
  cleanup();
});

beforeEach(() => {
  installMatchMedia();
});
