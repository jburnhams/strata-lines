import { describe, it, expect, jest } from '@jest/globals';
import L from 'leaflet';
import type { Track } from '@/types';
import { performPngExport, type ExportConfig, type ExportCallbacks } from '@/services/exportService';

jest.setTimeout(60000);

jest.mock('html2canvas', () => ({
  __esModule: true,
  default: jest.fn((element: HTMLElement, options?: { width?: number; height?: number }) => {
    const width = options?.width ?? element.clientWidth ?? 256;
    const height = options?.height ?? element.clientHeight ?? 256;
    const { createCanvas } = require('@napi-rs/canvas');
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);
    }
    return Promise.resolve(canvas as unknown as HTMLCanvasElement);
  }),
}));

describe('Export Service integration', () => {
  it('exports line layers using real Leaflet and canvas implementations', async () => {
    const track: Track = {
      id: 'integration-track',
      name: 'Integration Track',
      points: [
        [51.5007, -0.1246],
        [51.502, -0.11],
        [51.505, -0.102],
      ],
      length: 3.2,
      isVisible: true,
      color: '#ff4500',
    };

    const exportBounds = L.latLngBounds(
      L.latLng(51.498, -0.13),
      L.latLng(51.506, -0.098)
    );

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
    };

    const callbacks: ExportCallbacks = {
      onSubdivisionsCalculated: jest.fn(),
      onSubdivisionProgress: jest.fn(),
      onSubdivisionStitched: jest.fn(),
      onStageProgress: jest.fn(),
      onComplete: jest.fn(),
      onError: jest.fn(),
    };

    if (!(window as any).computedStyle) {
      (window as any).computedStyle = window.getComputedStyle.bind(window);
    }

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

    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const appendSpy = jest.spyOn(document.body, 'appendChild');
    const removeSpy = jest.spyOn(document.body, 'removeChild');
    const existingCreateObjectURL = URL.createObjectURL;
    const existingRevokeObjectURL = URL.revokeObjectURL;

    const createObjectURLSpy =
      typeof existingCreateObjectURL === 'function'
        ? jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:integration-export')
        : (jest.fn().mockReturnValue('blob:integration-export'));

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

      expect(callbacks.onSubdivisionsCalculated).toHaveBeenCalledWith(expect.any(Array));
      expect(callbacks.onSubdivisionProgress).toHaveBeenCalled();
      expect(callbacks.onComplete).toHaveBeenCalledTimes(1);
      expect(callbacks.onError).not.toHaveBeenCalled();
      expect(createObjectURLSpy).toHaveBeenCalledWith(expect.any(Blob));
      expect(clickSpy).toHaveBeenCalled();
      expect(appendSpy).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalled();
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
