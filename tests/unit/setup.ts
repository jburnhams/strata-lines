import { afterEach, beforeEach } from '@jest/globals';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream } from 'stream/web';

// Add TextEncoder/TextDecoder to global for jsdom
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Add polyfills BEFORE loading leaflet-node
// ReadableStream polyfill
if (typeof globalThis.ReadableStream === 'undefined') {
  globalThis.ReadableStream = ReadableStream as any;
}

// performance.markResourceTiming polyfill
if (typeof performance !== 'undefined' && !(performance as any).markResourceTiming) {
  (performance as any).markResourceTiming = () => {};
}

// Polyfill setTimeout with refresh() method for undici
const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;

(globalThis as any).setTimeout = function(callback: (...args: any[]) => void, delay?: number, ...args: any[]) {
  const timer = originalSetTimeout(callback, delay, ...args);

  const timerObj: any = {
    _id: timer,
    _callback: callback,
    _delay: delay || 0,
    _args: args,
    _cleared: false,

    unref() {
      return this;
    },

    ref() {
      return this;
    },

    refresh() {
      if (!this._cleared) {
        originalClearTimeout(this._id);
        this._id = originalSetTimeout(this._callback, this._delay, ...this._args);
      }
      return this;
    },

    hasRef() {
      return true;
    },

    [Symbol.toPrimitive]() {
      return this._id;
    }
  };

  return timerObj;
};

(globalThis as any).clearTimeout = function(timer: any) {
  if (timer && typeof timer === 'object' && timer._id) {
    timer._cleared = true;
    return originalClearTimeout(timer._id);
  }
  return originalClearTimeout(timer);
};

const nodeRequire = eval('require') as NodeJS.Require;

// Setup font paths before loading leaflet-node
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
  globalConfig[fontBasePathKey] = fontAssetPath;
} else {
  delete globalConfig[fontBasePathKey];
}

// leaflet-node 2.0.23+ automatically detects jsdom and provides real canvas via @napi-rs/canvas
// This patches HTMLCanvasElement.prototype.getContext so canvas operations work in unit tests
const leafletNodeModule = nodeRequire('leaflet-node');
const leafletNodeTesting = nodeRequire('leaflet-node/testing');

// Use jest.doMock (not jest.mock) - runs during setup, AFTER jsdom exists
jest.doMock('leaflet', () => leafletNodeModule);
jest.doMock('leaflet-node', () => leafletNodeModule);
jest.doMock('leaflet-node/testing', () => leafletNodeTesting);

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
