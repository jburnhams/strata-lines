import { afterEach, beforeEach, jest } from '@jest/globals';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Add TextEncoder/TextDecoder to global for jsdom
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Polyfill structuredClone for JSDOM environments
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (val) => {
    return JSON.parse(JSON.stringify(val));
  };
}

// IMPORTANT: Unit tests should NOT load leaflet-node or @napi-rs/canvas
// These are for integration tests only. Unit tests use mocks.

// Polyfill Blob.arrayBuffer() for jsdom (not available in older versions)
if (typeof Blob !== 'undefined' && !Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = async function() {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(this);
    });
  };
}

// Mock HTMLCanvasElement.prototype.getContext to prevent JSDOM "Not implemented" errors
// and support simple mocks for unit tests
if (typeof HTMLCanvasElement !== 'undefined') {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    writable: true,
    value: function(contextId: string) {
      if (contextId === '2d') {
        return {
          drawImage: jest.fn(),
          clearRect: jest.fn(),
          getImageData: jest.fn(() => ({
            data: new Uint8ClampedArray(4),
            width: 1,
            height: 1
          })),
          putImageData: jest.fn(),
          canvas: this,
        };
      }
      return null;
    }
  });

  Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
    writable: true,
    value: jest.fn(() => 'data:image/png;base64,mock'),
  });
}

// Mock URL.createObjectURL and URL.revokeObjectURL
if (typeof URL.createObjectURL === 'undefined') {
  URL.createObjectURL = jest.fn(() => 'blob:mock-url');
} else {
  // If it exists but we want to ensure it's a mock for tests
  jest.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:mock-url');
}

if (typeof URL.revokeObjectURL === 'undefined') {
  URL.revokeObjectURL = jest.fn();
} else {
  jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
}

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
  jest.restoreAllMocks(); // This might affect spies on global objects if not careful, but usually good practice.
                          // However, since we set global properties that were undefined, restoreAllMocks won't unset them.
});

beforeEach(() => {
  installMatchMedia();
  // Ensure mocks are active
  if (jest.isMockFunction(URL.createObjectURL)) {
      (URL.createObjectURL as jest.Mock).mockClear();
  }
});
