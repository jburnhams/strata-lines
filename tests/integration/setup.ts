import { afterEach, beforeEach } from '@jest/globals';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream } from 'stream/web';

// Add TextEncoder/TextDecoder to global for jsdom
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Add polyfills BEFORE loading leaflet-node
// These are needed because undici (required at top of leaflet-node) uses them immediately

// ReadableStream polyfill
if (typeof globalThis.ReadableStream === 'undefined') {
  globalThis.ReadableStream = ReadableStream as any;
}

// performance.markResourceTiming polyfill
// undici captures a reference to this when it loads, so it must exist before leaflet-node loads
if (typeof performance !== 'undefined' && !(performance as any).markResourceTiming) {
  (performance as any).markResourceTiming = () => {};
}

// Note: leaflet-node 2.0.14+ provides remaining undici polyfills:
// - setImmediate/clearImmediate
// - setTimeout().unref()/ref()
// However, undici also needs setTimeout().refresh() which is not provided by leaflet-node yet
// This polyfill wraps setTimeout to add the missing refresh() method

const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;

(globalThis as any).setTimeout = function(callback: (...args: any[]) => void, delay?: number, ...args: any[]) {
  const timer = originalSetTimeout(callback, delay, ...args);

  // Create a wrapper object with all timer methods
  const timerObj: any = {
    _id: timer,
    _callback: callback,
    _delay: delay || 0,
    _args: args,
    _cleared: false,

    unref() {
      // Jest timers don't have unref, so this is a no-op
      return this;
    },

    ref() {
      // Jest timers don't have ref, so this is a no-op
      return this;
    },

    refresh() {
      if (!this._cleared) {
        // Clear the old timer and create a new one with the same delay
        originalClearTimeout(this._id);
        this._id = originalSetTimeout(this._callback, this._delay, ...this._args);
      }
      return this;
    },

    // Allow the object to be used as a primitive (for clearTimeout)
    valueOf() {
      return this._id;
    },

    [Symbol.toPrimitive]() {
      return this._id;
    }
  };

  return timerObj;
};

(globalThis as any).clearTimeout = function(timer: any) {
  if (timer && typeof timer === 'object' && timer._id !== undefined) {
    timer._cleared = true;
    return originalClearTimeout(timer._id);
  }
  return originalClearTimeout(timer);
};

// leaflet-node 2.0.21+ automatically detects jsdom and provides real canvas via @napi-rs/canvas
// Mock 'leaflet' to use leaflet-node (jest.mock is hoisted)
jest.mock('leaflet', () => {
  const nodeRequire = eval('require') as NodeJS.Require;

  // Setup font path FIRST
  try {
    const fontPath = nodeRequire.resolve('@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff2')
      || nodeRequire.resolve('@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff');
    (globalThis as any)['LEAFLET_NODE_FONT_BASE_PATH'] = fontPath;
  } catch {
    // Font not found, leaflet-node will use fallback
  }

  // Now load leaflet-node with fonts configured
  return nodeRequire('leaflet-node');
});

const nodeRequire = eval('require') as NodeJS.Require;

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
