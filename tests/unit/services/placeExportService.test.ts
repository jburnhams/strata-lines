
import { exportPlacesToGeoJSON, exportPlacesToCSV, exportPlacesToGPX, downloadPlaces } from '@/services/placeExportService';
import type { Place } from '@/types';

const mockPlace: Place = {
  id: '123',
  latitude: 51.505,
  longitude: -0.09,
  title: 'Test Place',
  createdAt: 1625097600000, // 2021-07-01T00:00:00.000Z
  source: 'manual',
  isVisible: true,
  showIcon: true,
  iconStyle: 'pin'
};

const mockPlaceWithQuotes: Place = {
  ...mockPlace,
  id: '124',
  title: 'Place "With" Quotes',
};

describe('placeExportService', () => {
  describe('exportPlacesToGeoJSON', () => {
    it('should generate valid GeoJSON', () => {
      const output = exportPlacesToGeoJSON([mockPlace]);
      const json = JSON.parse(output);

      expect(json.type).toBe('FeatureCollection');
      expect(json.features).toHaveLength(1);
      const feature = json.features[0];
      expect(feature.type).toBe('Feature');
      expect(feature.geometry.type).toBe('Point');
      expect(feature.geometry.coordinates).toEqual([-0.09, 51.505]);
      expect(feature.properties).toEqual({
        id: '123',
        title: 'Test Place',
        source: 'manual',
        activityType: 'pin',
        createdAt: '2021-07-01T00:00:00.000Z'
      });
    });
  });

  describe('exportPlacesToCSV', () => {
    it('should generate valid CSV with headers', () => {
      const output = exportPlacesToCSV([mockPlace]);
      const lines = output.split('\n');

      expect(lines[0]).toBe('ID,Title,Latitude,Longitude,Source,Created At');
      expect(lines[1]).toContain('123,"Test Place",51.505000,-0.090000,manual,2021-07-01T00:00:00.000Z');
    });

    it('should escape quotes in titles', () => {
      const output = exportPlacesToCSV([mockPlaceWithQuotes]);
      const lines = output.split('\n');
      expect(lines[1]).toContain('"Place ""With"" Quotes"');
    });
  });

  describe('exportPlacesToGPX', () => {
    it('should generate valid GPX', () => {
      const output = exportPlacesToGPX([mockPlace]);

      expect(output).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(output).toContain('<gpx version="1.1" creator="StrataLines"');
      expect(output).toContain('<wpt lat="51.505" lon="-0.09">');
      expect(output).toContain('<name>Test Place</name>');
      expect(output).toContain('<time>2021-07-01T00:00:00.000Z</time>');
      expect(output).toContain('<desc>Source: manual</desc>');
    });

    it('should escape special characters in XML', () => {
      const placeWithSpecialChars = { ...mockPlace, title: 'Me & You <3' };
      const output = exportPlacesToGPX([placeWithSpecialChars]);

      expect(output).toContain('<name>Me &amp; You &lt;3</name>');
    });
  });

  describe('downloadPlaces', () => {
    let originalURL: any;
    let createObjectURLMock: jest.Mock;
    let revokeObjectURLMock: jest.Mock;

    beforeEach(() => {
      originalURL = global.URL;
      createObjectURLMock = jest.fn();
      revokeObjectURLMock = jest.fn();

      global.URL = {
        ...originalURL,
        createObjectURL: createObjectURLMock,
        revokeObjectURL: revokeObjectURLMock,
      } as any;
    });

    afterEach(() => {
      global.URL = originalURL;
    });

    it('should trigger download for GeoJSON', () => {
      const linkMock = {
        click: jest.fn(),
        style: {},
      } as unknown as HTMLAnchorElement;

      const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(linkMock);
      const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation();
      const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation();

      createObjectURLMock.mockReturnValue('blob:test-url');

      downloadPlaces([mockPlace], 'geojson');

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(linkMock.href).toBe('blob:test-url');
      expect(linkMock.download).toMatch(/places-.*\.json/);
      expect(appendChildSpy).toHaveBeenCalledWith(linkMock);
      expect(linkMock.click).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalledWith(linkMock);
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:test-url');

      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });
});
