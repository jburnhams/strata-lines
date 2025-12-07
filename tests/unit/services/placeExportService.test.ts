import { exportPlacesToGeoJSON, exportPlacesToCSV, exportPlacesToGPX, downloadPlaces } from '@/services/placeExportService';
import type { Place } from '@/types';

describe('placeExportService', () => {
  const mockPlaces: Place[] = [
    {
      id: 'p1',
      title: 'Place "1"',
      latitude: 10.123456,
      longitude: 20.654321,
      source: 'manual',
      createdAt: 1610000000000, // 2021-01-07T06:13:20.000Z
      iconStyle: 'pin',
      visible: true
    },
    {
      id: 'p2',
      title: 'Place & 2',
      latitude: -30.5,
      longitude: -40.5,
      source: 'geocoding',
      createdAt: 1620000000000, // 2021-05-03T00:00:00.000Z
      iconStyle: 'dot',
      visible: false
    }
  ];

  describe('exportPlacesToGeoJSON', () => {
    it('should generate valid GeoJSON', () => {
      const result = exportPlacesToGeoJSON(mockPlaces);
      const parsed = JSON.parse(result);

      expect(parsed.type).toBe('FeatureCollection');
      expect(parsed.features).toHaveLength(2);

      const f1 = parsed.features[0];
      expect(f1.type).toBe('Feature');
      expect(f1.geometry.type).toBe('Point');
      expect(f1.geometry.coordinates).toEqual([20.654321, 10.123456]);
      expect(f1.properties).toEqual({
        id: 'p1',
        title: 'Place "1"',
        source: 'manual',
        activityType: 'pin',
        createdAt: '2021-01-07T06:13:20.000Z'
      });
    });

    it('should handle empty places array', () => {
        const result = exportPlacesToGeoJSON([]);
        const parsed = JSON.parse(result);
        expect(parsed.features).toHaveLength(0);
    });
  });

  describe('exportPlacesToCSV', () => {
    it('should generate valid CSV with headers and escaped titles', () => {
      const result = exportPlacesToCSV(mockPlaces);
      const lines = result.split('\n');

      expect(lines[0]).toBe('ID,Title,Latitude,Longitude,Source,Created At');

      const line1 = lines[1];
      expect(line1).toContain('"Place ""1"""'); // Escaped quotes
      expect(line1).toContain('10.123456');
      expect(line1).toContain('20.654321');

      const line2 = lines[2];
      expect(line2).toContain('"Place & 2"');
    });

    it('should handle empty places array', () => {
        const result = exportPlacesToCSV([]);
        const lines = result.split('\n');
        expect(lines).toHaveLength(1); // Just header
        expect(lines[0]).toBe('ID,Title,Latitude,Longitude,Source,Created At');
    });
  });

  describe('exportPlacesToGPX', () => {
    it('should generate valid GPX 1.1', () => {
      const result = exportPlacesToGPX(mockPlaces);

      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain('<gpx version="1.1"');
      expect(result).toContain('xmlns="http://www.topografix.com/GPX/1/1"');

      expect(result).toContain('<wpt lat="10.123456" lon="20.654321">');
      expect(result).toContain('<name>Place "1"</name>');
      expect(result).toContain('<time>2021-01-07T06:13:20.000Z</time>');

      expect(result).toContain('<wpt lat="-30.5" lon="-40.5">');
      // Verify XML escaping
      expect(result).toContain('<name>Place &amp; 2</name>');
    });

    it('should handle special characters in XML', () => {
      const places = [{
        ...mockPlaces[0],
        title: '<Test> & "Place"'
      }];
      const result = exportPlacesToGPX(places);
      expect(result).toContain('&lt;Test&gt; &amp; "Place"');
    });
  });

  describe('downloadPlaces', () => {
    let originalCreateObjectURL: typeof URL.createObjectURL;
    let originalRevokeObjectURL: typeof URL.revokeObjectURL;
    let mockCreateObjectURL: jest.Mock;
    let mockRevokeObjectURL: jest.Mock;
    let mockClick: jest.Mock;
    let mockRemoveChild: jest.Mock;
    let mockAppendChild: jest.Mock;

    beforeEach(() => {
        originalCreateObjectURL = URL.createObjectURL;
        originalRevokeObjectURL = URL.revokeObjectURL;

        mockCreateObjectURL = jest.fn(() => 'blob:test-url');
        mockRevokeObjectURL = jest.fn();
        URL.createObjectURL = mockCreateObjectURL;
        URL.revokeObjectURL = mockRevokeObjectURL;

        mockClick = jest.fn();
        mockRemoveChild = jest.fn();
        mockAppendChild = jest.fn();

        jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
            if (tagName === 'a') {
                return {
                    click: mockClick,
                    href: '',
                    download: ''
                } as unknown as HTMLAnchorElement;
            }
            return document.createElement(tagName);
        });

        jest.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
        jest.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);
    });

    afterEach(() => {
        URL.createObjectURL = originalCreateObjectURL;
        URL.revokeObjectURL = originalRevokeObjectURL;
        jest.restoreAllMocks();
    });

    it('should create blob and trigger download for geojson', () => {
        downloadPlaces(mockPlaces, 'geojson');
        expect(mockCreateObjectURL).toHaveBeenCalled();
        const blob = mockCreateObjectURL.mock.calls[0][0];
        expect(blob.type).toBe('application/json');

        expect(mockAppendChild).toHaveBeenCalled();
        expect(mockClick).toHaveBeenCalled();
        expect(mockRemoveChild).toHaveBeenCalled();
        expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test-url');
    });

    it('should create blob and trigger download for csv', () => {
        downloadPlaces(mockPlaces, 'csv');
        const blob = mockCreateObjectURL.mock.calls[0][0];
        expect(blob.type).toBe('text/csv');
    });

    it('should create blob and trigger download for gpx', () => {
        downloadPlaces(mockPlaces, 'gpx');
        const blob = mockCreateObjectURL.mock.calls[0][0];
        expect(blob.type).toBe('application/gpx+xml');
    });
  });
});
