/**
 * Setup file for Leaflet tests with real Leaflet and canvas
 * This uses jsdom and canvas to provide a real testing environment
 */

// Unmock leaflet for these tests to use the real implementation
jest.unmock('leaflet');

import { JSDOM } from 'jsdom';

// Create a proper DOM environment for Leaflet
export function setupLeafletEnvironment() {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
    resources: 'usable',
  });

  // Set up global window and document
  global.window = dom.window as any;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  global.HTMLElement = dom.window.HTMLElement;

  // Enhanced Canvas mocking for Leaflet's canvas renderer
  const mockCanvas = {
    getContext: () => ({
      canvas: mockCanvas,
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1,
      clearRect: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      bezierCurveTo: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      setTransform: () => {},
      drawImage: () => {},
      measureText: () => ({ width: 0 }),
    }),
    width: 0,
    height: 0,
    style: {},
  };

  global.HTMLCanvasElement = class MockHTMLCanvasElement {
    width = 0;
    height = 0;
    style: any = {};

    getContext() {
      return mockCanvas.getContext();
    }
  } as any;

  // Mock Image constructor for tile loading
  global.Image = class MockImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    src: string = '';

    constructor() {
      // Automatically trigger onload after a short delay to simulate image loading
      setTimeout(() => {
        if (this.onload) this.onload();
      }, 0);
    }
  } as any;

  // Override document.createElement to return mocked canvas
  const originalCreateElement = document.createElement.bind(document);
  document.createElement = function(tagName: string, options?: any) {
    if (tagName.toLowerCase() === 'canvas') {
      return mockCanvas as any;
    }
    return originalCreateElement(tagName, options);
  } as any;

  // Import Leaflet after setting up the environment
  const L = require('leaflet');
  return { dom, L };
}

// Create a test map container
export function createMapContainer(id: string = 'map'): HTMLDivElement {
  const container = document.createElement('div');
  container.id = id;
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);
  return container;
}

// Clean up after tests
export function cleanupLeafletEnvironment() {
  // Remove all map containers
  const containers = document.querySelectorAll('[id^="map"]');
  containers.forEach(container => container.remove());
}
