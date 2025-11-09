import { afterEach } from '@jest/globals';
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
if (typeof performance !== 'undefined' && !performance.markResourceTiming) {
  (performance as any).markResourceTiming = () => {};
}

// Note: leaflet-node 2.0.14+ provides remaining undici polyfills:
// - setImmediate/clearImmediate
// - setTimeout().unref()/ref()

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
