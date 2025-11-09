import { afterEach } from '@jest/globals';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream } from 'stream/web';

// Add TextEncoder/TextDecoder to global for jsdom
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Add ReadableStream BEFORE loading leaflet-node
// This is needed because undici (statically imported by leaflet-node) uses it immediately
if (typeof globalThis.ReadableStream === 'undefined') {
  globalThis.ReadableStream = ReadableStream as any;
}

// Note: leaflet-node 2.0.12+ provides remaining undici polyfills:
// - setImmediate/clearImmediate
// - setTimeout().unref()/ref()
// - performance.markResourceTiming

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
