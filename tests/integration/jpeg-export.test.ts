import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
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

  let originalCreateObjectURL: any;
  let originalRevokeObjectURL: any;

  beforeEach(() => {
    // Mock URL.createObjectURL/revokeObjectURL for the final download link
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;

    // @ts-ignore
    URL.createObjectURL = jest.fn((blob: Blob) => {
      return `blob:final-download-${Math.random().toString(36).substr(2, 9)}`;
    });

    // @ts-ignore
    URL.revokeObjectURL = jest.fn((url: string) => {});
  });

  afterEach(() => {
    // Restore globals
    if (originalCreateObjectURL) URL.createObjectURL = originalCreateObjectURL;
    if (originalRevokeObjectURL) URL.revokeObjectURL = originalRevokeObjectURL;
    jest.restoreAllMocks();
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

    await performPngExport('combined', [track], config, callbacks);

    expect(callbacks.onError).not.toHaveBeenCalled();

    const appendCalls = appendSpy.mock.calls;
    const linkElements = appendCalls.map(call => call[0]).filter(el => el instanceof HTMLAnchorElement);
    expect(linkElements.length).toBeGreaterThan(0);

    const downloadLink = linkElements[0] as HTMLAnchorElement;
    expect(downloadLink.download).toMatch(/\.jpg$/);

    expect(callbacks.onComplete).toHaveBeenCalledTimes(1);
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

    await performPngExport('lines', [track], config, callbacks);

    expect(callbacks.onError).not.toHaveBeenCalled();

    const appendCalls = appendSpy.mock.calls;
    const linkElements = appendCalls.map(call => call[0]).filter(el => el instanceof HTMLAnchorElement);
    expect(linkElements.length).toBeGreaterThan(0);

    const downloadLink = linkElements[0] as HTMLAnchorElement;
    expect(downloadLink.download).toMatch(/\.jpg$/);

    expect(callbacks.onComplete).toHaveBeenCalledTimes(1);
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

    await performPngExport('base', [], config, callbacks);

    expect(callbacks.onComplete).toHaveBeenCalledTimes(1);
    expect(callbacks.onError).not.toHaveBeenCalled();

    const appendCalls = appendSpy.mock.calls;
    const linkElements = appendCalls.map(call => call[0]).filter(el => el instanceof HTMLAnchorElement);
    expect(linkElements.length).toBeGreaterThan(0);

    const downloadLink = linkElements[0] as HTMLAnchorElement;
    expect(downloadLink.download).toMatch(/\.png$/);
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
  });
});
