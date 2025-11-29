import { afterEach, beforeEach } from '@jest/globals';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream } from 'stream/web';

// Add TextEncoder/TextDecoder to global for jsdom
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Add polyfills BEFORE loading leaflet-node
if (typeof globalThis.ReadableStream === 'undefined') {
  globalThis.ReadableStream = ReadableStream as any;
}

// Add performance.markResourceTiming polyfill for undici
if (global.performance && typeof (global.performance as any).markResourceTiming === 'undefined') {
  (global.performance as any).markResourceTiming = () => {};
}

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
});
