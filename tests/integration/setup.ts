import { afterEach, beforeEach } from '@jest/globals';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream, TransformStream, CompressionStream, DecompressionStream } from 'stream/web';
import { randomUUID } from 'node:crypto';

// Add TextEncoder/TextDecoder to global for jsdom
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Polyfill structuredClone for JSDOM environments
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (val) => {
    return JSON.parse(JSON.stringify(val));
  };
}

// Polyfill DOMRect
if (typeof DOMRect === 'undefined') {
  global.DOMRect = class DOMRect {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    right: number;
    bottom: number;
    left: number;

    constructor(x = 0, y = 0, width = 0, height = 0) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      this.top = y;
      this.left = x;
      this.right = x + width;
      this.bottom = y + height;
    }

    toJSON() {
      return {
        x: this.x,
        y: this.y,
        width: this.width,
        height: this.height,
        top: this.top,
        right: this.right,
        bottom: this.bottom,
        left: this.left
      };
    }
  } as any;
}

// Add polyfills BEFORE loading leaflet-node
if (typeof globalThis.ReadableStream === 'undefined') {
  globalThis.ReadableStream = ReadableStream as any;
}
if (typeof globalThis.TransformStream === 'undefined') {
  globalThis.TransformStream = TransformStream as any;
}
if (typeof globalThis.CompressionStream === 'undefined') {
  globalThis.CompressionStream = CompressionStream as any;
}
if (typeof globalThis.DecompressionStream === 'undefined') {
  globalThis.DecompressionStream = DecompressionStream as any;
}

// Polyfill crypto.randomUUID for JSDOM
if (!global.crypto) {
    global.crypto = {} as any;
}
if (!global.crypto.randomUUID) {
    global.crypto.randomUUID = randomUUID;
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

afterEach(() => {
  cleanup();
});
