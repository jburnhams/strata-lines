import { afterEach, beforeEach } from '@jest/globals';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream } from 'stream/web';

// Add TextEncoder/TextDecoder to global for jsdom
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Polyfill Blob.prototype.arrayBuffer if missing (JSDOM)
if (!Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function() {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          resolve(reader.result as ArrayBuffer);
        } else {
          reject(new Error('Failed to read blob'));
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(this);
    });
  };
}

// Add polyfills BEFORE loading leaflet-node
if (typeof globalThis.ReadableStream === 'undefined') {
  globalThis.ReadableStream = ReadableStream as any;
}

if (typeof performance !== 'undefined' && !(performance as any).markResourceTiming) {
  (performance as any).markResourceTiming = () => {};
}

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
    unref() { return this; },
    ref() { return this; },
    refresh() {
      if (!this._cleared) {
        originalClearTimeout(this._id);
        this._id = originalSetTimeout(this._callback, this._delay, ...this._args);
      }
      return this;
    },
    valueOf() { return this._id; },
    [Symbol.toPrimitive]() { return this._id; }
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

const nodeRequire = eval('require') as NodeJS.Require;

let fontAssetPath: string | undefined;
try {
  fontAssetPath = nodeRequire.resolve('@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff2');
} catch {
  try {
    fontAssetPath = nodeRequire.resolve('@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff');
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

const leafletNodeModule = nodeRequire('leaflet-node');
const leafletNodeTesting = nodeRequire('leaflet-node/testing');

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

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  installMatchMedia();

  // Robust event polyfills for Leaflet in JSDOM/Node environment
  // We ensure addEventListener/removeEventListener exist on Object.prototype
  // so Leaflet prefers standard event handling over IE legacy fallback.
  // This is crucial for @napi-rs/canvas instances which might lack these methods.
  const noop = () => {};

  if (typeof Object.prototype !== 'undefined') {
      if (!(Object.prototype as any).addEventListener) {
          Object.defineProperty(Object.prototype, 'addEventListener', {
              writable: true,
              enumerable: false,
              value: noop
          });
      }
      if (!(Object.prototype as any).removeEventListener) {
          Object.defineProperty(Object.prototype, 'removeEventListener', {
              writable: true,
              enumerable: false,
              value: noop
          });
      }

      // Also force detachEvent/attachEvent to be functions if they somehow exist but aren't
      // or just provide them as safety net.
      if (!(Object.prototype as any).detachEvent) {
          Object.defineProperty(Object.prototype, 'detachEvent', {
              writable: true,
              enumerable: false,
              value: noop
          });
      }
      if (!(Object.prototype as any).attachEvent) {
          Object.defineProperty(Object.prototype, 'attachEvent', {
              writable: true,
              enumerable: false,
              value: noop
          });
      }
  }
});
