/**
 * Setup file for integration tests using leaflet-node
 * This file uses ESM imports and is compatible with --experimental-vm-modules
 */

import { jest, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom';

// Add TextEncoder/TextDecoder to global for jsdom
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Note: leaflet-node font configuration is handled directly in the test files
// since we need to use dynamic imports with --experimental-vm-modules

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

beforeEach(() => {
  installMatchMedia();
});
