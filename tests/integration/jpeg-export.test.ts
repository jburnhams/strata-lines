import { describe, it, expect, jest } from '@jest/globals';
import L from 'leaflet';
import type { Track } from '@/types';
import { performPngExport, type ExportConfig, type ExportCallbacks } from '@/services/exportService';

jest.setTimeout(60000);

describe('JPEG Export Integration Tests', () => {
  const track: Track = {
    id: 'jpeg-test-track',
    name: 'JPEG Test Track',
    points: [
      [51.5007, -0.1246],
      [51.502, -0.11],
      [51.505, -0.102],
    ],
    length: 3.2,
    isVisible: true, activityType: 'Unknown',
    color: '#ff4500',
  };

  const exportBounds = L.latLngBounds(
    L.latLng(51.498, -0.13),
    L.latLng(51.506, -0.098)
  );

  beforeEach(() => {
    if (!(window as any).computedStyle) {
      (window as any).computedStyle = window.getComputedStyle.bind(window);
    }
    // Polyfill detachEvent for legacy library support (Leaflet/IE compat) in JSDOM
    const noop = () => {};
    const classes = [HTMLElement, Window, Document];
    if (typeof EventTarget !== 'undefined') classes.push(EventTarget);

    classes.forEach(cls => {
        if (cls.prototype && !(cls.prototype as any).detachEvent) {
            (cls.prototype as any).detachEvent = noop;
        }
        if (cls.prototype && !(cls.prototype as any).attachEvent) {
             (cls.prototype as any).attachEvent = noop;
        }
    });

    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
      configurable: true,
      writable: true,
      value: function(
        this: HTMLCanvasElement,
        callback: BlobCallback,
        type?: string,
        quality?: any
      ) {
        const dataUrl = this.toDataURL(type, quality);
        const base64 = dataUrl.split(',')[1];
        const binary = atob(base64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        callback(new Blob([bytes], { type: type || 'image/png' }));
      },
    });
  });

  it('should export JPEG with default quality (85)', async () => {
    const config: ExportConfig = {
      exportBounds,
      derivedExportZoom: 14,
      previewZoom: 12,
      zoom: 12,
      maxDimension: 1024,
      labelDensity: 0,
      tileLayerKey: 'esriImagery',
      lineThickness: 3,
      exportQuality: 1,
      outputFormat: 'jpeg',
      jpegQuality: 85,
    };

    const callbacks: ExportCallbacks = {
      onSubdivisionsCalculated: jest.fn(),
      onSubdivisionProgress: jest.fn(),
      onSubdivisionStitched: jest.fn(),
      onStageProgress: jest.fn(),
      onComplete: jest.fn(),
      onError: jest.fn(),
    };

    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const appendSpy = jest.spyOn(document.body, 'appendChild');
    const removeSpy = jest.spyOn(document.body, 'removeChild');

    const existingCreateObjectURL = URL.createObjectURL;
    const existingRevokeObjectURL = URL.revokeObjectURL;

    const createObjectURLSpy =
      typeof existingCreateObjectURL === 'function'
        ? jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:jpeg-export')
        : (jest.fn().mockReturnValue('blob:jpeg-export'));

    if (typeof existingCreateObjectURL !== 'function') {
      (URL as unknown as { createObjectURL: typeof createObjectURLSpy }).createObjectURL = createObjectURLSpy;
    }

    const revokeObjectURLSpy =
      typeof existingRevokeObjectURL === 'function'
        ? jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
        : (jest.fn());

    if (typeof existingRevokeObjectURL !== 'function') {
      (URL as unknown as { revokeObjectURL: typeof revokeObjectURLSpy }).revokeObjectURL = revokeObjectURLSpy;
    }

    try {
      await performPngExport('combined', [track], config, callbacks);

      expect(callbacks.onError).not.toHaveBeenCalled();

      // Verify that the download link was created with .jpg extension
      const appendCalls = appendSpy.mock.calls;
      const linkElements = appendCalls.map(call => call[0]).filter(el => el instanceof HTMLAnchorElement);
      expect(linkElements.length).toBeGreaterThan(0);

      const downloadLink = linkElements[0] as HTMLAnchorElement;
      expect(downloadLink.download).toMatch(/\.jpg$/);

      expect(callbacks.onComplete).toHaveBeenCalledTimes(1);
    } finally {
      clickSpy.mockRestore();
      appendSpy.mockRestore();
      removeSpy.mockRestore();

      if (typeof existingCreateObjectURL === 'function') {
        createObjectURLSpy.mockRestore();
      } else {
        delete (URL as unknown as { createObjectURL?: typeof createObjectURLSpy }).createObjectURL;
      }

      if (typeof existingRevokeObjectURL === 'function') {
        revokeObjectURLSpy.mockRestore();
      } else {
        delete (URL as unknown as { revokeObjectURL?: typeof revokeObjectURLSpy }).revokeObjectURL;
      }
    }
  });

  it('should export JPEG with custom quality (50)', async () => {
    const config: ExportConfig = {
      exportBounds,
      derivedExportZoom: 14,
      previewZoom: 12,
      zoom: 12,
      maxDimension: 1024,
      labelDensity: 0,
      tileLayerKey: 'esriImagery',
      lineThickness: 3,
      exportQuality: 1,
      outputFormat: 'jpeg',
      jpegQuality: 50,
    };

    const callbacks: ExportCallbacks = {
      onSubdivisionsCalculated: jest.fn(),
      onSubdivisionProgress: jest.fn(),
      onSubdivisionStitched: jest.fn(),
      onStageProgress: jest.fn(),
      onComplete: jest.fn(),
      onError: jest.fn(),
    };

    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const appendSpy = jest.spyOn(document.body, 'appendChild');
    const removeSpy = jest.spyOn(document.body, 'removeChild');

    const existingCreateObjectURL = URL.createObjectURL;
    const existingRevokeObjectURL = URL.revokeObjectURL;

    const createObjectURLSpy =
      typeof existingCreateObjectURL === 'function'
        ? jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:jpeg-export-50')
        : (jest.fn().mockReturnValue('blob:jpeg-export-50'));

    if (typeof existingCreateObjectURL !== 'function') {
      (URL as unknown as { createObjectURL: typeof createObjectURLSpy }).createObjectURL = createObjectURLSpy;
    }

    const revokeObjectURLSpy =
      typeof existingRevokeObjectURL === 'function'
        ? jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
        : (jest.fn());

    if (typeof existingRevokeObjectURL !== 'function') {
      (URL as unknown as { revokeObjectURL: typeof revokeObjectURLSpy }).revokeObjectURL = revokeObjectURLSpy;
    }

    try {
      await performPngExport('lines', [track], config, callbacks);

      expect(callbacks.onError).not.toHaveBeenCalled();

      const appendCalls = appendSpy.mock.calls;
      const linkElements = appendCalls.map(call => call[0]).filter(el => el instanceof HTMLAnchorElement);
      expect(linkElements.length).toBeGreaterThan(0);

      const downloadLink = linkElements[0] as HTMLAnchorElement;
      expect(downloadLink.download).toMatch(/\.jpg$/);

      expect(callbacks.onComplete).toHaveBeenCalledTimes(1);
    } finally {
      clickSpy.mockRestore();
      appendSpy.mockRestore();
      removeSpy.mockRestore();

      if (typeof existingCreateObjectURL === 'function') {
        createObjectURLSpy.mockRestore();
      } else {
        delete (URL as unknown as { createObjectURL?: typeof createObjectURLSpy }).createObjectURL;
      }

      if (typeof existingRevokeObjectURL === 'function') {
        revokeObjectURLSpy.mockRestore();
      } else {
        delete (URL as unknown as { revokeObjectURL?: typeof revokeObjectURLSpy }).revokeObjectURL;
      }
    }
  });

  it('should export PNG when format is png', async () => {
    const config: ExportConfig = {
      exportBounds,
      derivedExportZoom: 14,
      previewZoom: 12,
      zoom: 12,
      maxDimension: 1024,
      labelDensity: 0,
      tileLayerKey: 'esriImagery',
      lineThickness: 3,
      exportQuality: 1,
      outputFormat: 'png',
      jpegQuality: 85, // Should be ignored for PNG
    };

    const callbacks: ExportCallbacks = {
      onSubdivisionsCalculated: jest.fn(),
      onSubdivisionProgress: jest.fn(),
      onSubdivisionStitched: jest.fn(),
      onStageProgress: jest.fn(),
      onComplete: jest.fn(),
      onError: jest.fn(),
    };

    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const appendSpy = jest.spyOn(document.body, 'appendChild');
    const removeSpy = jest.spyOn(document.body, 'removeChild');

    const existingCreateObjectURL = URL.createObjectURL;
    const existingRevokeObjectURL = URL.revokeObjectURL;

    const createObjectURLSpy =
      typeof existingCreateObjectURL === 'function'
        ? jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:png-export')
        : (jest.fn().mockReturnValue('blob:png-export'));

    if (typeof existingCreateObjectURL !== 'function') {
      (URL as unknown as { createObjectURL: typeof createObjectURLSpy }).createObjectURL = createObjectURLSpy;
    }

    const revokeObjectURLSpy =
      typeof existingRevokeObjectURL === 'function'
        ? jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
        : (jest.fn());

    if (typeof existingRevokeObjectURL !== 'function') {
      (URL as unknown as { revokeObjectURL: typeof revokeObjectURLSpy }).revokeObjectURL = revokeObjectURLSpy;
    }

    try {
      await performPngExport('base', [], config, callbacks);

      expect(callbacks.onComplete).toHaveBeenCalledTimes(1);
      expect(callbacks.onError).not.toHaveBeenCalled();

      const appendCalls = appendSpy.mock.calls;
      const linkElements = appendCalls.map(call => call[0]).filter(el => el instanceof HTMLAnchorElement);
      expect(linkElements.length).toBeGreaterThan(0);

      const downloadLink = linkElements[0] as HTMLAnchorElement;
      expect(downloadLink.download).toMatch(/\.png$/);
    } finally {
      clickSpy.mockRestore();
      appendSpy.mockRestore();
      removeSpy.mockRestore();

      if (typeof existingCreateObjectURL === 'function') {
        createObjectURLSpy.mockRestore();
      } else {
        delete (URL as unknown as { createObjectURL?: typeof createObjectURLSpy }).createObjectURL;
      }

      if (typeof existingRevokeObjectURL === 'function') {
        revokeObjectURLSpy.mockRestore();
      } else {
        delete (URL as unknown as { revokeObjectURL?: typeof revokeObjectURLSpy }).revokeObjectURL;
      }
    }
  });

  it('should handle JPEG quality boundary values (1 and 100)', async () => {
    const configMin: ExportConfig = {
      exportBounds,
      derivedExportZoom: 14,
      previewZoom: 12,
      zoom: 12,
      maxDimension: 1024,
      labelDensity: 0,
      tileLayerKey: 'esriImagery',
      lineThickness: 3,
      exportQuality: 1,
      outputFormat: 'jpeg',
      jpegQuality: 1,
    };

    const callbacks: ExportCallbacks = {
      onSubdivisionsCalculated: jest.fn(),
      onSubdivisionProgress: jest.fn(),
      onSubdivisionStitched: jest.fn(),
      onStageProgress: jest.fn(),
      onComplete: jest.fn(),
      onError: jest.fn(),
    };

    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const appendSpy = jest.spyOn(document.body, 'appendChild');
    const removeSpy = jest.spyOn(document.body, 'removeChild');

    const existingCreateObjectURL = URL.createObjectURL;
    const existingRevokeObjectURL = URL.revokeObjectURL;

    const createObjectURLSpy =
      typeof existingCreateObjectURL === 'function'
        ? jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:jpeg-min')
        : (jest.fn().mockReturnValue('blob:jpeg-min'));

    if (typeof existingCreateObjectURL !== 'function') {
      (URL as unknown as { createObjectURL: typeof createObjectURLSpy }).createObjectURL = createObjectURLSpy;
    }

    const revokeObjectURLSpy =
      typeof existingRevokeObjectURL === 'function'
        ? jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
        : (jest.fn());

    if (typeof existingRevokeObjectURL !== 'function') {
      (URL as unknown as { revokeObjectURL: typeof revokeObjectURLSpy }).revokeObjectURL = revokeObjectURLSpy;
    }

    try {
      // Test minimum quality (1)
      await performPngExport('base', [], configMin, callbacks);
      expect(callbacks.onComplete).toHaveBeenCalledTimes(1);
      expect(callbacks.onError).not.toHaveBeenCalled();

      // Reset callbacks
      callbacks.onComplete = jest.fn();
      callbacks.onError = jest.fn();

      // Test maximum quality (100)
      const configMax = { ...configMin, jpegQuality: 100 };
      await performPngExport('base', [], configMax, callbacks);
      expect(callbacks.onComplete).toHaveBeenCalledTimes(1);
      expect(callbacks.onError).not.toHaveBeenCalled();
    } finally {
      clickSpy.mockRestore();
      appendSpy.mockRestore();
      removeSpy.mockRestore();

      if (typeof existingCreateObjectURL === 'function') {
        createObjectURLSpy.mockRestore();
      } else {
        delete (URL as unknown as { createObjectURL?: typeof createObjectURLSpy }).createObjectURL;
      }

      if (typeof existingRevokeObjectURL === 'function') {
        revokeObjectURLSpy.mockRestore();
      } else {
        delete (URL as unknown as { revokeObjectURL?: typeof revokeObjectURLSpy }).revokeObjectURL;
      }
    }
  });
});
